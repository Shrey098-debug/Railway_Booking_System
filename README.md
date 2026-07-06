# 🚆 RailBook — Railway Booking System (Microservices)

A production-style, IRCTC-inspired railway ticket booking platform built as a set of independent microservices. It demonstrates the distributed-systems patterns that keep a real booking system correct under concurrency: an **API gateway**, **database-per-service**, the **Saga pattern** with compensation, **distributed seat locking**, **optimistic concurrency**, and an **event bus built on Redis Streams** — all without heavy infrastructure like Kafka.

---

## ✨ Highlights

- **Microservices** — 6 backend services, each owning its own PostgreSQL database.
- **API Gateway** — single entry point with JWT auth, rate limiting, and per-service circuit breakers.
- **Saga orchestration** — the booking flow (hold seats → create payment → confirm seats) is a saga with explicit compensation on failure.
- **No double-booking** — Redis distributed locks (Lua, all-or-nothing) + PostgreSQL row locks (`FOR UPDATE NOWAIT`) + optimistic version checks (CAS).
- **Event-driven** — services communicate asynchronously over **Redis Streams** (consumer groups, retries, and dead-letter queues).
- **Idempotency everywhere** — safe retries for bookings, payments, and refunds.
- **Resilient background jobs** — booking-expiry and lock-expiry sweepers use leader election so only one instance runs per cycle.
- **Payments** — Razorpay integration (test mode) via a pluggable gateway abstraction.

---

## 🏗️ Architecture

```
                 ┌───────────────────────┐
                 │   Frontend (React)    │  :3000
                 └───────────┬───────────┘
                             │
                 ┌───────────▼───────────┐
                 │     API Gateway       │  :4000
                 │ (JWT, rate limit, CB) │
                 └──┬─────┬─────┬─────┬───┘
        ┌───────────┘     │     │     └───────────┐
 ┌──────▼──────┐ ┌────────▼───┐ ┌▼─────────┐ ┌────▼────────┐
 │ User        │ │ Admin +    │ │ Booking  │ │ Payment     │
 │ :4001       │ │ Search 4003│ │ :4005    │ │ :4006       │
 └─────────────┘ └─────┬──────┘ └────┬─────┘ └────┬────────┘
                       │             │            │
                 ┌─────▼─────────────▼────────────▼─────┐
                 │           Inventory Service          │  :4007
                 └──────────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
        ┌─────▼──────┐                 ┌──────▼───────┐
        │ PostgreSQL │  :5432          │ Redis Stack  │  :6379 / :8001
        └────────────┘                 └──────────────┘
                                  (cache, locks, OTP, rate limits,
                                   and the event bus — Redis Streams)
```

## 🔌 Services & Ports

| Service            | Port | Responsibility                                             |
|--------------------|------|------------------------------------------------------------|
| API Gateway        | 4000 | Single entry point: auth, rate limiting, circuit breakers  |
| User Service       | 4001 | Signup (email OTP), login, JWT (access + refresh)          |
| Admin Service      | 4003 | Stations, trains, routes, schedules — and search           |
| Booking Service    | 4005 | Booking saga, cancellation/compensation, idempotency       |
| Payment Service    | 4006 | Razorpay orders, verification, refunds, webhooks           |
| Inventory Service  | 4007 | Seat inventory, distributed locking, seat confirmation     |

---

## 🧰 Tech Stack

- **Runtime:** Node.js + Express
- **Databases:** PostgreSQL (one per service) via Prisma ORM
- **Cache / Locks / Event Bus:** Redis (Redis Streams for events)
- **Auth:** JWT (access + refresh), email OTP
- **Payments:** Razorpay
- **Frontend:** React + Vite + Zustand + Tailwind CSS
- **Infra (local):** Docker Compose

---

## 🚀 Getting Started (Local)

### Prerequisites
- Node.js 18+
- Docker (Docker Desktop or Colima)

### 1. Start the databases
```bash
docker compose up -d
```
This launches PostgreSQL + Redis and auto-creates one database per service.

### 2. Configure environment variables
Each service has a `.env.example`. Copy it to `.env` in every service and fill in the values:
```bash
cp user-service/.env.example user-service/.env
# ...repeat for admin, booking, inventory, payment, api-gateway, frontend
```
Key values to set consistently across services:
- `DATABASE_URL` — `postgres://admin:irctcpass@localhost:5432/<service>_database`
- `REDIS_URL` — `redis://:irctcpass@localhost:6379`
- `INTERNAL_SERVICE_KEY` — **the same** value in every service
- `JWT_ACCESS_SECRET` — **the same** in user-service and api-gateway
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from your Razorpay test dashboard
- Email (OTP): set `RESEND_API_KEY` for real emails, or leave Gmail blank to have OTPs **print to the console** in development

### 3. Install dependencies & create tables
```bash
for d in api-gateway user-service admin-service booking-service inventory-service payment-service frontend; do
  (cd "$d" && npm install)
done

for d in user-service admin-service booking-service inventory-service payment-service; do
  (cd "$d" && npx prisma db push)
done
```

### 4. Run everything
```bash
./start-all.sh
```
Then open **http://localhost:3000**.

---

## 🎫 Using the app

1. **Sign up** — in development the OTP prints to the `user-service` console.
2. **Seed data** at `/admin`, in order: **Stations → Train → Route → Schedule**
   (creating a schedule publishes an event that builds the seat inventory).
3. **Search** your two stations on the schedule date → pick seats → enter passengers → **Confirm & Pay**.
4. Use Razorpay **test card** `4111 1111 1111 1111` (any future expiry, any CVV).

---

## 🧠 Key Design Concepts

- **Saga pattern** — `booking-service/src/services/saga.service.js` orchestrates the multi-service booking transaction and rolls back completed steps in reverse on failure.
- **Distributed locking** — `booking-service/src/utils/distributedLock.js` acquires all seat locks atomically with a Lua script (sorted keys prevent deadlock).
- **Optimistic concurrency (CAS)** — booking status transitions use version compare-and-swap to stay safe against concurrent webhook / expiry / cancel operations.
- **Event bus** — `shared/utils/streamBus.js` implements consumer groups, message reclaim, retries, and dead-letter queues over Redis Streams.
- **Idempotency** — booking, payment, and refund operations are keyed so retries never double-charge or double-book.

---

## 📁 Project Structure

```
RailBook/
├── api-gateway/         # Entry point: auth, rate limiting, circuit breakers, proxy
├── user-service/        # Auth, OTP, JWT
├── admin-service/       # Stations, trains, routes, schedules, search
├── booking-service/     # Booking saga + compensation
├── inventory-service/   # Seat inventory + distributed locking
├── payment-service/     # Razorpay orders, verify, refunds
├── shared/              # Shared stream bus + stream/topic constants
├── frontend/            # React + Vite UI
├── db/init/             # Auto-creates per-service databases
├── docker-compose.yml   # Postgres + Redis for local dev
└── start-all.sh         # Runs all services + frontend together
```

---

## 📄 License

MIT — free to use and learn from.