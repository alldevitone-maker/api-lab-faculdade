def create_customer(client, suffix="1"):
    response = client.post(
        "/api/v1/customers",
        json={
            "external_id": f"cust-{suffix}",
            "name": "Ada Lovelace",
            "email": f"ada{suffix}@example.test",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_payment(client, customer_id, key="payment-key-0001", amount=1299):
    return client.post(
        "/api/v1/payments",
        headers={"Idempotency-Key": key, "X-Correlation-ID": "corr-test-001"},
        json={
            "customer_id": customer_id,
            "merchant_reference": "order-1001",
            "amount_cents": amount,
            "currency": "USD",
        },
    )


def approve_payment(client, payment_id, event_id="evt-approve-1"):
    return client.post(
        "/api/v1/webhooks/payment",
        json={
            "event_id": event_id,
            "payment_id": payment_id,
            "status": "APPROVED",
            "provider": "synthetic-gateway",
        },
    )


def test_health_returns_correlation_id(client):
    response = client.get("/health", headers={"X-Correlation-ID": "corr-health-001"})
    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == "corr-health-001"
    assert response.json()["status"] == "ok"


def test_payment_idempotency_returns_same_payment(client):
    customer = create_customer(client)
    first = create_payment(client, customer["id"])
    second = create_payment(client, customer["id"])

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_idempotency_key_reuse_with_different_payload_is_conflict(client):
    customer = create_customer(client)
    first = create_payment(client, customer["id"], key="same-key-12345", amount=1000)
    assert first.status_code == 200

    second = create_payment(client, customer["id"], key="same-key-12345", amount=2000)
    assert second.status_code == 409


def test_duplicate_webhook_is_safe(client):
    customer = create_customer(client)
    payment = create_payment(client, customer["id"]).json()

    first = approve_payment(client, payment["id"], "evt-duplicate-1")
    second = approve_payment(client, payment["id"], "evt-duplicate-1")

    assert first.status_code == 200
    assert first.json()["duplicate"] is False
    assert second.status_code == 200
    assert second.json()["duplicate"] is True


def test_full_refund_updates_payment_status(client):
    customer = create_customer(client)
    payment = create_payment(client, customer["id"], amount=2500).json()
    assert approve_payment(client, payment["id"]).status_code == 200

    refund = client.post(
        f"/api/v1/payments/{payment['id']}/refunds",
        headers={"Idempotency-Key": "refund-key-0001"},
        json={"amount_cents": 2500},
    )
    assert refund.status_code == 200

    updated = client.get(f"/api/v1/payments/{payment['id']}")
    assert updated.status_code == 200
    assert updated.json()["status"] == "REFUNDED"


def test_refund_rejected_when_payment_is_pending(client):
    customer = create_customer(client)
    payment = create_payment(client, customer["id"]).json()

    refund = client.post(
        f"/api/v1/payments/{payment['id']}/refunds",
        headers={"Idempotency-Key": "refund-key-0002"},
        json={"amount_cents": 100},
    )
    assert refund.status_code == 409
