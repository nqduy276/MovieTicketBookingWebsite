# MySQL stored-procedure logic  vs.  SQLite/Python logic — full comparison

This document compares the **two implementations** of the same booking system
that now live in this repo:

| | **SQL side** (course exercise) | **Python side** (original FastAPI backend) |
|---|---|---|
| Files | `create_tables.sql`, `database_logic.sql`, `database_logic_P2.sql`, `database_logic_P4.sql`, `test.sql` | `backend/app/models/`, `backend/app/routers/`, `backend/app/jobs/`, `backend/seed.py` |
| Engine | MySQL 8 | SQLite (now switched to MySQL — see CHANGES.md) |
| Where the logic lives | **Stored procedures, functions, triggers** inside the DB | **Application code** (Python) on top of the DB |
| Where the *data* lives | Tables defined in MySQL (`CINEUSER`, `MOVIE`, …) | Tables defined by SQLAlchemy ORM (`users`, `movies`, …) |

The two systems were **independently designed** — they end up modelling the
same domain (cinema booking) but with different table names, different
column counts, and different places to put business logic. This file maps
each behavior side-by-side so you can see exactly what overlaps and what
each side has on its own.

> Quick legend used throughout:
> * **SQL** = the stored-procedure / function / trigger version
> * **PY** = the Python/SQLAlchemy version
> * ✅ = present, ❌ = absent, ➖ = partial

---

## 1. Schema — table for table

The two designs cover the same entities but with different normalization
choices. Below, each row shows what the SQL side calls it vs. what the
Python side called it.

| Concept | SQL side (MySQL) | PY side (original SQLite) | Major design difference |
|---|---|---|---|
| User base | `CINEUSER` (Email/Password/First_Name/Last_Name) | `users` (single table with role enum) | SQL splits into base + subtypes; PY uses a single table with a `role` column |
| Customer subtype | `CUSTOMER` (Date_of_Birth, Loyalty_Points) | (merged into `users.loyalty_points`, `users.age`) | SQL is normalized; PY stores `loyalty_points` directly on the user |
| Staff subtype | `STAFF` (Job_Role, Manager_ID) | (merged into `users.role = "employee"`) | SQL has a self-referencing manager hierarchy; PY has none |
| Phones | `USER_PHONE` (multi-valued, composite PK) | `users.phone` (single string column) | SQL allows multiple numbers per user; PY allows only one |
| Cinema | `THEATER_COMPLEX` (Name, Street, District, City, Manager_ID) | `cinemas` (name, address, city) | SQL has a normalized address + a complex manager; PY just stores the address as one string |
| Auditorium | `AUDITORIUM` (Room_Name, Screen_Type, Complex_ID) | (no separate table — `Showtime.room` is just a free-text column) | SQL models the room as a real entity with a screen type; PY treats it as metadata |
| Seats | `SEAT` (composite PK Room_ID + Seat_No, weak entity) | `seats` (auto-increment id, tied to a specific showtime) | **SQL: seats live in the room**, reused across all showtimes. **PY: seats are duplicated per showtime** (so a 6-cinemas × 3-days × 3-slots × 80-seats run = 4,320 seat rows in PY for the same data SQL stores in 80 rows). |
| Movie | `MOVIE` (Title, Duration, Age_Restriction) | `movies` (title, title_vi, description, image, trailer, director, cast, …) | PY has many display fields; SQL has only the strict catalog data |
| Genre | `MOVIE_GENRE` (multi-valued, composite PK) | `movies.genre` (single string) | SQL allows N genres per movie; PY only one |
| Showtime | `SHOWTIME` (Start_Time, End_Time, Movie_ID, Room_ID) | `showtimes` (start_time only, base_price, is_archived) | SQL captures end-time explicitly; PY infers it from movie duration |
| Booking | `BOOKING` (Booking_Date, Total_Amount, User_ID) | `bookings` (status enum, code, breakdown columns) | PY tracks lifecycle state (UPCOMING/CANCELLED/EXPIRED) + breakdown columns; SQL keeps booking minimal and computes totals via functions |
| Ticket / line item | `TICKET` (composite PK, ternary B↔S↔Seat) | `booking_seats` (separate auto-id table linking booking→seat) | SQL uses a true ternary relationship (Booking + Showtime + Seat); PY uses a join table to its own per-showtime seats |
| F&B item | `FANDB_ITEM` (Name, Price, Category) | `food_items` (name, description, image, is_available) | Same idea, different fields |
| F&B in booking | `BOOKING_FANDB` | `booking_foods` | Same |
| Promo | `PROMOTION` (Code, Discount_Value, Expiration_Date) | `promo_codes` (discount_amount OR discount_percent, owner_id, is_used, …) | SQL collapses both into a single `Discount_Value` column; PY tracks ownership and used-state |
| Promo applied to a booking | `BOOKING_PROMO` (allows multiple promos per booking) | `bookings.promo_code` (a single string column) | SQL allows stacking; PY allows only one |
| Loyalty audit | (none — only the `Loyalty_Points` integer on `CUSTOMER`) | `loyalty_transactions` (audit table with reasons + signed deltas) | PY keeps a full ledger; SQL only stores the running balance |
| Employee promo throttle | (none) | `employee_promo_usages` (1-use-per-ISO-week tracking) | Only PY enforces "max 1 use per week" |
| Seat hold (during checkout) | (none) | (none in original PY) | New in the unified schema only |

> **Net schema gap**:
> the SQL design is a **cleaner relational model** (true subtype tables,
> weak entity for seats, ternary for tickets, multi-valued attributes via
> separate tables); the Python design is **denormalized for application
> convenience** (everything the UI needs hangs off one table per
> entity).

---

## 2. Behavior — feature by feature

### 2.1 User registration

| | SQL | PY |
|---|---|---|
| Where | `CreateCustomer(...)` / `CreateStaff(...)` stored procedures (`database_logic.sql`) | `routers/auth.py` `register()` endpoint |
| Email-exists check | `EmailExists(p_email)` function inside the proc; `SIGNAL '45000'` if duplicate | `db.query(User).filter(...).first()` inside Python; raises `HTTPException(400)` |
| Trim / lowercase | `BeforeInsertUser` trigger — `LOWER(NEW.Email)`, `TRIM(NEW.First_Name)` | (none) |
| Password length | `BeforeInsertUser` trigger — `LENGTH(NEW.Password) < 6` rejects | Pydantic schema `min_length=6` rejects |
| Password storage | **plain text** (per the original procedure) | **bcrypt hash** (`hash_password()`) |
| Outcome | Inserts into `CINEUSER` + `CUSTOMER`/`STAFF` (subtype) | Inserts into `users` with `role` set |
| ✅ Atomicity | ✅ — the whole proc is one transaction by default | ✅ — Python uses `db.commit()` |

### 2.2 Login

| | SQL | PY |
|---|---|---|
| Where | `LoginUser(p_email, p_password)` proc | `routers/auth.py` `login()` |
| Inputs | email + password | **username + email + password** (per CGV-style spec) |
| Verification | plain-text equality check | bcrypt `verify_password()` |
| Output | returns `User_ID` | returns a JWT bearer token bound to `username` |

> The two cannot be used together — bcrypt-hashed passwords (PY) won't
> match the plain comparison (SQL) inside `LoginUser`.

### 2.3 Listing theaters / showtimes

| | SQL | PY |
|---|---|---|
| Theaters showing a movie on a date | `CALL GetTheatersByMovieAndDate('Lật Mặt 7', '2026-05-02')` (P2) | `GET /api/cinemas/by-movie/{movie_id}` (joins `Cinema` ⨯ `Showtime`) |
| Theaters AND a specific complex | `CALL GetShowtimesByMovieTheaterAndDate(...)` (P2) | `GET /api/showtimes?movie_id=&cinema_id=&date=` |
| Filters past showtimes | ✅ — `st.Start_Time > CURRENT_TIMESTAMP` | ✅ — `Showtime.start_time > now` |

### 2.4 Seat map

| | SQL | PY |
|---|---|---|
| "Booked seats" | `GetBookedSeats(p_Showtime_ID)` — joins `TICKET ↔ SEAT` (P2) | `Seat.status == BOOKED` (column on the per-showtime row) |
| "Available seats" | `GetAvailableSeats(p_Showtime_ID)` — `LEFT JOIN TICKET … WHERE t.Seat_No IS NULL` (P2) | `Seat.status == AVAILABLE` |
| Held (transient) seats | ❌ | ❌ in the original PY (added in the unified schema as `SEAT_HOLD`) |
| Returns row+number? | ❌ — returns `Seat_No` ("A1") and lets the caller split | ✅ — exposes `row` and `number` separately |

### 2.5 Booking creation

The most interesting comparison.

| | SQL (`MakeBooking`, P4) | PY (`POST /api/bookings`) |
|---|---|---|
| Inputs | `(user_id, showtime_id, seats_json, fandb_json, promo_code)` | JSON body with `showtime_id`, `seat_ids[]`, `food_items[]`, `promo_code` |
| Seat reference | `seats_json = '["A1","A2"]'` (literal seat numbers) | `seat_ids = [123, 124]` (auto-increment ids) |
| Showtime is in the future | (not enforced) | ✅ enforced (`HTTPException(400)`) |
| Seat exists in the room | ✅ — looks up `SEAT WHERE Room_ID = ? AND Seat_No = ?`; `SIGNAL` on miss | ✅ — checks via SQLAlchemy |
| Seat not already sold for this showtime | ❌ in the proc itself — relies on the UNIQUE key on `TICKET (Showtime_ID, Room_ID, Seat_No)` to error out | ✅ — explicit query before insert |
| Sums seat prices | ✅ — loops through JSON, queries `SEAT.Price` | ✅ — `sum(s.price for s in seats)` |
| Sums F&B | ✅ — loops through JSON | ✅ — Python loop |
| Promo discount | written in `Calculate_Valid_Discount(p_Booking_ID)` (P4) — handles % vs fixed amount based on `Discount_Value <= 100` | written in `routers/promo.py:calculate_discount` — uses two separate columns `discount_amount` and `discount_percent` |
| Loyalty points | written in `Calc_Loyalty_Points_For_Booking(p_Booking_ID)` (P4) — **0.05 pts per 1000 VND** for tickets, **0.10 pts per 1000 VND** for F&B; staff get 0 | written in `routers/bookings.py` — flat `total * LOYALTY_POINTS_PER_VND` (1 pt per 10000 VND); staff get 0 |
| Atomicity | ✅ — `START TRANSACTION` … `COMMIT` with an `EXIT HANDLER FOR SQLEXCEPTION` that rolls back | ✅ — single `db.commit()` at the end; uncaught exceptions roll back |
| Cancellation refund as voucher | ❌ | ✅ — issues a `PromoCode` worth the booking total |
| Booking lifecycle (UPCOMING/CANCELLED/EXPIRED) | ❌ | ✅ |
| Loyalty audit log | ❌ — only the running total in `CUSTOMER.Loyalty_Points` | ✅ — `LoyaltyTransaction` row per change |

> **Different loyalty math** — note the rates differ by 50× and the
> SQL version splits ticket vs F&B at different rates. The unified
> backend keeps the SQL math (it lives in the function) but the Python
> code path uses its own rate; you can pick one or wire the Python path
> to call `Calc_Loyalty_Points_For_Booking`.

### 2.6 Cleanup / background jobs

| | SQL | PY |
|---|---|---|
| Archive past showtimes | `CALL ArchiveExpiredShowtimes()` (added in the unified procs) | `jobs/cleanup.py:archive_expired_showtimes` |
| Hide movies with no upcoming showtimes | `CALL HideMoviesWithoutShowtimes()` | `jobs/cleanup.py:hide_movies_without_showtimes` |
| Mark expired bookings | `CALL MarkExpiredBookings()` | (derived on read in PY — no DB row update) |
| Drop expired seat-holds | `CALL PurgeExpiredSeatHolds()` | (none in original) |
| Scheduler | (must be invoked from the app) | APScheduler — every 5 min from the FastAPI lifespan |

### 2.7 Triggers / data hygiene

| | SQL | PY |
|---|---|---|
| Lowercase email | `BeforeInsertUser` trigger | (none — relies on user input) |
| Trim names | `BeforeInsertUser` trigger | (none) |
| Block password < 6 chars | `BeforeInsertUser` trigger | Pydantic validation |
| Block deletion of `admin@gmail.com` | `BeforeDeleteUser` trigger | (none) |
| Auto-recompute booking totals after ticket insert | `AfterInsertTicket` trigger (added in unified procs) | (none — Python computes totals upfront) |

### 2.8 Constraints & integrity

| | SQL | PY |
|---|---|---|
| Email format | `CHK_User_Email CHECK (Email LIKE '%_@__%.__%')` | `EmailStr` Pydantic type |
| Loyalty ≥ 0 | `CHK_Customer_Points CHECK (Loyalty_Points >= 0)` | (Python clamps with `max(0, …)`) |
| Seat price ≥ 0 | `CHK_Seat_Price CHECK (Price >= 0)` | (none) |
| Booking total ≥ 0 | `CHK_Booking_Total CHECK (Total_Amount >= 0)` | (Python clamps with `max(0, …)`) |
| End_Time > Start_Time | `CHK_Showtime_Time` | (none) |
| F&B quantity > 0 | `CHK_Fandb_Quantity` | Python check |
| Manager hierarchy (no orphan staff) | `STAFF.Manager_ID FK ON DELETE SET NULL` | (none) |
| One seat per showtime | `UNIQUE (Showtime_ID, Room_ID, Seat_No)` on TICKET | (depends on per-showtime seats existing) |

> SQL pushes invariants into the database; PY pushes them into the
> application layer. Both work, but **the SQL design is harder to
> bypass** (a script that talks directly to MySQL still respects the
> CHECKs and triggers).

---

## 3. Strengths and weaknesses at a glance

### What the **SQL side** does better
1. **Cleaner relational design.** True subtype tables, weak entities, ternary relationships, multi-valued attributes are modelled correctly — this is a textbook ER diagram.
2. **Integrity moves into the DB.** `CHECK` constraints, triggers, FKs catch bad data even when the app misbehaves.
3. **Tighter loyalty / discount math.** `Calc_Loyalty_Points_For_Booking` and `Calculate_Valid_Discount` are pure SQL functions, so they always agree with whatever wrote the rows.
4. **Useful for direct DB demos.** You can call `CALL MakeBooking(...)` straight from MySQL Workbench and see the whole booking flow run.
5. **Less duplication.** Seats live once per room (not once per showtime).

### What the **Python side** does better
1. **Booking lifecycle.** UPCOMING / CANCELLED / EXPIRED status, cancellation refund vouchers, loyalty audit log, employee weekly limit, JWT login — none of these exist on the SQL side.
2. **Frontend-friendly fields.** Title_VI, image, trailer, description, cast, director — the things a CGV-style UI actually displays.
3. **bcrypt password hashing.** The SQL `LoginUser` compares plain text.
4. **Better error messages.** Returns structured HTTP errors that the FE can show; SQL `SIGNAL` is hard to surface to a UI.
5. **Background jobs already wired.** APScheduler runs cleanup every 5 minutes.

### Where they overlap (do the same thing twice)
- **EmailExists** ↔ Python `db.query(User).filter(email=...)`
- **GetBookedSeats / GetAvailableSeats** ↔ Python's seat-map endpoint
- **MakeBooking** ↔ Python `POST /api/bookings`
- **GetTheatersByMovieAndDate** ↔ Python `/api/cinemas/by-movie/...`

In the unified backend, the Python side **delegates** to the SQL where
it makes sense (seat map, cleanup jobs, registration triggers) and
keeps its own logic where the SQL side has gaps (booking status,
loyalty audit log, JWT auth, voucher refund).

---

## 4. Quick file map

```
project root
├── create_tables.sql              ← Original SQL exercise: schema (MySQL)
├── database_logic.sql             ← Original SQL exercise: P1 — user mgmt
├── database_logic_P2.sql          ← Original SQL exercise: P2 — query procs
├── database_logic_P4.sql          ← Original SQL exercise: P4 — booking flow
├── test.sql                       ← Original SQL exercise: example calls
├── main.sql                       ← Empty placeholder
│
└── backend/
    ├── sql/
    │   ├── 01_schema.sql          ← UNIFIED schema (originals + [+EXT] cols/tables)
    │   └── 02_procedures.sql      ← UNIFIED procs (originals + [+EXT] procs)
    ├── app/                       ← FastAPI / SQLAlchemy code (Python side)
    └── seed.py                    ← Sample data loader (uses CreateCustomerEx)
```

The **originals at the project root are unchanged** — you can still
hand them in for the database course. The `backend/sql/` folder is the
concrete instance the live backend runs against, with everything from
the originals plus what the FastAPI app needs.

---

## 5. TL;DR

If you only had to remember three things:

1. **The SQL exercise = relational design done right; the Python side = a working web app.**
2. **The unified backend keeps both worlds:** the SQL files at the repo root are the academic deliverable; `backend/sql/` is the same plus the bits the app needs.
3. **Whenever both sides have the same feature** (seat map, booking creation, loyalty math), the Python code **calls** the SQL procedure rather than duplicating it.
