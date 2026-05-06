# TPA Claim Process

Enterprise foundation for a TPA insurance claim processing system.

This repository intentionally contains setup only:

- Spring Boot backend foundation
- React frontend shell
- PostgreSQL Docker Compose setup
- Database schema initialization placeholders

No authentication, OCR, claim workflow, policy logic, or business implementation is included yet.

## Structure

```text
.
├── backend
├── database
├── frontend
├── docker-compose.yml
└── .env.example
```

## Local Setup

Copy the environment template before running local services:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run backend after Maven is installed:

```bash
cd backend
mvn spring-boot:run
```

Run frontend after Node.js is installed:

```bash
cd frontend
npm install
npm run dev
```
