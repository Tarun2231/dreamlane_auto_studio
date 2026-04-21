# Car Service Business Platform

Full-stack web app with two fully separate interfaces:
- Customer Website (public booking experience)
- Admin Panel (private operations system)

## Stack
- Frontend + API runtime: Next.js + Tailwind CSS
- API handlers: Next.js `pages/api` with Express-style routing (Vercel deployable)
- Database: MongoDB + Mongoose
- Uploads: Cloudinary
- Auth: JWT (admin-only protected routes)

## Project Structure
- `frontend/` — Next.js app (customer + admin UI + API entrypoint)
  - `app/` — pages and routes
  - `pages/api/[[...path]].js` — serverless API entrypoint used in local + Vercel
  - `components/` — reusable UI
  - `lib/` — API clients and shared types
- `backend/` — domain API modules, models, middleware, routes (mounted by Next API runtime)
- `lib/mongodb.js` — shared MongoDB connection + bootstrap utility

## Key Features
- Customer flow: homepage, dynamic services, step booking, confirmation page
- Admin flow: dashboard, service management, slot management, booking management
- Job cards: services done, parts used, extra charges, notes; optional final payment amount on a booking
- BEFORE/AFTER inspection photos (Cloudinary) with clear upload controls on the booking screen
- Mandatory BEFORE images before setting a booking to `In Progress`
- **PDF exports (admin):** branded **job sheet** (service summary, payment breakdown, before/after photos) and **invoice** (line items, discount env, bank block) — download or email to the customer when SMTP is configured
- Customer never sees internal pricing logic/admin data
- Booking confirmation emails are enhanced with rich branded HTML, booking summary, track-booking CTA, and invoice CTA

Configure PDF/invoice branding and bank lines via `backend/.env` (see `backend/.env.example`: `JOB_SHEET_*`, `INVOICE_*`).

## Setup

1) Frontend env
- Copy `frontend/.env.example` to `frontend/.env.local`

2) Backend env
- Copy `backend/.env.example` to `backend/.env`

3) Install dependencies (from the project root)
```bash
npm install
npm run install:all
```
(`install:all` runs `npm install` in `frontend/` and `backend/`. You can also run `npm install` in each folder yourself.)

4) Seed admin account (after the app is running)
```bash
POST http://localhost:3000/api/auth/seed-admin
```

5) Run the app (site + API together via Next.js) from the project root:
```bash
npm run dev
```
This starts Next.js with API routes under `/api` (MongoDB must be running).

## Run locally in VS Code

Use the **integrated terminal** in VS Code (**View → Terminal**, or `` Ctrl+` `` / `` Ctrl+Shift+` `` for a new terminal) so paths and `npm` scripts resolve the same way as below.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- **MongoDB** running locally or a reachable connection string in `backend/.env` (`MONGO_URI`; see `backend/.env.example`)
- Dependencies installed (from [Setup](#setup): `npm install` and `npm run install:all` at the repo root)

### Open the correct folder in VS Code
1. **File → Open Folder…** and choose the **repository root** (the folder that contains both `frontend/` and `backend/`), not only one of those subfolders.
2. Confirm the terminal’s current directory is that root (the prompt usually shows the folder name). If not, `cd` to it first.

### Run website + API together (recommended)
In the integrated terminal, from the **repository root**:

```bash
npm run dev
```

This starts Next.js with API handlers at `/api/...`:

| Label | What it runs | Default URL |
|--------|----------------|---------------|
| `web` | Next.js (`frontend/`) | [http://localhost:3000](http://localhost:3000) |
| `api` | Next API route handlers | [http://localhost:3000/api/health](http://localhost:3000/api/health) |

If port **3000** is busy, Next.js picks another port; check the `web` output for the exact URL.

### Run frontend directly (optional)
If you prefer running directly from the app package:

```bash
cd frontend
npm run dev
```

Same port: **3000** (site + API) unless your environment changes it.

### Windows PowerShell note
If `cd folder && command` fails, use two lines or:

```powershell
Set-Location "path\to\car-service-business 2026"
npm run dev
```

### Stopping the servers
Click the terminal that is running the process and press **Ctrl+C**. If you used two terminals, stop each one separately.
