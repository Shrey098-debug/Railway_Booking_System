# 🚀 RailBook — Run Locally & Deploy Free

This project is a microservices stack (6 Node services + React frontend) backed by
just **PostgreSQL + Redis**. There is no Kafka/Zookeeper — services communicate over
**Redis Streams**, so the whole event bus is the Redis you already run.

There is **no admin UI** — the catalog (40 stations, 72 trains, ~4.4k schedules for
**2026-09-01 → 2026-10-31**) comes from deterministic seed scripts
(`shared/seed/catalog.js` + `admin-service/seed.js` + `inventory-service/seed.js`).

---

## Prerequisites
- **Docker** (Docker Desktop or Colima) — runs Postgres + Redis
- **Node.js 20+** (only if running services outside Docker)
- ~5–8 GB free disk

---

## A) Run locally

### Option 1 — Everything in Docker (simplest)
```bash
cp .env.prod.example .env        # fill secrets (Resend, Razorpay) + strong passwords
docker compose -f docker-compose.prod.yml up -d --build
# Seed the catalog (one-time — containers must be up):
docker compose -f docker-compose.prod.yml exec admin-service node seed.js
docker compose -f docker-compose.prod.yml exec inventory-service node seed.js
# Frontend:  http://localhost
```
Each service runs `prisma db push` on startup, so tables are created automatically.

### Option 2 — Infra in Docker, services with npm (best for development)
```bash
# 1. Start only the infra (Postgres + Redis). The 5 databases auto-create.
docker compose up -d

# 2. Install deps + create tables (one-time):
for d in api-gateway user-service admin-service booking-service inventory-service payment-service frontend; do (cd "$d" && npm install); done
for d in user-service admin-service booking-service inventory-service payment-service; do (cd "$d" && npx prisma db push); done

# 3. Seed the catalog (one-time):
(cd admin-service && node seed.js) && (cd inventory-service && node seed.js)

# 4. Run everything:
./start-all.sh                   # frontend at http://localhost:3000
```

### Smoke test the flow
1. Register — in dev the OTP **prints to the user-service console**; in production it's emailed via Resend.
2. Search two seeded cities (e.g. New Delhi → Mumbai) on a date inside the seed window.
3. Select seats → passengers → pay (Razorpay **test mode**, card `4111 1111 1111 1111`) → booking confirms.

---

## B) Deploy 100% free (Oracle Cloud Always Free)

The whole stack fits comfortably on one Oracle Cloud **Always Free** VM
(Ampere ARM, up to 4 cores / 24 GB RAM — free forever). Everything is served from a
single origin (nginx serves the frontend and proxies `/api` to the gateway), so
login cookies and CORS work with zero extra configuration.

### Steps
1. **Create the VM**: Oracle Cloud → Compute → Instances → Create. Pick an
   **Ampere (ARM) Always Free** shape (e.g. VM.Standard.A1.Flex, 2 OCPU / 12 GB),
   Ubuntu 22.04 or 24.04. Download the SSH private key.
2. **Open port 80**: VM's subnet → Security List → Add Ingress Rule →
   source `0.0.0.0/0`, TCP, destination port **80**.
3. **SSH in and install Docker**:
   ```bash
   ssh -i <your-key> ubuntu@<vm-public-ip>
   sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
   sudo usermod -aG docker $USER && newgrp docker
   ```
4. **Clone + configure**:
   ```bash
   git clone https://github.com/Shrey098-debug/Railway_Booking_System.git && cd Railway_Booking_System
   cp .env.prod.example .env
   nano .env     # strong DB/Redis passwords, secrets via `openssl rand -hex 32`,
                 # RESEND_API_KEY + MAIL_FROM, Razorpay keys,
                 # PUBLIC_ORIGIN=http://<vm-public-ip>
   ```
5. **Launch + seed**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml exec admin-service node seed.js
   docker compose -f docker-compose.prod.yml exec inventory-service node seed.js
   ```
6. Visit `http://<vm-public-ip>` — done. Optionally point a **Razorpay webhook** to
   `http://<vm-public-ip>/api/payments/webhooks/razorpay` (client-side verify already
   confirms bookings without it).

### Optional niceties (still free)
- **Domain + HTTPS**: a free domain (e.g. DuckDNS) + Caddy for automatic TLS.
- **Updating the app**: `git pull && docker compose -f docker-compose.prod.yml up -d --build`

---

## Environment reference
- Production env lives in one root `.env` consumed by `docker-compose.prod.yml`.
- Secrets that **must match** across services: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  (gateway ↔ user) and `INTERNAL_SERVICE_KEY` (all internal calls).
- **Email (OTP)**: set `RESEND_API_KEY` (free at resend.com — HTTP API, works where
  hosts block SMTP). Gmail SMTP vars remain as an optional local-dev fallback.
- **Google OAuth is optional** — without `GOOGLE_CLIENT_ID`, email/OTP login still works.
- **Razorpay**: test-mode keys are fine; use card `4111 1111 1111 1111` at checkout.