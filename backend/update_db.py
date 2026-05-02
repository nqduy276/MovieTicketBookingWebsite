import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import text
from app.database import engine

def main():
    try:
        with engine.begin() as conn:
            print("Connected. Dropping and recreating DB...")
            # We can't drop database if we are connected to it. Let's just alter table.
            conn.execute(text("ALTER TABLE MOVIE ADD COLUMN Image VARCHAR(255);"))
            print("Image column added!")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
