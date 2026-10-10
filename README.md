# 🛡️ AegisTrace // E-Commerce Automated Visual API Debugger & Self-Healing Resilience Engine

> **AegisTrace** is an autonomous visual API debugger and self-healing resilience engine for e-commerce microservices. It watches your live orders flow in real time across 5 microservices, auto-detects distributed failures, pinpoints the root cause in milliseconds, and automatically deploys self-healing policies to keep the Service Error Rate strictly **&le; 1.0%**.

---

## 🌟 60-Second Onboarding & Beginner's Guide (Understand in 1–2 Minutes)

Welcome to AegisTrace! If you are new to the platform, this section gives you everything you need to know in under 2 minutes.

### 1. What is AegisTrace?
In a modern e-commerce system, a single customer order hops through multiple microservices:
1. **Checkout API** (cart & price validation)
2. **Inventory DB** (stock reservations)
3. **Payment Gateway** (credit card processing)
4. **Fulfillment API** (warehouse packing & database connection pools)
5. **Logistics API** (carrier shipping labels)

If **any** service fails (out-of-stock, Stripe timeout, database crash, carrier DNS down), the order drops and revenue is lost.

**AegisTrace solves this**:
- **Visualizes** live transaction traces node-by-node.
- **Pinpoints** the exact line of code and service causing the failure (Automated RCA).
- **Auto-heals** the issue in under 1.5 seconds (safety stock buffer, Adyen gateway failover, connection recycling, RabbitMQ queue buffering).
- **Keeps error rates &le; 1.0%** (typically 0.0% &ndash; 0.5%) even under high-traffic stress.

---

### 2. How to Start the App (1 Command)

#### Prerequisites
- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **npm** (included with Node.js)

#### Launch Everything
In this directory, run:
```bash
npm start
```
*(On Windows, you can also double-click `run_debugger.bat`)*

This single command automatically:
1. Boots all **5 realistic microservices** on ports `5001` through `5005`.
2. Starts the **AegisTrace Gateway & Web Dashboard** on port `8000`.
3. Opens your browser to `http://localhost:8000` *(or your assigned public HTTPS URL when deployed to Railway or Render)*.

#### Public Live Demo Access (Instant & Zero-Barrier)
AegisTrace is configured for **Public Evaluation Access**:
- **Instant Public Access**: Anyone visiting the URL immediately sees and interacts with the full live dashboard, pipeline tracer, fault sandbox, and AI copilot without any login barrier!
- **Switch to Private Tenant Workspace (On-Demand)**: Click **Sign In / Switch Tenant** in the top-right header to test multi-tenant data isolation:
  - **1-Click Test Preset**: Click **Aegis Enterprise** (`admin@aegistrace.com` / `password123`) or **Acme Corp** (`dev@acmecorp.com` / `password123`).
  - **Sign in with Google**: 1-click Google SSO or your own Google Cloud Client ID.
  - **Sign Up**: Register with any valid email (`name@domain.com`) to get your own isolated tenant workspace.
  - **Public Guest**: Click **Continue as Public Guest** at any time to return to the public evaluation workspace.

---

### 3. How to Run a Demo Order

There are 3 simple ways to run transactions:

| Method | How to Do It | What You See |
|---|---|---|
| **Option A: Auto-Pilot (Default)** | Toggle **Auto-Pilot** switch in the top header to ON | Orders stream continuously into the visual pipeline every few seconds |
| **Option B: 1-Click Investor Pitch** | Click **Start Investor Pitch Demo** in the top header | Runs a scripted demonstration showcasing normal flow, sudden failure, automated RCA, and instant recovery |
| **Option C: Custom Order Builder** | In the left panel under **Custom Order Builder**, select an item (e.g. MacBook Pro M3) and click **Inject Custom Transaction** | A dedicated trace pulses through Checkout &rarr; Inventory &rarr; Payment &rarr; Fulfillment &rarr; Logistics |

---

### 4. How to Use the Fault Injection Lab

The **Fault Injection Lab** (left panel) lets you simulate real-world e-commerce outages in 1 click to watch how AegisTrace responds:

| Scenario Button | What Happens (Simulated Outage) | How AegisTrace Auto-Heals It |
|---|---|---|
| **Healthy Traffic Loop** | Regular healthy order | All 5 microservices return HTTP 200 OK. Node pulses green. |
| **Inventory Depletion (422)** | SKU-4402 has 0 stock (`ERR_INVENTORY_DEPLETED`) | Auto-Remediation executes `sync_stock_cache.sh`, adds +100 items to safety stock buffer, and passes verification trace. |
| **Card Declined (402)** | Card funds insufficient (`STRIPE_CARD_DECLINED`) | Auto-Remediation dispatches real-time SMS checkout retry token to customer via Twilio webhook and parks order. |
| **Payment Gateway Timeout (504)** | Stripe API socket hangs for > 2500ms | Middleware automatically fails over to secondary Adyen gateway adapter with expanded timeout. |
| **DB Pool Exhausted (500)** | Fulfillment Postgres connection pool saturated (20/20) | Auto-remediation terminates zombie connection handles and expands pool capacity to 50 connections. |
| **Logistics Service Down (503)** | DHL carrier DNS resolution fails | Auto-remediation reroutes outgoing shipping labels to a persistent local RabbitMQ deferred queue. |

#### What to Look For When a Fault Happens:
1. **The Visual Pipeline Node turns RED** indicating which microservice failed.
2. The **Auto-Diagnostic Report (RCA)** in the right column displays the exact error signature, failing HTTP code, and root cause explanation.
3. The **Auto-Remediation Timeline** shows the 3-step healing cycle: `Anomaly Detected` &rarr; `Triggering Auto-Heal` &rarr; `Verification Trace`.
4. The node turns **GREEN**, the **Preserved Revenue** counter increments, and the **Service Error Rate** returns to **&le; 1.0%**!

---

### 5. How to Understand the Metrics

The dashboard displays live telemetry divided into two cards:

#### A. System Metrics Monitor
- **API Latency (ms)**: Average round-trip response time for complete order processing across all 5 services. Normal is 100ms &ndash; 250ms.
- **Service Error Rate (%)**: Percentage of failed orders over total transactions. With AegisTrace Autonomous Self-Healing active, this is strictly **&le; 1.0%** (typically 0.0% &ndash; 0.5%).
- **DB Connection Pool**: Active Postgres handles in the Fulfillment service. If it reaches maximum capacity (20/20), the engine recycles zombie handles to prevent crashes.
- **CPU System Load (%)**: Simulated CPU utilization across backend container instances.

#### B. Business Preserved Metrics
- **Preserved Revenue ($)**: Total dollar value of customer purchases saved by self-healing instead of failing.
- **MTTR (Self-Heal Time)**: Mean Time To Recover &mdash; how many seconds AegisTrace took to detect, patch, and re-verify the pipeline (typically < 1.5 seconds).
- **Eng. Hours Saved**: Estimated developer on-call engineering hours saved by automated remediation.

#### C. SLA Target Compliance Monitor
- Displays 24-hour rolling uptime status per service (Checkout, Inventory, Payment, Fulfillment, Logistics) certifying adherence to 99.99% enterprise SLA agreements.

---

### 6. How to Run Load & Chaos Testing

You can stress-test AegisTrace under heavy concurrent traffic either visually in the browser or via CLI commands:

#### Option A: Inside the Web Dashboard
1. Scroll to the **⚡ Load & Chaos Testing Engine** card in the left panel.
2. Select **Traffic Volume** (25, 50, or 100 orders) and **Concurrency Pool** (5, 10, or 20 workers).
3. Ensure **Inject Chaos Faults** and **Autonomous Self-Healing** are checked.
4. Click **Run Stress Test**.
5. Watch live progress, throughput, and error rates. Once complete, click **📄 Report** to view the certified stability report.

#### Option B: Terminal CLI Commands
```bash
# 1. Run High-Concurrency Load Test (50+ orders @ 10 concurrency)
npm run test:load

# 2. Run Chaos Engineering Experiment (Compares Unmanaged vs Self-Healing)
npm run test:chaos

# 3. Run Full Stability Suite & Generate stability_report.md
npm run test:all

# 4. Run Microservices Unit & Integration Test Suite (52 tests)
npm test
```

---

## 🏗️ Architecture & Port Mapping

Each pipeline stage runs as an independent Express microservice with its own dedicated port, health checks, state store, and remediation triggers:

| Pipeline Stage | Port | Health Endpoint | Primary Action Endpoint | Auto-Remediation Endpoint |
|---|---|---|---|---|
| **1. Checkout API** | `:5001` | `GET /health` | `POST /checkout` | `POST /reset` |
| **2. Inventory DB** | `:5002` | `GET /health` | `POST /inventory/reserve` | `POST /inventory/remediate` |
| **3. Payment Gateway** | `:5003` | `GET /health` | `POST /payment/charge` | `POST /payment/remediate` |
| **4. Fulfillment API** | `:5004` | `GET /health` | `POST /fulfillment/pack` | `POST /fulfillment/remediate` |
| **5. Logistics API** | `:5005` | `GET /health` | `POST /logistics/ship` | `POST /logistics/remediate` |
| **Aegis Gateway & UI** | `:8000` | `GET /api/system/status` | `GET /` | `POST /api/remediate` |

---

## 🚀 Production Cloud Deployment Guide (Railway & Render)

AegisTrace is fully cloud-native and pre-configured for **zero-friction 1-click deployment** to hosted platforms like **Railway** and **Render**, as well as any container runtime (Docker, AWS ECS, GCP Cloud Run, Fly.io, Heroku, DigitalOcean).

### 🌟 Why Cloud Deployment Just Works
- **Single-Container Multi-Microservice Engine**: Cloud platforms expose a single public web port (`$PORT`) to the internet router. AegisTrace binds its Express Gateway to `0.0.0.0:${PORT}` while orchestrating the 5 internal microservices on loopback (`127.0.0.1:5001–5005`) within the container. No multi-container networking complexity or multi-service billing required.
- **Port Collision Guard**: If the cloud platform randomly assigns a `$PORT` matching one of the internal microservices (5001–5005), AegisTrace automatically offsets internal microservice ports to 15001–15005 to guarantee zero `EADDRINUSE` crashes.
- **Zero Hardcoded Localhost URLs**: The frontend UI dynamically detects `window.location.origin`, automatically adjusting API calls, cURL snippets, and SSE stream endpoints to your public HTTPS domain.
- **Automated Health Checks**: Cloud platforms monitor `/api/system/status` for zero-downtime rolling deploys.

---

### Option 1: Deploy to Railway (Recommended — Fastest)

Railway automatically detects [`railway.json`](railway.json) and configures the build and health checks.

#### Method A: Via Railway Web Dashboard (GitHub)
1. Push your AegisTrace repository to **GitHub**.
2. Visit **[railway.app](https://railway.app)** and log in.
3. Click **+ New Project** &rarr; **Deploy from GitHub repo**.
4. Select your repository and click **Deploy Now**.
5. Once the initial build finishes, click on your service card &rarr; **Settings** &rarr; **Networking**.
6. Click **Generate Domain**.
7. **Done!** Your app is live at `https://aegistrace-production.up.railway.app` (or your custom domain).

#### Method B: Via Railway CLI
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login to your account
railway login

# 3. Link or create project
railway init

# 4. Deploy repository
railway up

# 5. Generate and open public domain
railway domain
railway open
```

---

### Option 2: Deploy to Render (Blueprint / Web Service)

Render provides free cloud hosting with automated SSL and rolling zero-downtime updates.

#### Method A: 1-Click Blueprint (Using [`render.yaml`](render.yaml))
1. Push your repository to **GitHub** or **GitLab**.
2. Visit **[dashboard.render.com](https://dashboard.render.com)**.
3. Click **Blueprints** (left sidebar) &rarr; **New Blueprint Instance**.
4. Connect your repository. Render automatically reads `render.yaml` and sets:
   - **Service Name**: `aegistrace`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/api/system/status`
5. Click **Apply**.
6. **Done!** Render provisions an SSL certificate and assigns your live URL (e.g. `https://aegistrace.onrender.com`).

#### Method B: Manual Web Service Setup
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Select your GitHub repository.
3. Fill in the fields:
   - **Name**: `aegistrace`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
4. Expand **Advanced** and set:
   - **Health Check Path**: `/api/system/status`
5. Click **Create Web Service**.

---

### Option 3: Deploy with Docker & Docker Compose

AegisTrace includes an Alpine Linux production [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml):

```bash
# Option A: Build and run using Docker CLI
docker build -t aegistrace .
docker run -d -p 8000:8000 -e PORT=8000 --name aegistrace aegistrace

# Option B: Run with Docker Compose
docker compose up -d

# Check running container status and logs
docker ps
docker logs -f aegistrace
```

---

### ⚙️ Environment Variables Reference

All environment variables have sensible production defaults and are optional unless customized:

| Variable | Default Value | Required? | Description |
|---|---|---|---|
| `PORT` | `8000` | Optional | The HTTP port assigned by your hosting platform (Railway/Render set this automatically). |
| `HOST` | `0.0.0.0` | Optional | Network interface to bind (defaults to `0.0.0.0` for all container interfaces). |
| `NODE_ENV` | `development` (`production` in cloud) | Optional | Set to `production` in hosted environments for caching and performance optimizations. |
| `JWT_SECRET` | Auto-persisted in `auth_store.json` | Optional | Cryptographic secret used to sign HMAC-SHA256 user authentication tokens. |
| `PUBLIC_URL` | Auto-detected | Optional | Override the public HTTPS domain (auto-populated by `RENDER_EXTERNAL_URL` on Render or `RAILWAY_PUBLIC_DOMAIN` on Railway). |
| `GEMINI_API_KEY` | None | Optional | Google Gemini API key to enable the in-app Aegis AI Copilot conversational debugging assistant. |

---

### 🌍 Verifying Your Hosted Deployment

After deploying to Railway or Render, verify the service is running properly:

#### 1. Check Gateway System Health
Run this cURL command using your assigned public URL:
```bash
curl https://<your-assigned-app>.up.railway.app/api/system/status
```

Expected JSON response:
```json
{
  "status": "HEALTHY",
  "gateway": "AegisTrace Enterprise Visual Debugger",
  "environment": "production",
  "port": 10000,
  "publicUrl": "https://<your-assigned-app>.up.railway.app",
  "services": {
    "checkout": "http://127.0.0.1:5001",
    "inventory": "http://127.0.0.1:5002",
    "payment": "http://127.0.0.1:5003",
    "fulfillment": "http://127.0.0.1:5004",
    "logistics": "http://127.0.0.1:5005"
  },
  "uptime": 42.1
}
```

#### 2. Open the Visual Dashboard in Your Browser
Visit your public domain (`https://<your-assigned-app>.up.railway.app` or `https://<your-assigned-app>.onrender.com`).
- The security portal opens with multi-tenant login and 1-click test presets.
- The visual pipeline pulses live order transactions in real time over HTTPS.
- Fault injection, automated RCA, and self-healing resilience policies work flawlessly in the cloud!
- Load and chaos testing can be launched directly inside the hosted dashboard.

---

## 🔐 Security & Multi-Tenant Isolation

AegisTrace features a built-in authentication system with cryptographic HMAC-SHA256 JWT tokens and strict multi-tenant data segregation:

### Pre-Configured Test Credentials

| Email | Password | Tenant ID | Organization | Role |
|---|---|---|---|---|
| `admin@aegistrace.com` | `password123` | `tenant-aegis` | **Aegis Enterprise** | Administrator |
| `dev@acmecorp.com` | `password123` | `tenant-acme` | **Acme Corp** | Lead Developer |

### Security Features
1. **Route Protection**: All `/api/*` endpoints require a valid `Authorization: Bearer <JWT>` header. Unauthenticated requests are rejected with HTTP 401.
2. **Tenant Isolation**: Orders, telemetry events, and state metrics are strictly segregated by `tenantId`. Tenant 1 will never see or impact Tenant 2's data.
3. **Google Identity Services (GIS) OAuth 2.0**: Log in securely via Google SSO with token verification against `oauth2.googleapis.com`.
4. **Any Valid Email Registration**: Anyone can create an account using their own email. Dedicated tenant workspaces are automatically provisioned.

---

## 📘 Interactive In-App Help & Quick Guide

At any time while using the app:
- Click the **📘 Quick Guide** button in the top navigation bar to open the interactive 3-tab onboarding guide.
- Hover over any metric label or `?` icon to see instant explanatory tooltips.
- Hover over any pipeline node to inspect its dedicated port and microservice responsibility.
- Click prompt chips in the **Aegis AI Copilot** (e.g. *"Explain Failure"*, *"Recommend Fix"*, *"SLA Impact"*) for conversational AI debugging.
