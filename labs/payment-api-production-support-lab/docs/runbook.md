# Production Support Runbook

This runbook is intentionally vendor neutral and uses synthetic data only.

## Initial triage

Collect these fields before changing anything:

* Customer or external customer identifier
* Payment ID
* Merchant reference
* Amount and currency
* Approximate timestamp and timezone
* HTTP status or error message
* Correlation ID
* Provider event ID when applicable

## Severity guide

| Severity | Example | Response focus |
| --- | --- | --- |
| SEV1 | Most payment creation requests fail | Stabilize service, communicate impact, identify common failure mode |
| SEV2 | Webhooks fail for a subset of payments | Stop backlog growth, identify affected population, restore processing |
| SEV3 | One customer sees an inconsistent payment | Reproduce, trace one transaction, correct safely |
| SEV4 | Documentation or low impact defect | Capture evidence and schedule correction |

## API checks

```bash
curl -i http://localhost:8000/health
curl -i http://localhost:8000/docs
curl -s http://localhost:8000/metrics
```

For one payment:

```bash
curl -i http://localhost:8000/api/v1/payments/PAYMENT_ID \
  -H 'X-Correlation-ID: incident-1234'

curl -s http://localhost:8000/api/v1/payments/PAYMENT_ID/events
```

## Database checks

Use read only SQL first. Start with `database/investigations.sql` and narrow by payment ID, customer and time window.

Key questions:

1. Does the payment row exist?
2. Does current status match the event history?
3. Was the same logical request submitted more than once?
4. Did the provider webhook arrive?
5. Is there already a successful refund?
6. Is the query slow because of volume or because of an inefficient plan?

## Mitigation principles

* Prefer replayable and idempotent operations.
* Never issue a second refund without checking prior refund state.
* Preserve evidence before a corrective write.
* Use the smallest safe change that restores service.
* Document the timeline, impact, root cause and prevention action.

## Post incident template

```text
Incident ID:
Start time:
End time:
Impact:
Detection:
Timeline:
Root cause:
Mitigation:
Recovery validation:
Preventive actions:
Owner:
```
