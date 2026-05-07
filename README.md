# CineBook — Movie Ticket Booking Website

Full-stack CGV-style cinema booking app.

- **Frontend** — React 18 + Vite + TypeScript + Tailwind + shadcn/ui (`src/`)
- **Backend** — FastAPI + SQLAlchemy 2.0 + Pydantic v2 (`backend/`)
- **Database** — MySQL 8 with the strict **CineBook** schema in `backend/sql/`

The backend runs strictly against the schema in `backend/sql/create_tables.sql`
plus the three stored-procedure files (`database_logic.sql`,
`database_logic_P2.sql`, `database_logic_P4.sql`). Routers/models do not
introduce columns the SQL doesn't have.

---

## Prerequisites

- MySQL 8+ running locally on port 3306 (default user `root`, no password — adjust `.env` otherwise)
- Python 3.11+
- Node.js 18+

```bash
# macOS
brew install mysql && brew services start mysql
```

---

## One-time setup

```bash
# 1. Load schema + stored procedures into MySQL
./reset_db.sh

# 2. Backend Python deps
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# 3. Configure DB credentials
cp .env.example .env
# Edit .env if your MySQL user/password differs from `root` / blank.

# 4. Seed mock data (15 movies, 15 CGV cinemas in HCMC, ~thousands of showtimes,
#    F&B items, demo users, promo codes)
./venv/bin/python seed.py
cd ..

# 5. Frontend deps
npm install
```

---

## Running the app

Two terminals:

```bash
# Terminal 1 — backend (http://localhost:8000)
cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (http://localhost:5173)
npm run dev
```

Swagger UI: http://localhost:8000/docs

---

## Demo accounts

| Role     | Email                | Password      |
|----------|----------------------|---------------|
| Customer | duy@admin.com        | `123456`      |
| Customer | customer@example.com | `password123` |
| Staff    | nhanvien@cgv.vn      | `123456`      |
| Staff    | staff@example.com    | `password123` |

**Promo codes** (seeded):
- `STAFF2026` — 50% off, employee-only
- `WELCOME10` — 10% off, public, expires in 180 days

Personal vouchers use a code prefix encoding the owner:
- `LP{user_id}-XXXX` — loyalty redemption (created via `POST /api/loyalty/redeem`)
- `VC{user_id}-XXXX` — refund / staff voucher (created by an employee via `POST /api/promo`)

---

## Resetting the database

```bash
./reset_db.sh
cd backend && ./venv/bin/python seed.py
```

`reset_db.sh` drops `CineBook`, re-runs the four SQL files in order, and prints
the seed/run instructions.

---

## Schema constraints worth knowing

The strict SQL imposes ENUMs the backend & seed must respect:

| Column                  | Allowed values                              |
|-------------------------|---------------------------------------------|
| `MOVIE_GENRE.Genre`     | `Action`, `Comedy`, `Thriller`, `Romance`   |
| `AUDITORIUM.Screen_Type`| `2D`, `3D`, `IMAX`                          |
| `SEAT.Seat_Type`        | `Standard`, `VIP`, `Sweetbox`               |
| `CINE_USER.Role`        | `Customer`, `Staff`                         |

If a real-world genre (Drama, Sci-Fi, Fantasy, …) doesn't fit, the seed maps
it to the closest legal value (usually `Action` or `Thriller`).

---

## Project structure

```
MovieTicketBookingWebsite/
├── README.md                        ← you are here
├── reset_db.sh                      ← drop + reload schema/procedures
├── package.json                     ← frontend deps
├── vite.config.ts
├── index.html                       ← Vite entry
│
├── src/                             ← React frontend
│   ├── main.tsx
│   ├── styles/
│   └── app/
│       ├── App.tsx
│       ├── routes.tsx
│       ├── components/              (Header, ui/*)
│       ├── pages/                   (Home, Login, MovieDetail, SeatSelection,
│       │                             BookingConfirmation, MyBookings,
│       │                             LoyaltyPage, VouchersPage, ProfilePage)
│       ├── lib/                     (api.ts, auth.tsx)
│       └── types/api.ts
│
└── backend/                         ← FastAPI backend
    ├── requirements.txt
    ├── .env.example
    ├── seed.py                      ← mock-data loader
    ├── sql/
    │   ├── create_tables.sql        ← schema (tables, ENUMs, FKs, triggers)
    │   ├── database_logic.sql       ← P1 — account management procs
    │   ├── database_logic_P2.sql    ← P2 — query procs / functions
    │   └── database_logic_P4.sql    ← P4 — booking + loyalty procs
    └── app/
        ├── main.py                  ← FastAPI entry + CORS + scheduler
        ├── config.py                ← Pydantic settings (.env)
        ├── database.py              ← MySQL engine / SessionLocal
        ├── core/                    (security.py — bcrypt+JWT, deps.py — auth guards)
        ├── models/                  (SQLAlchemy ORM, 1:1 with CineBook tables)
        ├── schemas/                 (Pydantic — stable JSON shape for FE)
        └── routers/
            ├── auth.py
            ├── movies.py
            ├── cinemas.py
            ├── showtimes.py
            ├── seats.py
            ├── food.py
            ├── promo.py
            ├── bookings.py
            └── loyalty.py
```

---

## Tech stack

| Layer      | Tech                                                          |
|------------|---------------------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite 6, Tailwind 4, shadcn/ui, react-router 7 |
| Backend    | FastAPI, SQLAlchemy 2.0, Pydantic v2                          |
| Auth       | bcrypt + JWT (PyJWT)                                          |
| Database   | MySQL 8+ (strict CineBook schema, all business logic in stored procs / functions / triggers) |
| Scheduler  | APScheduler — periodic cleanup job invoking SQL procedures    |

---

## Common tasks

**Add a movie** — edit `MOVIES` in [`backend/seed.py`](backend/seed.py) and the
`POSTERS` map in [`backend/app/schemas/movie.py`](backend/app/schemas/movie.py),
then re-run `python seed.py`. Existing titles are skipped; new ones get
showtimes auto-generated for every auditorium × 7 days × 4–6 shows/day.

**Add a cinema / auditorium** — append to `COMPLEXES` in
[`backend/seed.py`](backend/seed.py) and re-run `python seed.py`. Each new
auditorium is seeded with an 8×10 seat grid (Standard / VIP / Sweetbox).

**Inspect API** — `http://localhost:8000/docs` (Swagger UI) or
`http://localhost:8000/redoc`.
hdihdw