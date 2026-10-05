-- Optional synthetic seed data for manual PostgreSQL exercises.
INSERT INTO customers (id, external_id, name, email)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'cust-demo-001', 'Grace Hopper', 'grace@example.test'),
    ('00000000-0000-0000-0000-000000000002', 'cust-demo-002', 'Alan Turing', 'alan@example.test')
ON CONFLICT DO NOTHING;
