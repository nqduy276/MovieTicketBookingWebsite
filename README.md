# Movie Ticket Booking Website (CineBook)

A full-stack CGV-style cinema booking site:

- **Frontend** — React + Vite + Tailwind (`src/`)
- **Backend** — FastAPI + SQLAlchemy (`backend/`)
- **Database** — MySQL with the **CineBook** schema (course exercise:
  `create_tables.sql`, `database_logic*.sql` at the project root)

The backend runs against the schema in `backend/sql/` — which is your
course SQL plus a few extras the live app needs. See
[`COMPARISON.md`](COMPARISON.md) for the SQL-side vs Python-side
comparison and [`CHANGES.md`](CHANGES.md) for what changed during the
SQLite → MySQL migration.

---

## One-time setup

```bash
# 1. MySQL — install and start
brew install mysql && brew services start mysql           # macOS
# (or your platform's equivalent)

# 2. Load the schema and procedures into MySQL
mysql -u root < backend/sql/01_schema.sql
mysql -u root CineBook < backend/sql/02_procedures.sql

# 3. Backend Python deps
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# 4. Configure DB credentials
cp .env.example .env
# Edit .env and put your MySQL password into DATABASE_URL
# (default expects user 'root' with no password)

# 5. Seed sample data (12 movies, 6 cinemas, 1500+ showtimes, demo users)
./venv/bin/python seed.py
cd ..

# 6. Frontend deps
npm install
```

## Running the app (every day)

Two terminals:

```bash
# Terminal 1 — backend
cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
npm run dev
```

Open the URL Vite prints (default http://localhost:5173) and log in.

**Demo accounts** (after `python seed.py`):

| Role     | Username   | Email                  | Password      |
|----------|------------|------------------------|---------------|
| Customer | `customer` | customer@example.com   | `password123` |
| Employee | `staff`    | staff@example.com      | `password123` |

Employee promo code: `STAFF2026` (50% off, max 1 use per ISO week).

---

## Resetting the database

```bash
mysql -u root -e "DROP DATABASE IF EXISTS CineBook;"
mysql -u root < backend/sql/01_schema.sql
mysql -u root CineBook < backend/sql/02_procedures.sql
cd backend && ./venv/bin/python seed.py
```

---

## Project structure

```
MovieTicketBookingWebsite/
│
├── README.md                        ← you are here
├── COMPARISON.md                    ← SQL stored-proc logic vs Python logic
├── CHANGES.md                       ← what changed (SQLite → MySQL)
├── ATTRIBUTIONS.md                  ← shadcn/ui + Unsplash credits
│
├── create_tables.sql                ← course exercise — schema
├── database_logic.sql               ← course exercise — P1 (user mgmt)
├── database_logic_P2.sql            ← course exercise — P2 (queries)
├── database_logic_P4.sql            ← course exercise — P4 (booking flow)
├── test.sql                         ← course exercise — example calls
├── main.sql                         ← course exercise — empty placeholder
│
├── src/                             ← React frontend
│   ├── main.tsx
│   ├── styles/
│   └── app/
│       ├── App.tsx
│       ├── routes.tsx
│       ├── components/
│       ├── pages/                   (Home, Login, MovieDetail, SeatSelection, …)
│       ├── lib/                     (api.ts, auth.tsx)
│       └── types/
│
├── backend/                         ← FastAPI backend
│   ├── README.md
│   ├── .env.example
│   ├── requirements.txt
│   ├── seed.py
│   ├── sql/
│   │   ├── 01_schema.sql            (yours + [+EXT] columns/tables)
│   │   ├── 02_procedures.sql        (yours + [+EXT] procedures)
│   │   └── README.md
│   └── app/
│       ├── main.py                  (FastAPI entry, scheduler, CORS)
│       ├── config.py
│       ├── database.py              (MySQL engine)
│       ├── core/                    (security.py, deps.py)
│       ├── models/                  (SQLAlchemy ORM mapped to CineBook tables)
│       ├── schemas/                 (Pydantic — keeps stable JSON shape)
│       ├── routers/                 (auth, movies, cinemas, showtimes, seats, food, promo, bookings, loyalty)
│       └── jobs/cleanup.py          (calls the SQL cleanup procedures every 5 min)
│
├── index.html                       ← Vite entry
├── vite.config.ts
├── postcss.config.mjs
├── package.json / package-lock.json
└── guidelines/                      ← Figma Make starter content (optional)
```

---

## Tech stack

| Layer         | Tech |
|---------------|---|
| Frontend      | React 18, TypeScript, Vite, Tailwind, shadcn/ui, react-router |
| Backend       | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Auth          | bcrypt + JWT (PyJWT) |
| Database      | MySQL 8+ (CineBook schema) |
| Scheduler     | APScheduler (5-min cleanup job calling SQL procedures) |
