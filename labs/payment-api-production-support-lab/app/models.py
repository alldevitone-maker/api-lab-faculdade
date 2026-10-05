from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    payments = relationship("Payment", back_populates="customer")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    merchant_reference: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="PENDING", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    customer = relationship("Customer", back_populates="payments")
    events = relationship("PaymentEvent", back_populates="payment", cascade="all, delete-orphan")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_payments_customer_created", "customer_id", "created_at"),
        Index("ix_payments_status_created", "status", "created_at"),
    )


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey("payments.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False)
    external_event_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    payment = relationship("Payment", back_populates="events")


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    payment_id: Mapped[str] = mapped_column(ForeignKey("payments.id"), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="SUCCEEDED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    payment = relationship("Payment", back_populates="refunds")
