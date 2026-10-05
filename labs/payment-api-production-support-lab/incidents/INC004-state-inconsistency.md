# INC004: Status and event history do not agree

## Scenario

A payment row says `APPROVED`, but its event history contains only `PAYMENT_CREATED`.

## Reproduce

In a disposable local database, directly update one payment row without creating an event:

```sql
UPDATE payments
SET status = 'APPROVED', updated_at = NOW()
WHERE id = ':payment_id';
```

Do not use this pattern in a real production system. It intentionally creates bad state for the lab.

## Investigation

1. Retrieve the payment through the API.
2. Retrieve `/api/v1/payments/{payment_id}/events`.
3. Run the event timeline query from `database/investigations.sql`.
4. Determine whether the row or the event stream is the trusted source for the system under investigation.

## Root cause example

A manual database change bypassed the normal state transition path.

## Prevention

Restrict production write access, use audited operational tooling, and keep state changes within transactional application workflows.
