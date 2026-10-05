import os
import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Customer, Payment, PaymentEvent

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://lab:lab@localhost:5432/payments_lab")
CUSTOMERS = int(os.getenv("LAB_CUSTOMERS", "200"))
PAYMENTS = int(os.getenv("LAB_PAYMENTS", "20000"))

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Base.metadata.create_all(bind=engine)


def main():
    now = datetime.now(timezone.utc)
    with Session(engine) as db:
        customers = []
        for i in range(CUSTOMERS):
            customer = Customer(
                external_id=f"load-cust-{i:05d}",
                name=f"Synthetic Customer {i:05d}",
                email=f"load-{i:05d}@example.test",
            )
            db.add(customer)
            customers.append(customer)
        db.flush()

        statuses = ["PENDING", "APPROVED", "DECLINED"]
        for i in range(PAYMENTS):
            customer = random.choice(customers)
            status = random.choices(statuses, weights=[5, 85, 10], k=1)[0]
            created_at = now - timedelta(minutes=random.randint(0, 60 * 24 * 30))
            payment = Payment(
                id=str(uuid4()),
                customer_id=customer.id,
                merchant_reference=f"load-order-{i:08d}",
                idempotency_key=f"load-idem-{i:08d}-{uuid4()}",
                amount_cents=random.randint(100, 100_000),
                currency=random.choice(["USD", "EUR", "BRL"]),
                status=status,
                created_at=created_at,
                updated_at=created_at,
            )
            db.add(payment)
            db.flush()
            db.add(PaymentEvent(payment_id=payment.id,event_type="PAYMENT_CREATED",source="load-generator",created_at=created_at,details={}))
            if status != "PENDING":
                db.add(PaymentEvent(payment_id=payment.id,event_type=f"PAYMENT_{status}",source="synthetic-gateway",external_event_id=f"load-event-{i:08d}",created_at=created_at + timedelta(seconds=random.randint(1, 30)),details={}))
            if i and i % 1000 == 0:
                db.commit()
                print(f"Inserted {i} payments")
        db.commit()
        print(f"Done: {CUSTOMERS} customers and {PAYMENTS} payments")


if __name__ == "__main__":
    main()
