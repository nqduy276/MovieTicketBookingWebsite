// Types matching the FastAPI backend responses (snake_case).
// Aligned with create_tables.sql schema:
//   CINEUSER: User_ID, Email, Password, First_Name, Last_Name, Registration_Date
//   CUSTOMER: Date_of_Birth, Loyalty_Points
//   STAFF: Job_Role, Manager_ID
//   No "username" or "age" columns in the SQL schema.

export type UserRole = 'customer' | 'employee';

export interface User {
  id: number;
  email: string;
  full_name: string;          // derived: First_Name + Last_Name
  first_name: string;
  last_name: string;
  phone?: string | null;      // from USER_PHONE table
  role: UserRole;
  loyalty_points: number;     // from CUSTOMER.Loyalty_Points (0 for staff)
  created_at: string;
  // Legacy FE compat — always null from backend:
  username?: string | null;
  age?: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiMovie {
  id: number;
  title: string;
  duration: number;             // from MOVIE.Duration (minutes)
  age_restriction: number;      // from MOVIE.Age_Restriction
  genre?: string | null;        // first genre from MOVIE_GENRE
  rating?: string | null;       // derived from age_restriction (P/13+/16+/18+)
  // These fields may be null (not in strict SQL schema):
  title_vi?: string | null;
  description?: string | null;
  image?: string | null;
  trailer?: string | null;
  director?: string | null;
  cast?: string | null;
  release_date?: string | null;
  is_active: boolean;
}

export interface ApiCinema {
  id: number;
  name: string;
  address?: string | null;      // derived: Street + District
  city?: string | null;
  street?: string | null;
  district?: string | null;
}

export interface ApiShowtime {
  id: number;
  movie_id: number;
  cinema_id: number;
  room?: string | null;         // from AUDITORIUM.Room_Name
  start_time: string;           // ISO datetime
  end_time?: string | null;     // ISO datetime
  base_price: number;
  is_archived: boolean;
  available_seats?: number | null;
  cinema_name?: string | null;
  movie_title?: string | null;
  type?: string | null;          // from AUDITORIUM.Screen_Type (2D/3D/IMAX/...)
}

// SQL SEAT.Seat_Type is ENUM('Standard', 'VIP', 'Sweetbox')
// Backend lowercases when sending to FE
export type ApiSeatType = 'standard' | 'vip' | 'sweetbox';
export type ApiSeatStatus = 'available' | 'booked' | 'held';

export interface ApiSeat {
  id: number;
  showtime_id: number;
  seat_no: string;              // "A1", "H10" — from SEAT.Seat_No
  row: string;
  number: number;
  type: ApiSeatType;
  price: number;
  status: ApiSeatStatus;
}

export interface ApiFood {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  category: string;             // from FANDB_ITEM.Category
  is_available: boolean;
}

export interface ApiBookingFood {
  food_id: number;
  quantity: number;
  unit_price: number;
  name?: string | null;
}

export type ApiBookingStatus = 'UPCOMING' | 'CANCELLED' | 'EXPIRED';

export interface ApiBooking {
  id: number;
  code: string;
  user_id: number;
  showtime_id: number;
  seat_total: number;
  food_total: number;
  discount: number;
  total: number;
  promo_code?: string | null;
  loyalty_points_awarded: number;
  status: ApiBookingStatus;
  created_at: string;
  cancelled_at?: string | null;
  seats: ApiSeat[];
  foods: ApiBookingFood[];
  movie_title?: string | null;
  cinema_name?: string | null;
  showtime_start?: string | null;
}

export interface ApiPromo {
  id: string;                   // Code is the PK (string, not number)
  code: string;
  discount_value: number;
  discount_amount?: number | null;
  discount_percent?: number | null;
  is_used: boolean;
  is_employee_only: boolean;
  expires_at?: string | null;
  created_at: string;
  note?: string | null;
}

export interface PromoCheckResponse {
  valid: boolean;
  message: string;
  discount_amount: number;
}
