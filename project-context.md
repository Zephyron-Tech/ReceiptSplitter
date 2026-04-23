# Project Context: ReceiptSplitter (Microservices Workshop Demo)

## 1. Project Overview
This project is a 3-tier microservices application designed for a live workshop demonstration. It simulates a "Receipt Splitter" app where a user uploads a receipt, an AI service extracts the items, and a core banking service saves the transaction.

## 2. Architecture & Tech Stack
- **Root**: `docker-compose.yml` to orchestrate all services.
- **Frontend (`/frontend`)**: Next.js (App Router, TypeScript, Tailwind CSS).
- **AI/OCR Service (`/ocr-service`)**: Python (FastAPI).
- **Core Backend (`/core-service`)**: Java (Spring Boot, Spring Data JPA, PostgreSQL driver).
- **Database (`/db`)**: PostgreSQL (run via Docker).

## 3. General Rules & Constraints
- Keep the code clean, minimal, and focused on demonstrating the architectural flow. Omit complex authentication or exhaustive error handling.
- **CRITICAL REQUIREMENT:** All code comments MUST be written in English. Do not write any code comments in Czech.
- Variable names, class names, and API endpoints must be in English.
- UI text (what the user sees on the screen) should be in Czech.

## 4. Service Specifications

### A. AI/OCR Service (Python / FastAPI)
- **Port**: 8001
- **Endpoint**: `POST /api/extract`
- **Input**: Multipart file upload (image).
- **Processing**: Use `pytesseract` to attempt reading the image. 
- **Fallback/Mock**: If OCR fails or the image is unreadable, implement a fallback that returns a hardcoded mock JSON response so the workshop demo never breaks.
- **Output JSON**: 
  `{ "items": [ {"name": "Pivo", "price": 50.0}, {"name": "Pizza", "price": 180.0} ], "total": 230.0 }`
- **Dockerfile**: Needs to install `tesseract-ocr`.

### B. Core Backend Service (Java / Spring Boot)
- **Port**: 8080
- **Database**: Connects to `jdbc:postgresql://db:5432/receiptdb`.
- **Endpoint**: `POST /api/transactions`
- **Input JSON**: 
  `{ "payer": "Honza", "items": [...], "totalAmount": 230.0 }`
- **Processing**: Validate the payload (e.g., totalAmount matches sum of items).
- **Persistence**: Save the transaction and its items to PostgreSQL. Return the saved entity with generated ID.
- **Structure**: Use standard layered architecture (Controller, Service, Repository, Entity).

### C. Frontend (Next.js)
- **Port**: 3000
- **UI Flow**:
  1. A simple drag-and-drop or file input for uploading the receipt image.
  2. A "Process Receipt" button that sends the image to `http://localhost:8001/api/extract`.
  3. Displays the extracted items in a list.
  4. An input field to enter the "Payer Name" (Kdo to platil).
  5. A "Save Transaction" button that sends the final payload to `http://localhost:8080/api/transactions`.
  6. Success message showing the database ID.

## 5. Docker Orchestration
Create a `docker-compose.yml` that builds and runs:
- `db` (postgres:15-alpine)
- `ocr-service` (build from /ocr-service)
- `core-service` (build from /core-service)
- *Note: Keep frontend out of docker-compose to allow easy hot-reloading via `npm run dev` during the presentation.*
