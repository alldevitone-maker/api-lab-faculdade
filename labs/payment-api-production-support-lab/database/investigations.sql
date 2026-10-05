-- 1. Find possible duplicate charges by customer, amount and a five minute bucket.
SELECT
    customer_id,
    amount_cents,
    DATE_TRUNC('minute', created_at) AS minute_bucket,
    COUNT(*) AS occurrences
FROM payments
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY customer_id, amount_cents, DATE_TRUNC('minute', created_at)
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;

-- 2. Reconstruct the event timeline for one payment.
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

-- 3. Find payments stuck in PENDING for more than ten minutes.
SELECT
    p.id,
    p.merchant_reference,
    c.external_id AS customer_external_id,
    p.amount_cents,
    p.currency,
    p.created_at,
    NOW() - p.created_at AS pending_for
FROM payments p
JOIN customers c ON c.id = p.customer_id
WHERE p.status = 'PENDING'
  AND p.created_at < NOW() - INTERVAL '10 minutes'
ORDER BY p.created_at;

-- 4. Compare approved payments with their refund totals.
SELECT
    p.id,
    p.amount_cents AS payment_amount,
    COALESCE(SUM(r.amount_cents) FILTER (WHERE r.status = 'SUCCEEDED'), 0) AS refunded_amount,
    p.amount_cents - COALESCE(SUM(r.amount_cents) FILTER (WHERE r.status = 'SUCCEEDED'), 0) AS remaining_amount
FROM payments p
LEFT JOIN refunds r ON r.payment_id = p.id
GROUP BY p.id, p.amount_cents
ORDER BY remaining_amount;

-- 5. Query plan exercise. Run before and after reviewing indexes.
EXPLAIN ANALYZE
SELECT id, customer_id, status, created_at
FROM payments
WHERE customer_id = :customer_id
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
