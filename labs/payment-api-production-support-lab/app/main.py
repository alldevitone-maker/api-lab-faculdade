import logging
import os
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .metrics import LATENCY, PAYMENTS_CREATED, REQUESTS, WEBHOOKS
from .models import Customer, Payment, PaymentEvent, Refund
from .schemas import (
    CustomerCreate,
    CustomerOut,
    EventOut,
    PaymentCreate,
    PaymentOut,
    PaymentWebhook,
    RefundCreate,
    RefundOut,
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("payments-lab")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Payment API Production Support Lab",
    version="1.0.0",
    description="Synthetic payment API built for SQL, API and production-support troubleshooting practice.",
    lifespan=lifespan,
)


@app.middleware("http")
async def correlation_and_metrics(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid4()))
    request.state.correlation_id = correlation_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("unhandled_error correlation_id=%s path=%s", correlation_id, request.url.path)
        raise
    elapsed = time.perf_counter() - start
    response.headers["X-Correlation-ID"] = correlation_id
    REQUESTS.labels(request.method, request.url.path, str(response.status_code)).inc()
    LATENCY.labels(request.method, request.url.path).observe(elapsed)
    logger.info(
        "request correlation_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        correlation_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed * 1000,
    )
    return response


@app.get("/health", tags=["operations"])
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ok", "service": "payment-api-production-support-lab"}


@app.get("/metrics", tags=["operations"], include_in_schema=False)
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/api/v1/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED, tags=["customers"])
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Customer external_id or email already exists") from exc
    db.refresh(customer)
    return customer


@app.post("/api/v1/payments", response_model=PaymentOut, tags=["payments"])
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=120),
):
    existing = db.scalar(select(Payment).where(Payment.idempotency_key == idempotency_key))
    if existing:
        same_payload = (
            existing.customer_id == payload.customer_id
            and existing.merchant_reference == payload.merchant_reference
            and existing.amount_cents == payload.amount_cents
            and existing.currency == payload.currency
        )
        if not same_payload:
            raise HTTPException(status_code=409, detail="Idempotency-Key was already used with a different payload")
        return existing

    if not db.get(Customer, payload.customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")

    payment = Payment(**payload.model_dump(), idempotency_key=idempotency_key, status="PENDING")
    db.add(payment)
    db.flush()
    db.add(
        PaymentEvent(
            payment_id=payment.id,
            event_type="PAYMENT_CREATED",
            source="api",
            details={"merchant_reference": payment.merchant_reference},
        )
    )
    db.commit()
    db.refresh(payment)
    PAYMENTS_CREATED.labels(payment.currency).inc()
    return payment


@app.get("/api/v1/payments/{payment_id}", response_model=PaymentOut, tags=["payments"])
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@app.get("/api/v1/payments/{payment_id}/events", response_model=list[EventOut], tags=["payments"])
def get_payment_events(payment_id: str, db: Session = Depends(get_db)):
    if not db.get(Payment, payment_id):
        raise HTTPException(status_code=404, detail="Payment not found")
    return db.scalars(
        select(PaymentEvent).where(PaymentEvent.payment_id == payment_id).order_by(PaymentEvent.created_at)
    ).all()


@app.post("/api/v1/payments/{payment_id}/refunds", response_model=RefundOut, tags=["refunds"])
def create_refund(
    payment_id: str,
    payload: RefundCreate,
    db: Session = Depends(get_db),
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=120),
):
    existing = db.scalar(select(Refund).where(Refund.idempotency_key == idempotency_key))
    if existing:
        if existing.payment_id != payment_id or existing.amount_cents != payload.amount_cents:
            raise HTTPException(status_code=409, detail="Idempotency-Key was already used with a different refund")
        return existing

    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != "APPROVED":
        raise HTTPException(status_code=409, detail="Only APPROVED payments can be refunded")

    refunded_total = db.scalar(
        select(func.coalesce(func.sum(Refund.amount_cents), 0)).where(
            Refund.payment_id == payment_id, Refund.status == "SUCCEEDED"
        )
    )
    if refunded_total + payload.amount_cents > payment.amount_cents:
        raise HTTPException(status_code=409, detail="Refund exceeds remaining captured amount")

    refund = Refund(
        payment_id=payment_id,
        idempotency_key=idempotency_key,
        amount_cents=payload.amount_cents,
        status="SUCCEEDED",
    )
    db.add(refund)
    db.flush()
    new_total = refunded_total + payload.amount_cents
    if new_total == payment.amount_cents:
        payment.status = "REFUNDED"
    db.add(
        PaymentEvent(
            payment_id=payment_id,
            event_type="REFUND_SUCCEEDED",
            source="api",
            details={"refund_id": refund.id, "amount_cents": refund.amount_cents},
        )
    )
    db.commit()
    db.refresh(refund)
    return refund


@app.post("/api/v1/webhooks/payment", tags=["webhooks"])
def payment_webhook(payload: PaymentWebhook, request: Request, db: Session = Depends(get_db)):
    if os.getenv("SIMULATE_WEBHOOK_DROP", "false").lower() == "true":
        raise HTTPException(status_code=503, detail="Synthetic incident: webhook processor unavailable")

    duplicate = db.scalar(select(PaymentEvent).where(PaymentEvent.external_event_id == payload.event_id))
    if duplicate:
        return {"accepted": True, "duplicate": True, "payment_id": payload.payment_id}

    payment = db.get(Payment, payload.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    previous_status = payment.status
    payment.status = payload.status
    db.add(
        PaymentEvent(
            payment_id=payment.id,
            event_type=f"PAYMENT_{payload.status}",
            source=payload.provider,
            external_event_id=payload.event_id,
            details={
                "previous_status": previous_status,
                "correlation_id": request.state.correlation_id,
            },
        )
    )
    db.commit()
    WEBHOOKS.labels(payload.status).inc()
    return {"accepted": True, "duplicate": False, "payment_id": payment.id, "status": payment.status}
