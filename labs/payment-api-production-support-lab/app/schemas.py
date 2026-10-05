from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PaymentStatus = Literal["PENDING", "APPROVED", "DECLINED", "REFUNDED"]


class CustomerCreate(BaseModel):
    external_id: str = Field(min_length=3, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)


class CustomerOut(CustomerCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class PaymentCreate(BaseModel):
    customer_id: str
    merchant_reference: str = Field(min_length=3, max_length=80)
    amount_cents: int = Field(gt=0, le=100_000_000)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str
    merchant_reference: str
    amount_cents: int
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime


class RefundCreate(BaseModel):
    amount_cents: int = Field(gt=0)


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    payment_id: str
    amount_cents: int
    status: str
    created_at: datetime


class PaymentWebhook(BaseModel):
    event_id: str = Field(min_length=3, max_length=100)
    payment_id: str
    status: PaymentStatus
    provider: str = Field(default="synthetic-gateway", max_length=60)


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    payment_id: str
    event_type: str
    source: str
    external_event_id: str | None
    details: dict
    created_at: datetime
