# ⚑ Feature Flag System

A production-ready feature flag service built with **Node.js/Express**, **PostgreSQL**, and **Redis**. Supports boolean toggles, percentage-based rollouts with consistent hashing, and targeted user overrides — all manageable through a built-in admin dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client / Browser                  │
│              (Admin Dashboard at :3000)              │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP
┌──────────────────────▼──────────────────────────────┐
│              Express API  (:3000)                    │
│                                                      │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ CRUD Routes  │  │ /evaluate │  │  Middleware   │  │
│  │ /api/flags   │  │  endpoint │  │   SDK Client  │  │
│  └──────┬───────┘  └─────┬─────┘  └──────────────┘  │
│         │                │                           │
│  ┌──────▼────────────────▼──────┐                    │
│  │     Controller (cache-aside) │                    │
│  └──────┬───────────────┬───────┘                    │
└─────────│───────────────│────────────────────────────┘
          │               │
   ┌──────▼───────┐ ┌─────▼────────┐
   │  PostgreSQL  │ │    Redis     │
   │   (primary)  │ │   (cache)    │
   │  Feature     │ │  60s TTL     │
   │  flag data   │ │  per flag    │
   └──────────────┘ └──────────────┘
```

**Data flow:**
- **Reads** hit Redis first (cache-aside). On miss, query PostgreSQL and fill cache with 60s TTL.
- **Writes/Deletes** go to PostgreSQL first, then update or invalidate the Redis cache.

---

## Rollout Evaluation Algorithm

The `GET /api/flags/evaluate?flag=<name>&user_id=<id>` endpoint uses a 3-step evaluation:

```
1. Is the flag globally disabled (is_enabled = false)?
   └─ YES → return { enabled: false }

2. Is user_id in the targeted_users array?
   └─ YES → return { enabled: true }

3. Consistent hashing:
   hash = SHA-256(user_id)
   bucket = parseInt(hash[0..7], 16) % 100
   └─ bucket < rollout_percentage → { enabled: true }
   └─ otherwise                   → { enabled: false }
```

**Why consistent hashing?** The same `user_id` always produces the same hash, so a user's experience is deterministic — they don't randomly flip between enabled/disabled on each request. When you increase `rollout_percentage` from 10% to 20%, the original 10% of users stay included and 10% more are added.

---

## API Reference

### Feature Flag CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/flags` | Create a new flag |
| `GET` | `/api/flags` | List all flags |
| `GET` | `/api/flags/:name` | Get a single flag |
| `PUT` | `/api/flags/:name` | Update a flag |
| `DELETE` | `/api/flags/:name` | Delete a flag |

### Evaluation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flags/evaluate?flag=<name>&user_id=<id>` | Evaluate flag for a user |

### Create/Update Request Body

```json
{
  "flag_name": "dark_mode",
  "description": "Enable dark mode UI",
  "is_enabled": true,
  "rollout_percentage": 50,
  "targeted_users": ["user_1", "user_vip"]
}
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### Run with Docker Compose

```bash
# Clone the repo
git clone https://github.com/your-username/feature-flag-system.git
cd feature-flag-system

# Start all services (app, PostgreSQL, Redis)
docker compose up --build

# In another terminal, run database migrations
docker compose exec app node src/db/migrate.js
```

The service is now running:
- **Admin Dashboard:** http://localhost:3000
- **API:** http://localhost:3000/api/flags
- **Health Check:** http://localhost:3000/health

### Run Locally (without Docker)

```bash
# Prerequisites: Node.js 18+, PostgreSQL, Redis running locally

# Install dependencies
npm install

# Configure environment
# Edit .env with your PostgreSQL and Redis connection strings

# Run migrations
npm run migrate

# Start the dev server
npm run dev
```

---

## Project Structure

```
feature-flag-system/
├── public/
│   └── index.html                  # Admin dashboard
├── src/
│   ├── app.js                      # Express app entry point
│   ├── config/
│   │   ├── db.js                   # PostgreSQL client
│   │   └── redis.js                # Redis client
│   ├── controllers/
│   │   └── featureFlagController.js # Request handlers + cache logic
│   ├── db/
│   │   ├── migration.sql           # Initial schema
│   │   ├── add_rollout_fields.sql  # Rollout columns migration
│   │   └── migrate.js              # Migration runner
│   ├── middlewares/
│   │   └── featureFlagMiddleware.js # Express middleware for flag evaluation
│   ├── models/
│   │   └── featureFlag.js          # PostgreSQL query layer
│   ├── routes/
│   │   └── featureFlagRoutes.js    # Route definitions
│   └── sdk/
│       └── featureFlagClient.js    # Lightweight API client
├── Dockerfile                       # Multi-stage production build
├── docker-compose.yml               # Full stack orchestration
├── .dockerignore
├── .gitignore
├── .env                             # Environment variables (not committed)
└── package.json
```

---

## SDK & Middleware Usage

For client applications that consume the feature flag service:

```javascript
const featureFlagMiddleware = require("./middlewares/featureFlagMiddleware");

// Apply to routes
app.use("/dashboard", featureFlagMiddleware({
  flags: ["dark_mode", "beta_feature"],
  getUserId: (req) => req.headers["x-user-id"],
}));

// Access in handlers
app.get("/dashboard", (req, res) => {
  if (req.featureFlags.dark_mode) {
    // serve dark mode
  }
});
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 (Alpine) |
| Framework | Express 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containerization | Docker + Docker Compose |

---

## License

MIT
