# 🚀 RailBook — Run Locally & Deploy Free

This project is a microservices stack (6 Node services + React frontend) backed by
just **PostgreSQL + Redis**. There is no Kafka/Zookeeper — services communicate over
**Redis Streams** (inventory is created from `admin.schedule-created` events, bookings
confirm from `payment.success` events), so the whole event bus is the Redis you already run.

---

## Prerequisites
- **Docker Desktop** (runs Postgres + Redis)
- **Node.js 20+** (only if running services outside Docker)
- ~5–8 GB free disk

---

## A) Run locally

You have two options.

### Option 1 — Everything in Docker (simplest)
```bash
cp .env.prod.example .env        # fill secrets (Gmail, Google, Razorpay) + set strong passwords
docker compose -f docker-compose.prod.yml up -d --build
# Frontend:  http://localhost
# Gateway :  http://localhost:4000
```
This builds and runs all services + infra together. First build takes a few minutes.

### Option 2 — Infra in Docker, services with npm (best for active development)
```bash
# 1. Start only the infra (Postgres + Redis). The 5 databases auto-create.
docker compose up -d

# 2. Each service already has a .env (see "Environment" below). In separate terminals:
cd user-service      && npm install && npx prisma migrate deploy && npm run dev
cd admin-service     && npm install && npx prisma migrate deploy && npm run dev
cd inventory-service && npm install && npx prisma migrate deploy && npm run dev
cd payment-service   && npm install && npx prisma migrate deploy && npm run dev
cd booking-service   && npm install && npx prisma migrate deploy && npm run dev
cd api-gateway       && npm install && npm run dev
cd frontend          && npm install && npm run dev      # http://localhost:3000
```

### Smoke test the flow
1. Register (OTP is emailed via Gmail) → verify → login.
2. As admin: create a station, a train, a route, then a **schedule** (this fires
   `admin.schedule-created`, which the inventory service consumes to create seats).
3. Search a train for that date → select seats → pay (Razorpay test mode) → booking confirms.

---

## B) Deploy 100% free (Oracle Cloud Always Free)

With Kafka gone, the stack is light enough that almost any free tier fits. The simplest
path is to **self-host everything** on one Oracle Cloud *Always Free* VM (4 ARM cores /
24 GB RAM, free forever) — far more than enough for Postgres, Redis, and every service.
(Smaller free hosts like Render/Railway/Fly also work now that there's no broker to run.)

### Steps
1. **Create the VM**: Oracle Cloud → Compute → Instances → Create. Pick an
   **Ampere (ARM) Always Free** shape, Ubuntu 22.04. Download the SSH key.
2. **Open ports**: in the VM's subnet Security List, allow inbound TCP **80** (and 443
   if you add TLS). SSH (22) is open by default.
3. **Install Docker** on the VM:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
   sudo usermod -aG docker $USER && newgrp docker
   ```
4. **Clone + configure**:
   ```bash
   git clone https://github.com/AkGoyal2111/RailBook.git && cd RailBook
   cp .env.prod.example .env
   nano .env     # set strong DB/Redis passwords, generate secrets (openssl rand -hex 32),
                 # add Gmail app password, Google client id, Razorpay keys,
                 # set PUBLIC_ORIGIN=http://<your-vm-public-ip>
   ```
5. **Launch**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
6. Visit `http://<your-vm-public-ip>` — the frontend is served by nginx and proxies
   `/api` to the gateway. Point your **Razorpay webhook** to
   `http://<your-vm-public-ip>/api/payments/webhooks/razorpay`.

### Optional niceties (still free)
- **Domain + HTTPS**: a free domain (e.g. DuckDNS) + Caddy/Traefik for auto-TLS.
- **Frontend on Vercel** instead of the VM: deploy `frontend/` to Vercel, set its API
  base URL to your gateway, and add that Vercel URL to `PUBLIC_ORIGIN` for CORS.

---

## Environment reference
- Each service reads its own `.env` (see each `*/.env.example`).
- Secrets that **must match** across services: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  (gateway ↔ user) and `INTERNAL_SERVICE_KEY` (all internal calls).
- Local infra defaults (from `docker-compose.yml`): Postgres `admin/irctcpass`,
  Redis password `irctcpass` (also the event bus, at `localhost:6379`).
- Real integrations you must supply: **Gmail app password** (OTP email),
  **Google OAuth client id**, **Razorpay keys**.
