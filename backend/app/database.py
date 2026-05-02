"""
Database connector — MySQL (CineBook).

The schema is created out-of-band by running sql/01_schema.sql and
sql/02_procedures.sql against MySQL. We DO NOT use Base.metadata.create_all()
anymore — the SQL files are the source of truth.

Switch databases by editing DATABASE_URL in .env.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db():
    """Probe the database on startup. Raises a clear error if MySQL is down
    or if the schema hasn't been loaded yet."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("SELECT 1 FROM CINEUSER LIMIT 1"))
        except Exception as e:
            raise RuntimeError(
                "Could not query CINEUSER table. Make sure MySQL is running "
                "and that you have run:\n"
                "  mysql -u root -p < sql/01_schema.sql\n"
                "  mysql -u root -p CineBook < sql/02_procedures.sql\n"
                f"Original error: {e}"
            ) from e
