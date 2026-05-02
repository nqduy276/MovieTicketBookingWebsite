"""
Background cleanup jobs.

Each maintenance task is an SQL stored procedure (sql/02_procedures.sql);
this module just calls them.
"""
import logging
from sqlalchemy import text

from app.database import SessionLocal

log = logging.getLogger("cleanup")


def run_cleanup():
    db = SessionLocal()
    try:
        # db.execute(text("CALL ArchiveExpiredShowtimes()"))
        # db.execute(text("CALL HideMoviesWithoutShowtimes()"))
        # db.execute(text("CALL MarkExpiredBookings()"))
        # db.execute(text("CALL PurgeExpiredSeatHolds()"))
        # db.commit()
        log.info("cleanup: skipped (procedures not implemented)")
    except Exception as e:
        db.rollback()
        log.exception("cleanup failed: %s", e)
    finally:
        db.close()
