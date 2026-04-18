# Car Service Business Platform

Full-stack web app with two fully separate interfaces:
- Customer Website (public booking experience)
- Admin Panel (private operations system)

## Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Uploads: Cloudinary
- Auth: JWT (admin-only protected routes)

## Project Structure
- `frontend/` — Next.js app (customer + admin UI)
  - `app/` — pages and routes
  - `components/` — reusable UI
  - `lib/` — API clients and shared types
- `backend/` — Express API, models, middleware, routes

## Key Features
- Customer flow: homepage, dynamic services, step booking, confirmation page
- Admin flow: dashboard, service management, slot management, booking management
- Job cards: services done, parts used, extra charges, notes
- BEFORE/AFTER inspection media with Cloudinary upload and booking linkage
- Mandatory BEFORE images before setting a booking to `In Progress`
- Customer never sees internal pricing logic/admin data

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

4) Seed admin account (after the API is running)
```bash
POST http://localhost:5000/api/auth/seed-admin
```

5) Run **frontend + backend together** — see [Run locally in VS Code](#run-locally-in-vs-code) below, or from the project root in any terminal:
```bash
npm run dev
```
This starts Next.js and Express (MongoDB must be running). Logs are labeled `web` and `api`.

Optional — run only one side:
```bash
npm run dev:web   # Next.js only
npm run dev:api   # Express only
```

## Run locally in VS Code

Use the **integrated terminal** in VS Code (**View → Terminal**, or `` Ctrl+` `` / `` Ctrl+Shift+` `` for a new terminal) so paths and `npm` scripts resolve the same way as below. You need both the **frontend** (Next.js in `frontend/`) and **backend** (Express in `backend/`) for the full app.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- **MongoDB** running locally or a reachable connection string in `backend/.env` (`MONGO_URI`; see `backend/.env.example`)
- Dependencies installed (from [Setup](#setup): `npm install` and `npm run install:all` at the repo root)

### Open the correct folder in VS Code
1. **File → Open Folder…** and choose the **repository root** (the folder that contains both `frontend/` and `backend/`), not only one of those subfolders.
2. Confirm the terminal’s current directory is that root (the prompt usually shows the folder name). If not, `cd` to it first.

### Run frontend + backend together (recommended)
In the integrated terminal, from the **repository root**:

```bash
npm run dev
```

This starts **both** processes in one terminal with labels:

| Label | What it runs | Default URL |
|--------|----------------|---------------|
| `web` | Next.js (`frontend/`) | [http://localhost:3000](http://localhost:3000) |
| `api` | Express (`backend/`) | [http://localhost:5000](http://localhost:5000) — [http://localhost:5000/api/health](http://localhost:5000/api/health) |

If port **3000** is busy, Next.js picks another port; check the `web` output for the exact URL.

### Run frontend and backend in separate VS Code terminals (optional)
Use **Terminal → Split Terminal** or a **second terminal tab** so each side has its own log stream.

**Option A — from the repo root (same as above, but split):**

- Terminal 1: `npm run dev:web` → frontend only  
- Terminal 2: `npm run dev:api` → backend only  

**Option B — `cd` into each package:**

- Terminal 1:
  ```bash
  cd frontend
  npm run dev
  ```
- Terminal 2:
  ```bash
  cd backend
  npm run dev
  ```

Same ports: **3000** (site) and **5000** (API) unless your environment changes them.

### Windows PowerShell note
If `cd folder && command` fails, use two lines or:

```powershell
Set-Location "path\to\car-service-business 2026"
npm run dev
```

### Stopping the servers
Click the terminal that is running the process and press **Ctrl+C**. If you used two terminals, stop each one separately.

# CarService18April2026
