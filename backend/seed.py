"""
Seed script for CineBook (MySQL) — strict /create_tables.sql schema.

Loads:
  * 4 demo accounts (2 customers, 2 staff) via CreateCustomer / CreateStaff.
    Passwords are bcrypt-hashed before being passed in (the BeforeInsertUser
    trigger only validates LENGTH >= 6 and bcrypt hashes are ~60 chars).
  * 6 movies + a primary genre.
  * 3 theater complexes, each with 1-2 auditoriums, with an 8x10 seat grid
    (Standard / VIP / Sweetbox tiers).
  * Showtimes for the next 7 days.
  * 4 F&B items.
  * Two promo codes (employee-only STAFF2026 and public WELCOME10).
"""
from datetime import datetime, date, timedelta, timezone
import random

from sqlalchemy import text
from app.database import SessionLocal
from app.models.user import CineUser
from app.models.movie import Movie, MovieGenre
from app.models.cinema import TheaterComplex, Auditorium
from app.models.showtime import Showtime
from app.models.seat import Seat
from app.models.food import FandbItem
from app.models.promo import Promotion, PromotionWallet
from app.models.user import Customer, Staff



MOVIES = [
    ("Avengers: Hồi Kết", 181, 13, "Action"),
    ("Inception: Kẻ Đánh Cắp Giấc Mơ", 148, 16, "Thriller"),
    ("Những Mảnh Ghép Cảm Xúc 2", 100, 0, "Comedy"),
    ("Ký Sinh Trùng", 132, 18, "Thriller"),
    ("Hoppers", 105, 0, "Comedy"),
    ("Despicable Me", 95, 0, "Comedy"),
    ("F1 The Movie", 155, 16, "Action"),
    ("Fast X", 141, 16, "Action"),
    ("Avengers: Age of Ultron", 141, 13, "Action"),
    ("Interstellar", 169, 13, "Thriller"),
    ("The Dark Knight", 152, 16, "Action"),
    ("Avatar", 162, 13, "Action"),
    ("Avatar: The Way of Water", 192, 13, "Action"),
    ("Avatar: Fire and Ash", 197, 13, "Action"),
    ("The Lord of the Rings: The Return of the King", 181, 13, "Action"),
]

COMPLEXES = [
    ("CGV Sư Vạn Hạnh", "11 Sư Vạn Hạnh", "Quận 10", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("Cinema 3", "2D"), ("IMAX 1", "IMAX")]),
    ("CGV Vincom Đồng Khởi", "72 Lê Thánh Tôn", "Quận 1", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Landmark 81", "720A Điện Biên Phủ", "Bình Thạnh", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "2D"), ("Cinema 3", "3D"),
      ("Cinema 4", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Crescent Mall", "101 Tôn Dật Tiên", "Quận 7", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Aeon Mall Tân Phú", "30 Bờ Bao Tân Thắng", "Tân Phú", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "2D"), ("Cinema 3", "3D")]),
    ("CGV Pearl Plaza", "561A Điện Biên Phủ", "Bình Thạnh", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Hùng Vương Plaza", "126 Hồng Bàng", "Quận 5", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D")]),
    ("CGV Vivo City", "1058 Nguyễn Văn Linh", "Quận 7", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Pandora City", "1/1 Trường Chinh", "Tân Phú", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("Cinema 3", "2D")]),
    ("CGV Liberty Citypoint", "59-61 Pasteur", "Quận 1", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D")]),
    ("CGV Parkson Cantavil", "1 Song Hành", "Thủ Đức", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("Cinema 3", "2D")]),
    ("CGV Giga Mall", "240-242 Phạm Văn Đồng", "Thủ Đức", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
    ("CGV Aeon Mall Bình Tân", "1 Đường số 17A", "Bình Tân", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("Cinema 3", "2D")]),
    ("CGV Co.opmart Foodcosa", "304A Quang Trung", "Gò Vấp", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D")]),
    ("CGV Hoàng Văn Thụ", "Sân bay Tân Sơn Nhất", "Tân Bình", "TP.HCM",
     [("Cinema 1", "2D"), ("Cinema 2", "3D"), ("IMAX 1", "IMAX")]),
]

FOODS = [
    ("Combo Bắp Nước", 89000, "Combo"),
    ("Combo Đôi", 159000, "Combo"),
    ("Snack Mix", 49000, "Snack"),
    ("Coca-Cola", 35000, "Drink"),
]


def _seat_layout(room_id: int, base_price: int = 80000):
    rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
    seats = []
    for r in rows:
        for n in range(1, 11):
            if r == "H":
                seat_type, price = "Sweetbox", base_price * 2
            elif r in ("F", "G"):
                seat_type, price = "VIP", int(base_price * 1.25)
            else:
                seat_type, price = "Standard", base_price
            seats.append({
                "Room_ID": room_id, "Seat_No": f"{r}{n}",
                "Seat_Type": seat_type, "Price": price,
            })
    return seats


def _create_customer(db, email, password, first_name, last_name, dob):
    db.execute(
        text("CALL CreateCustomer(:e, :p, :fn, :ln, :dob)"),
        {"e": email, "p": password, "fn": first_name, "ln": last_name, "dob": dob},
    )


def _create_staff(db, email, password, first_name, last_name, role="Staff"):
    db.execute(
        text("CALL CreateStaff(:e, :p, :fn, :ln, :r, :m)"),
        {"e": email, "p": password, "fn": first_name, "ln": last_name, "r": role, "m": None},
    )


def main():
    db = SessionLocal()
    try:
        # --- Users -------------------------------------------------------
        if not db.query(CineUser).filter(CineUser.Email == "khachhang@cgv.vn").first():
            _create_customer(db, "duy@admin.com", "123456",
                             "Nguyễn", "Quốc Duy", date(2005, 6, 27))
            
            _create_staff(db, "nhanvien@cgv.vn", "123456",
                          "Trần", "Nhân Viên", "Staff")

            _create_customer(db, "customer@example.com", "password123",
                             "Duy", "Nguyen", date(1990, 1, 15))
            
            _create_staff(db, "staff@example.com", "password123",
                          "Khang", "Tran", "Staff")
        db.commit()

        # --- Movies ------------------------------------------------------
        existing_titles = {m.Title for m in db.query(Movie).all()}
        for title, dur, age, genre in MOVIES:
            if title in existing_titles:
                continue
            m = Movie(Title=title, Duration=dur, Age_Restriction=age)
            db.add(m)
            db.flush()
            db.add(MovieGenre(Movie_ID=m.Movie_ID, Genre=genre))
        db.commit()

        # --- Theaters / auditoriums / seats ------------------------------
        existing_complex_names = {c.Name for c in db.query(TheaterComplex).all()}
        for name, street, district, city, audits in COMPLEXES:
            if name in existing_complex_names:
                continue
            c = TheaterComplex(Name=name, Street=street, District=district, City=city)
            db.add(c)
            db.flush()
            for room_name, screen in audits:
                a = Auditorium(Room_Name=room_name, Screen_Type=screen, Complex_ID=c.Complex_ID)
                db.add(a)
                db.flush()
                for s in _seat_layout(a.Room_ID):
                    db.add(Seat(**s))
        db.commit()

        # --- Showtimes (next 7 days) -------------------------------------
        # Every movie gets showtimes in every auditorium, every day.
        # Movies that already have any showtime are skipped so re-runs only
        # add shows for newly-seeded movies.
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        audits = db.query(Auditorium).all()
        for movie in db.query(Movie).all():
            already = db.query(Showtime).filter(Showtime.Movie_ID == movie.Movie_ID).count()
            if already > 0:
                continue
            for audit in audits:
                for day_offset in range(7):
                    num_shows = random.randint(4, 6)
                    hours = sorted(random.sample(range(8, 24), num_shows))
                    for hour in hours:
                        mins = random.choice([0, 15, 30, 45])
                        start = today + timedelta(days=day_offset, hours=hour, minutes=mins)
                        end = start + timedelta(minutes=movie.Duration + 15)
                        db.add(Showtime(
                            Movie_ID=movie.Movie_ID,
                            Room_ID=audit.Room_ID,
                            Start_Time=start,
                            End_Time=end,
                        ))
        db.commit()

        # --- F&B ---------------------------------------------------------
        for name, price, cat in FOODS:
            if not db.query(FandbItem).filter(FandbItem.Name == name).first():
                db.add(FandbItem(Name=name, Price=price, Category=cat))
        db.commit()

        # --- Promotions --------------------------------------------------
        # Catalog (PROMOTION) + per-user codes (PROMOTION_WALLET).
        # Convention: Discount_Value <= 100 → percent, > 100 → flat VND.
        def _ensure_promotion(name: str, discount_value: float, expires: date) -> Promotion:
            promo = db.query(Promotion).filter(Promotion.Promotion_Name == name).first()
            if promo:
                return promo
            promo = Promotion(
                Promotion_Name=name,
                Discount_Value=discount_value,
                Expiration_Date=expires,
            )
            db.add(promo)
            db.flush()
            return promo

        def _issue_code(code: str, promotion_id: int, owner_id: int):
            if db.query(PromotionWallet).filter(PromotionWallet.Code == code).first():
                return
            db.add(PromotionWallet(Code=code, Promotion_ID=promotion_id, Owner_ID=owner_id))

        staff_promo = _ensure_promotion("Staff Discount 50%", 50, date(2099, 12, 31))
        welcome_promo = _ensure_promotion(
            "Welcome 10%", 10, date.today() + timedelta(days=180)
        )

        # STAFF2026 → every staff. Code is per-user since PROMOTION_WALLET.Code is PK.
        for s in db.query(Staff).all():
            _issue_code(f"STAFF2026-{s.User_ID}", staff_promo.Promotion_ID, s.User_ID)

        # WELCOME10 → every customer.
        for c in db.query(Customer).all():
            _issue_code(f"WELCOME10-{c.User_ID}", welcome_promo.Promotion_ID, c.User_ID)

        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
