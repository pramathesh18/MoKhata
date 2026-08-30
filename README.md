# MoKhata — Secure Multi-Tenant Credit Ledger

A production-quality credit/debt ledger web application for shopkeepers. Shop owners manage customer accounts and track credit/payment transactions. Customers can view their own ledger and balance. Multi-tenant isolation ensures one shop can never access another shop's data.

---

## Features

- **Shop Owner Dashboard** — Mobile-first, Google Keep-style customer card grid
- **Customer Portal** — Simple single-page view: balance, transaction history, password change
- **Hidden Admin Panel** — `/hidden-admin-panel` for creating shop owner accounts
- **Atomic Ledger Transactions** — Balance and transaction always updated together via DB transaction
- **Soft Deletion** — Customers are deactivated, historical transactions are always preserved
- **Role-Based Access Control** — `SHOP_OWNER`, `CUSTOMER`, `ADMIN` roles enforced server-side
- **Dark / Light Mode** — CSS variable-based theming on the dashboard

---

## Architecture

```
MoKhata/
├── client/          # React + Vite + TypeScript frontend
├── server/          # Express + TypeScript + Prisma backend
│   └── prisma/      # PostgreSQL schema & migrations
├── .env.example     # Environment variable template
├── README.md
└── PROJECT_PROGRESS.md
```

**Backend** serves the REST API. **Frontend** is served separately (or you can serve the built `client/dist` from Express for a single-service Render deployment).

---

## Tech Stack

| Layer      | Technology                              |
|------------|------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, React Router |
| Backend    | Node.js, Express, TypeScript             |
| Database   | PostgreSQL (via Prisma ORM)              |
| Auth       | express-session, argon2id, HTTP-only cookies |
| Deployment | Render                                   |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a cloud database)

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd MoKhata

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# Copy the example and fill in your values
cp .env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/mokhata?schema=public
SESSION_SECRET=your-long-random-secret-here
ADMIN_PASSWORD_HASH=<generate below>
```

**Generate a SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Generate ADMIN_PASSWORD_HASH:**
```bash
cd server
npx ts-node -e "const a = require('argon2'); a.hash('your-admin-password').then(h => console.log(h))"
```

### 3. Run database migrations

```bash
cd server
npx prisma migrate dev --name init
```

### 4. Start backend

```bash
cd server
npm run dev   # runs on http://localhost:5000
```

### 5. Start frontend

```bash
cd client
npm run dev   # runs on http://localhost:5173
```

---

## Render Deployment

### Recommended Architecture

Deploy **two separate Render services**:

| Service | Type | Purpose |
|---------|------|---------|
| `mokhata-api` | **Web Service** | Express backend |
| `mokhata-client` | **Static Site** | React Vite frontend |

Plus a **Render PostgreSQL** managed database.

---

### Step 1: Create a Render PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New → PostgreSQL**
3. Name it `mokhata-db`
4. Copy the **Internal Database URL** (for use within Render's network)

---

### Step 2: Deploy the Backend (`mokhata-api`)

1. Click **New → Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build && npm run prisma:migrate:prod` |
| **Start Command** | `npm start` |

4. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DATABASE_URL` | (paste Internal Database URL from Step 1) |
| `SESSION_SECRET` | (generate a 64-byte random hex string) |
| `ADMIN_PASSWORD_HASH` | (argon2id hash of your chosen admin password) |
| `FRONTEND_URL` | (your frontend URL, e.g. `https://mokhata-client.onrender.com`) |

---

### Step 3: Deploy the Frontend (`mokhata-client`)

1. Click **New → Static Site**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Add **Environment Variable** for the API base URL by updating `client/src/api/client.ts`:
   - Change `API_BASE_URL` to point to your backend URL, e.g. `https://mokhata-api.onrender.com/api`

> **Note:** Since the frontend calls the backend from the browser, set `FRONTEND_URL` in the backend env to your deployed frontend URL to allow CORS. No env vars are exposed to the frontend.

---

### Step 4: Verify Production Cookies

The backend is already configured for production cookies:

```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',   // ✅ Secure flag in production
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,                // 7-day session
}
```

> **Important:** If your frontend and backend are on different Render domains, you may need `sameSite: 'none'` with `secure: true`. Adjust in `server/src/app.ts` if needed.

---

### Step 5: Run Database Migration (first deploy only)

The build command includes `prisma migrate deploy`, which runs pending migrations automatically on each deploy.

To manually apply migrations:
```bash
npx prisma migrate deploy
```

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Express server port (Render sets this automatically) |
| `NODE_ENV` | Yes | `production` or `development` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Long random string for session signing |
| `ADMIN_PASSWORD_HASH` | Yes | Argon2id hash of the admin console password |
| `FRONTEND_URL` | Yes | CORS allowed origin (your deployed frontend URL) |

---

## Admin Panel

The hidden admin panel is accessible at:

```
https://your-app.onrender.com/hidden-admin-panel
```

This route is **not linked anywhere** in the main UI. A wrong password returns `404 Not Found` by design.

Admin can:
- Create shop owner accounts
- Reset shop owner passwords

Admin **cannot** access customer data.

---

## Security

- Passwords hashed with **Argon2id** — never stored in plaintext
- Sessions stored server-side using **express-session** with PostgreSQL store
- Authentication via **HTTP-only cookies** (no localStorage)
- `Secure` flag enabled in production
- **Helmet** security headers on all responses
- **CORS** restricted to `FRONTEND_URL` only
- Multi-tenant isolation enforced at controller level — every query verifies ownership
- Admin routes return `404` for unauthorized access to prevent probing
- Stack traces hidden in production error responses

---

## License

ISC
