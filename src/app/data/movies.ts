// DEPRECATED — this file is no longer used.
// All movie / showtime / seat data is now fetched live from the FastAPI backend
// (see src/app/lib/api.ts and the page components).
//
// Sample CGV branches used by the seed script live in /backend/seed.py.

import type { Movie, Showtime, Seat } from '../types/movie';

export const movies: Movie[] = [];
export const showtimes: Showtime[] = [];
export const generateSeats = (_id: string): Seat[] => [];
