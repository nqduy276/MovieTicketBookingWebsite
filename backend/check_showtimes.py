import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.showtime import Showtime
from app.models.cinema import TheaterComplex, Auditorium
from app.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

now = datetime.utcnow()
q = db.query(Showtime).filter(Showtime.Is_Archived == False, Showtime.Start_Time > now)

print("Total future showtimes in DB:", q.count())
for s in q.all():
    print(s.Showtime_ID, s.Start_Time, s.Movie_ID)

