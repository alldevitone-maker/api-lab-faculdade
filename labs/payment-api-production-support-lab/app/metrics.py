from prometheus_client import Counter, Histogram

REQUESTS = Counter(
    "payments_lab_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

LATENCY = Histogram(
    "payments_lab_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
)

PAYMENTS_CREATED = Counter(
    "payments_lab_payments_created_total",
    "Payments created",
    ["currency"],
)

WEBHOOKS = Counter(
    "payments_lab_webhooks_total",
    "Payment webhooks received",
    ["status"],
)
