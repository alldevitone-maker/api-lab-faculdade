# INC003: Slow customer payment history query

## Scenario

A support endpoint becomes slow when a high volume customer requests thirty days of payment history.

## Objective

Use SQL execution plans to distinguish an application problem from a database access pattern problem.

## Investigation

1. Generate synthetic volume with `scripts/load_test_data.py`.
2. Run query 5 from `database/investigations.sql`.
3. Inspect `EXPLAIN ANALYZE` for sequential scans, row estimates and sort cost.
4. Review the composite index `ix_payments_customer_created`.
5. Compare the plan with and without an appropriate index in a disposable local environment.

## Expected learning outcome

A useful index should match the selective filter and common ordering pattern. Indexes improve reads but also add storage and write cost, so the fix should be justified with evidence from the execution plan.
