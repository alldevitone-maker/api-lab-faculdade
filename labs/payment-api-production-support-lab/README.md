# Payment API Production Support Lab

A hands on laboratory for practicing API troubleshooting, SQL investigation, payment state analysis, idempotency, webhook handling, observability and incident response.

This repository uses synthetic data and a fictional payment system. It has no affiliation with any financial institution, card network, payment processor or employer.

## What this project demonstrates

* REST API design with FastAPI
* PostgreSQL data modeling
* SQL investigation with `JOIN`, aggregation, CTE ready patterns, indexes and `EXPLAIN ANALYZE`
* Payment creation, status transitions and refunds
* Idempotency for write operations
* Webhook deduplication
* Correlation IDs for request tracing
* Prometheus compatible metrics
* Docker based local environment
* Reproducible production support incidents
* Automated tests with Pytest
* CI with GitHub Actions
* Postman collection for manual testing
* Operational runbook and root cause analysis exercises

## Architecture

```mermaid
flowchart LR
    Client[Client or Postman] --> API[FastAPI]
    Gateway[Synthetic Gateway] -->|Webhook| API
    API --> DB[(PostgreSQL)]
    API --> Metrics[/Prometheus Metrics/]
    API --> Logs[Request Logs]
    DB --> C[customers]
    DB --> P[payments]
    DB --> E[payment_events]
    DB --> R[refunds]
```

More detail is available in [`docs/architecture.md`](docs/architecture.md).

## Quick start with Docker

Requirements:

* Docker
* Docker Compose

Start the environment:

```bash
docker compose up --build
```

Open the interactive API documentation:

```text
http://localhost:8000/docs
```

Health check:

```bash
curl -i http://localhost:8000/health
```

Prometheus metrics:

```bash
curl -s http://localhost:8000/metrics
```

Stop the lab:

```bash
docker compose down
```

To also delete the PostgreSQL volume:

```bash
docker compose down -v
```

## Local Python setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Without `DATABASE_URL`, the application uses a local SQLite database for convenience. Docker Compose configures PostgreSQL automatically.

## API workflow

### 1. Create a customer

```bash
curl -X POST http://localhost:8000/api/v1/customers \
  -H 'Content-Type: application/json' \
  -d '{
    "external_id": "cust-demo-1001",
    "name": "Grace Hopper",
    "email": "grace.hopper@example.test"
  }'
```

Copy the returned customer `id`.

### 2. Create a payment

```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: payment-demo-1001' \
  -H 'X-Correlation-ID: demo-correlation-1001' \
  -d '{
    "customer_id": "CUSTOMER_ID",
    "merchant_reference": "order-demo-1001",
    "amount_cents": 2599,
    "currency": "USD"
  }'
```

The payment starts as `PENDING`.

### 3. Simulate provider approval

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/payment \
  -H 'Content-Type: application/json' \
  -d '{
    "event_id": "evt-demo-approved-1001",
    "payment_id": "PAYMENT_ID",
    "status": "APPROVED",
    "provider": "synthetic-gateway"
  }'
```

Sending the same `event_id` again is safe. It returns `duplicate: true` and does not apply the transition twice.

### 4. Inspect the event timeline

```bash
curl http://localhost:8000/api/v1/payments/PAYMENT_ID/events
```

### 5. Refund the payment

```bash
curl -X POST http://localhost:8000/api/v1/payments/PAYMENT_ID/refunds \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: refund-demo-1001' \
  -d '{"amount_cents": 2599}'
```

A full refund changes the payment state to `REFUNDED`.

## HTTP behavior worth testing

| Situation | Expected result |
| --- | --- |
| Missing customer | `404 Not Found` |
| Same idempotency key and same payment payload | Existing payment returned |
| Same idempotency key and different payload | `409 Conflict` |
| Duplicate provider event ID | Accepted as duplicate without another transition |
| Refund for pending payment | `409 Conflict` |
| Refund above remaining amount | `409 Conflict` |
| Simulated webhook outage | `503 Service Unavailable` |

## SQL investigation exercises

The file [`database/investigations.sql`](database/investigations.sql) contains operational queries for:

* Possible duplicate charges
* Full payment event timeline
* Payments stuck in `PENDING`
* Payment versus refund reconciliation
* Query plan analysis with `EXPLAIN ANALYZE`

Example investigation:

```sql
SELECT
    p.id AS payment_id,
    p.merchant_reference,
    p.status AS current_status,
    e.event_type,
    e.source,
    e.external_event_id,
    e.created_at
FROM payments p
LEFT JOIN payment_events e ON e.payment_id = p.id
WHERE p.id = :payment_id
ORDER BY e.created_at;
```

## Incident labs

| Incident | Skill practiced |
| --- | --- |
| [`INC001`](incidents/INC001-duplicate-payment.md) | Duplicate payment investigation and idempotency |
| [`INC002`](incidents/INC002-webhook-missing.md) | Pending payment, HTTP 503, webhook replay and correlation |
| [`INC003`](incidents/INC003-slow-query.md) | SQL performance and `EXPLAIN ANALYZE` |
| [`INC004`](incidents/INC004-state-inconsistency.md) | State mismatch, audit trail and manual write risk |

Each incident contains a scenario, investigation path, root cause example, mitigation and prevention notes.

## Runbook

[`docs/runbook.md`](docs/runbook.md) includes:

* Initial triage checklist
* Severity examples
* API verification commands
* SQL investigation questions
* Safe mitigation principles
* Post incident template

## Generate larger synthetic data

With PostgreSQL running locally:

```bash
export DATABASE_URL='postgresql+psycopg://lab:lab@localhost:5432/payments_lab'
python scripts/load_test_data.py
```

Defaults:

```text
200 synthetic customers
20,000 synthetic payments
```

Override the volume:

```bash
LAB_CUSTOMERS=500 LAB_PAYMENTS=50000 python scripts/load_test_data.py
```

Use this dataset for the slow query exercise and execution plan comparisons.

## Tests

```bash
pytest -q
```

The test suite validates:

* Health endpoint and correlation ID propagation
* Payment idempotency
* Conflict on incorrect idempotency key reuse
* Webhook deduplication
* Full refund state transition
* Refund rejection for a pending payment

GitHub Actions runs the same suite on pushes and pull requests.

## Postman

Import:

```text
postman/payment-api-production-support-lab.postman_collection.json
```

The collection contains health, customer creation, payment creation, provider approval and event timeline requests.

## Repository map

```text
payment-api-production-support-lab/
├── app/
│   ├── database.py
│   ├── main.py
│   ├── metrics.py
│   ├── models.py
│   └── schemas.py
├── database/
│   ├── investigations.sql
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── architecture.md
│   └── runbook.md
├── incidents/
│   ├── INC001-duplicate-payment.md
│   ├── INC002-webhook-missing.md
│   ├── INC003-slow-query.md
│   └── INC004-state-inconsistency.md
├── postman/
├── scripts/
├── tests/
├── .github/workflows/ci.yml
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── requirements.txt
```

## Why this is a support engineering lab instead of only a CRUD API

The goal is not simply to create records. The project is structured around questions that appear during production support:

1. What happened to this transaction?
2. Can I trace the request across API, logs and database state?
3. Was a request safely retried?
4. Did an external event arrive more than once?
5. Why is the application state different from the event history?
6. Is a query slow because of application logic, database volume or indexing?
7. What is the safest mitigation while preserving evidence?

That makes the repository useful for API, SQL, Application Support, Production Support, SRE and payment platform interview practice.

## Safety and scope

This is an educational lab. All customers, payments, provider names and incidents are fictional. No real cardholder data, credentials, production endpoints or proprietary payment network behavior is included.

## License

MIT
