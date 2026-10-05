.PHONY: up down logs test run

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f api

test:
	pytest -q

run:
	uvicorn app.main:app --reload
