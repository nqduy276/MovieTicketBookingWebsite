import sys
import sqlalchemy
from sqlalchemy import create_engine, text
try:
    engine = create_engine("mysql+pymysql://root:@localhost:3306/CineBook")
    with engine.connect() as conn:
        print("Connected successfully!")
        conn.execute(text("SELECT 1;"))
except Exception as e:
    print("Connection failed:", e)
