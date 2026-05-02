"""FastAPI entry point — Movie Ticket Booking backend (CineBook / MySQL)."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import check_db
from app.jobs.cleanup import run_cleanup

from app.routers import (
    auth, movies, cinemas, showtimes, seats, food, promo, bookings, loyalty,
)

logging.basicConfig(level=logging.INFO)

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_db()                     # validates schema is loaded
    run_cleanup()                  # one immediate sweep
    scheduler.add_job(run_cleanup, "interval", minutes=5,
                      id="cleanup_job", replace_existing=True)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="CineBook API",
    description="Movie Ticket Booking backend — MySQL CineBook schema.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root():
    return {"name": "CineBook API", "version": "2.0.0", "docs": "/docs"}


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(cinemas.router)
app.include_router(showtimes.router)
app.include_router(seats.router)
app.include_router(food.router)
app.include_router(promo.router)
app.include_router(bookings.router)
app.include_router(loyalty.router)
