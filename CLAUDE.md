# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is pre-implementation: only `README.md` and `project-context.md` exist. `project-context.md` is the authoritative spec for a workshop demo — read it before starting any work. The directories below do not exist yet; they are the target layout described in the spec.

## Architecture

Three-tier microservices demo that flows: user uploads a receipt image → OCR service extracts items → core service persists a transaction. Services communicate directly over HTTP via `localhost`; the frontend calls both backends from the browser.

```
Frontend (Next.js, :3000)
   │
   ├── POST image  ─────────► OCR service (FastAPI, :8001)   /api/extract
   │                             │ returns { items, total }
   │
   └── POST payload ────────► Core service (Spring Boot, :8080) /api/transactions
                                 │ persists to
                                 ▼
                             PostgreSQL (:5432, db `receiptdb`)
```

Service directories (target layout): `/frontend`, `/ocr-service`, `/core-service`, `/db`, with a root `docker-compose.yml`.

### Why the frontend is not in docker-compose

By design — `docker-compose up` runs `db`, `ocr-service`, and `core-service` only. The frontend is run separately with `npm run dev` to preserve hot-reload during live presentation. Don't "fix" this by adding the frontend to compose.

### OCR fallback contract

The OCR service must never fail the demo. `pytesseract` is the primary path, but if OCR fails or the image is unreadable, the endpoint returns a hardcoded mock JSON response in the same shape. Treat this fallback as a product requirement, not a dev-only shortcut. The Dockerfile must install `tesseract-ocr` at the system level.

### Core service validation

`POST /api/transactions` must validate that `totalAmount` equals the sum of `items[*].price` before persisting. Standard Spring layered architecture: Controller → Service → Repository → Entity.

## Service contracts

**OCR** `POST /api/extract` — multipart image upload
```json
{ "items": [{"name": "Pivo", "price": 50.0}, {"name": "Pizza", "price": 180.0}], "total": 230.0 }
```

**Core** `POST /api/transactions` — JSON body
```json
{ "payer": "Honza", "items": [...], "totalAmount": 230.0 }
```
Returns the saved entity with a generated DB ID (displayed by the frontend as a success confirmation).

**DB connection** (from core service): `jdbc:postgresql://db:5432/receiptdb` — the host is `db` because compose service name resolution, not `localhost`.

## Language conventions (strict)

- **Code (identifiers, comments, API fields, endpoints)**: English only. Czech comments are explicitly disallowed.
- **UI text (what the user sees)**: Czech. Example from spec: the payer input label is "Kdo to platil".

These two rules are independent — keep Czech strings in UI templates/components, never in code comments or JSON keys.

## Scope discipline

This is a workshop demo, not a production app. The spec explicitly says to omit complex authentication and exhaustive error handling. Keep each service minimal and focused on illustrating the architectural flow between the three tiers. Don't add retries, circuit breakers, auth middleware, or elaborate validation unless asked.
