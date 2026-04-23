# ReceiptSplitter

A 3-tier microservices application for splitting restaurant receipts using AI-powered OCR. Built as a workshop demo to illustrate modern architectural patterns and service communication.

## 🚀 Features

- **AI/OCR Extraction:** Python (FastAPI) service using Tesseract to extract items, quantities, and prices from receipt images.
- **Core Banking Service:** Java (Spring Boot 3) service managing persistence to PostgreSQL, calculating debts, and tracking payment status.
- **Responsive Web UI:** Next.js (App Router, Tailwind CSS) frontend with a compact, dual-column desktop layout and a mobile-optimized mobile view.
- **Advanced Splitting:** Support for quantity-based item splitting among multiple people.
- **History Dashboard:** List of saved receipts with the ability to mark as paid or delete.

## 🏗️ Architecture

- **Frontend:** `localhost:3000` (Next.js)
- **OCR Service:** `localhost:8001` (FastAPI + Tesseract)
- **Core Service:** `localhost:8080` (Spring Boot + JPA)
- **Database:** `localhost:5432` (PostgreSQL 15)

## 🛠️ Getting Started

### 1. Start Backends (Docker)
Ensure you have Docker installed, then run:
```bash
docker compose up -d
```
This starts the Database, OCR Service, and Core Service.

### 2. Start Frontend (Local)
Run the frontend locally for the best development experience (hot-reload):
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Configuration
Database credentials and service URLs are managed via the `.env` file in the root directory.
