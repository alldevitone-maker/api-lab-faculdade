# INC002: Payment remains pending because webhook processing is unavailable

## Scenario

The external provider approved a payment, but the application still shows `PENDING`.

## Reproduce

Set the environment variable below for the API service:

```bash
SIMULATE_WEBHOOK_DROP=true
```

Then send a valid payment webhook. The endpoint intentionally returns HTTP 503.

## Investigation

1. Confirm the payment exists and is still `PENDING`.
2. Check recent HTTP 503 responses for `/api/v1/webhooks/payment`.
3. Correlate the request with `X-Correlation-ID` from the API response or logs.
4. Check `payment_events` for the expected provider event.
5. Verify whether retry logic from the provider is expected.

## Useful SQL

Use the stuck payment query in `database/investigations.sql`.

## Mitigation

Restore webhook processing and replay the provider event with the same external `event_id`. The webhook endpoint is idempotent, so an already processed event is acknowledged as a duplicate without applying the state transition twice.

## Prevention

Use retry policies, event deduplication, monitoring for pending age, and alerting on webhook error rate.
