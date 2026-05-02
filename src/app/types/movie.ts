// Types aligned with SQL schema (create_tables.sql).
// These are the *internal* FE types — used only by deprecated data files.

export interface Movie {
  id: string;
  title: string;
  titleVi: string;
  description: string;
  genre: string;               // from MOVIE_GENRE: 'Action' | 'Comedy' | 'Thriller' | 'Romance'
  duration: number;            // from MOVIE.Duration (minutes)
  rating: string;              // derived from MOVIE.Age_Restriction
  image: string;
  releaseDate: string;
  director: string;
  cast: string[];
  trailer?: string;
}

export interface Showtime {
  id: string;
  movieId: string;
  date: string;
  time: string;
  cinema: string;
  room: string;
  price: number;
  availableSeats: number;
}

// SQL SEAT.Seat_Type is ENUM('Standard', 'VIP', 'Sweetbox')
export interface Seat {
  id: string;
  row: string;
  number: number;
  type: 'standard' | 'vip' | 'sweetbox';
  price: number;
  status: 'available' | 'selected' | 'booked';
}

export interface Booking {
  id: string;
  movie: Movie;
  showtime: Showtime;
  seats: Seat[];
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}
