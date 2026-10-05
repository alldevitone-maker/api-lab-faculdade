# INC001: Possible duplicate payment

## Scenario

A customer reports two charges with the same amount within a few minutes. Both API calls used different idempotency keys, so the API accepted both requests.

## Objective

Determine whether the transactions are legitimate separate payments or an accidental duplicate created by the client retry logic.

## Signals

* Same customer
* Same amount and currency
* Same merchant reference or closely related references
* Timestamps only seconds apart
* Different idempotency keys

## Investigation

1. Capture the customer identifier, merchant reference, approximate time and amount.
2. Search `payments` for matching transactions.
3. Join `payment_events` to reconstruct each transaction timeline.
4. Compare the `merchant_reference` and API correlation IDs from logs.
5. Confirm whether a refund already exists before taking corrective action.

Use query 1 and query 2 in `database/investigations.sql`.

## Root cause example

The client generated a fresh idempotency key during an automatic retry instead of reusing the key from the original request.

## Mitigation

Refund only after confirming that the second payment is unintended and that the first payment completed successfully.

## Prevention

Clients should generate one idempotency key per logical payment attempt and reuse it across network retries.
