# What changed (SQLite/SQLAlchemy → MySQL/CineBook)

This is the side-by-side change log. **Nothing in your original
`/create_tables.sql`, `/database_logic.sql`, `/database_logic_P2.sql`,
`/database_logic_P4.sql`, or `/test.sql` was modified** — they're still
the academic deliverable for the course exercise.

What changed is **the FastAPI backend**: it now runs against **MySQL +
your CineBook schema** instead of SQLite + the old ORM-defined tables.

---

## 1. New files I created

| File | Why |
|---|---|
| `backend/sql/01_schema.sql` | Unified MySQL schema (your `create_tables.sql` + a few `[+EXT]` columns and 3 `[+EXT TABLE]` tables the FE needs) |
| `backend/sql/02_procedures.sql` | Your `database_logic.sql` + P2 + P4 unchanged, **plus** ~10 `[+EXT]` procedures for the live app (seat map, cleanup jobs, etc.) |
| `backend/sql/README.md` | How to load the two .sql files into MySQL (see below) |
| `COMPARISON.md` | Feature-by-feature comparison of the SQL stored-procedure logic vs the Python application logic |
| `CHANGES.md` | This file |

## 2. Files I rewrote (kept the path, replaced the contents)

### Database layer
- `backend/.env` and `backend/.env.example` — `DATABASE_URL` is now MySQL.
- `backend/requirements.txt` — added `pymysql` (MySQL driver) + `cryptography` (auth plugin).
- `backend/app/database.py` — same SQLAlchemy connector, but no more `Base.metadata.create_all()`. The schema lives in the .sql files now.
- `backend/app/config.py` — default `DATABASE_URL` switched to MySQL.

### Models — every file rewritten to match the CineBook tables
- `backend/app/models/user.py` — was a single `User` table; now `CineUser` + `Customer` + `Staff` + `UserPhone` (matching the `CINEUSER` / `CUSTOMER` / `STAFF` / `USER_PHONE` design).
- `backend/app/models/cinema.py` — was just `Cinema`; now `TheaterComplex` + `Auditorium`.
- `backend/app/models/seat.py` — was per-showtime seats; now per-room seats with composite PK `(Room_ID, Seat_No)` plus a `SeatHold` table.
- `backend/app/models/booking.py` — was `Booking` + `BookingSeat` + `BookingFood`; now `Booking` + `Ticket` (ternary) + `BookingFandb` + `BookingPromo`.
- `backend/app/models/movie.py`, `food.py`, `promo.py`, `loyalty.py`, `employee_promo_usage.py` — all renamed to the CineBook tables, with the extra columns I added marked `[+EXT]`.
- `backend/app/models/__init__.py` — re-exports the new class names.

### Schemas (Pydantic) — kept the same JSON-API shape so the frontend doesn't break
- `backend/app/schemas/user.py` — same fields the FE expects (id, username, email, full_name, phone, age, role, loyalty_points, created_at) but built from `CineUser` via a `cineuser_to_out()` adapter.
- `backend/app/schemas/movie.py`, `cinema.py`, `food.py`, `promo.py` — also got `*_to_out()` adapters that translate UPPER_CASE column names back into the snake_case the FE expects.
- `backend/app/schemas/showtime.py`, `seat.py`, `booking.py` — minor field tweaks; same JSON shape.

### Routers
- `backend/app/routers/auth.py` — `register()` now `CALL`s `CreateCustomerEx` / `CreateStaffEx` (the extended versions of your stored procedures) so the `BeforeInsertUser` trigger fires.
- `backend/app/routers/movies.py`, `cinemas.py`, `showtimes.py`, `seats.py`, `food.py`, `promo.py`, `bookings.py`, `loyalty.py` — all rewritten to query the new tables and return the same JSON the FE was already consuming.
- `backend/app/routers/seats.py` — calls `CALL GetSeatMap(showtime_id)` (the procedure I added) with a Python fallback if the proc isn't loaded.

### Background jobs
- `backend/app/jobs/cleanup.py` — now just calls `CALL ArchiveExpiredShowtimes()`, `HideMoviesWithoutShowtimes()`, `MarkExpiredBookings()`, `PurgeExpiredSeatHolds()`. The Python loops are gone; the logic is in the DB.

### Seed
- `backend/seed.py` — uses `CreateCustomerEx` / `CreateStaffEx` for users (so triggers fire); inserts cinemas/auditoriums/seats/movies/showtimes/F&B via the ORM. Idempotent — safe to re-run.

### App entry
- `backend/app/main.py` — replaced `init_db()` with a `check_db()` probe that gives a clear error if the schema isn't loaded.

## 3. Files I left alone

- **All four root-level SQL files** (`create_tables.sql`, `database_logic.sql`, `database_logic_P2.sql`, `database_logic_P4.sql`) — your course deliverable, unchanged.
- **`test.sql`** — your direct test script, still works against the unified schema (Username is auto-derived from email when missing, see below).
- **The entire frontend (`src/`)** — no changes. The API JSON shape was preserved.
- **`index.html`, `vite.config.ts`, `package.json`** etc. — no changes.

---

## 4. What I added on top of your SQL (the `[+EXT]` parts)

### Columns I added — always nullable / safe defaults so your SQL keeps working

| Table | Added column | Why |
|---|---|---|
| `CINEUSER` | `Username VARCHAR(80) UNIQUE NULL` | Login uses (username, email, password). NULL is allowed; trigger auto-fills it from email's local-part if you don't pass one. |
| `CUSTOMER` | `Age INT NULL` | Frontend uses it for age-rated movie filtering |
| `MOVIE` | `Title_VI`, `Description`, `Image`, `Trailer`, `Director`, `Cast`, `Rating_Label`, `Release_Date`, `Is_Active`, `Created_At` | All the things a movie poster page displays |
| `SHOWTIME` | `Base_Price DECIMAL(10,2)`, `Is_Archived BOOLEAN` | Price reference + cleanup flag |
| `SEAT` | `Seat_ID INT AUTO_INCREMENT UNIQUE` | Single-int surrogate key for the REST API (the natural composite key `(Room_ID, Seat_No)` is preserved as PK) |
| `BOOKING` | `Code VARCHAR(20)`, `Seat_Total`, `Food_Total`, `Discount`, `Promo_Code`, `Loyalty_Points_Awarded`, `Status ENUM('UPCOMING','CANCELLED','EXPIRED')`, `Cancelled_At` | Booking lifecycle + breakdown columns the "My Bookings" page renders |
| `TICKET` | `Price DECIMAL(10,2)` | Locks the price at booking time (so future seat-price changes don't rewrite history) |
| `FANDB_ITEM` | `Description`, `Image`, `Is_Available` | Menu page needs a description and a thumbnail |
| `BOOKING_FANDB` | `Unit_Price` | Price-at-booking-time, same reason as Ticket.Price |
| `PROMOTION` | `Discount_Percent`, `Owner_ID`, `Is_Used`, `Is_Employee_Only`, `Note`, `Created_At` | Personal vouchers from cancellations + the staff-only weekly promo |

### Tables I added — none collide with yours

| Table | Why |
|---|---|
| `LOYALTY_TRANSACTION` | Audit ledger of every points earn/spend (your `CUSTOMER.Loyalty_Points` is the running balance; this is the history) |
| `EMPLOYEE_PROMO_USAGE` | Enforces "1 use per ISO week per employee" for the staff promo code |
| `SEAT_HOLD` | Transient 5-minute holds during the booking flow (so two users don't fight over the same seat) |

### Procedures I added (in `02_procedures.sql`, marked `[+EXT]`)

| Procedure / function | What it does |
|---|---|
| `UsernameExists(username)` | Mirrors `EmailExists` for the username field |
| `CreateCustomerEx(...)` / `CreateStaffEx(...)` | Same as your `CreateCustomer`/`CreateStaff` but accept `username` + `age` |
| `GetNowShowingMovies()` | List of active movies with at least one upcoming showtime |
| `GetSeatMap(showtime_id)` | Seat list with status `available` / `booked` / `held` (joins `SEAT ⨯ TICKET ⨯ SEAT_HOLD`) |
| `GetUserBookings(user_id)` | A user's bookings with movie/cinema/showtime info attached |
| `ArchiveExpiredShowtimes()` | Cleanup job — flips `Is_Archived` for past showtimes |
| `HideMoviesWithoutShowtimes()` | Cleanup job — flips `Is_Active` for movies with no upcoming showings |
| `MarkExpiredBookings()` | Cleanup job — sets `Status='EXPIRED'` for past bookings |
| `PurgeExpiredSeatHolds()` | Cleanup job — drops seat-holds whose TTL has passed |

### Triggers I added (`[+EXT]`)

| Trigger | Behavior |
|---|---|
| `BeforeInsertUser` (your original, extended) | Lowercases email, trims names, **auto-fills Username from email's local-part if NULL or empty** (so your `test.sql` direct INSERTs still work). Still rejects passwords < 6 chars. |
| `AfterInsertTicket` | Recomputes `BOOKING.Seat_Total` and `BOOKING.Total_Amount` after a TICKET row is inserted (safety net for direct `CALL MakeBooking()` calls) |

---

## 5. How to use it

### One-time setup
```bash
# 1. Install MySQL (macOS)
brew install mysql && brew services start mysql

# 2. Load the unified schema
mysql -u root -p < backend/sql/01_schema.sql
mysql -u root -p CineBook < backend/sql/02_procedures.sql

# 3. Install Python deps
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 4. Edit backend/.env so DATABASE_URL has the right MySQL password

# 5. Seed sample data (cinemas, movies, showtimes, demo users)
python seed.py
```

### Running
```bash
# In one terminal — backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# In another terminal — frontend
npm install
npm run dev
```

### Verifying your original SQL still works
```bash
# Open a MySQL shell pointed at CineBook
mysql -u root -p CineBook

# Then paste from /test.sql — every command in your original test
# script runs against the unified schema unchanged.
```
