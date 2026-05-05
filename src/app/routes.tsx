import { createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import BookingConfirmation from './pages/BookingConfirmation';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import LoyaltyPage from './pages/LoyaltyPage';
import VouchersPage from './pages/VouchersPage';
import ProfilePage from './pages/ProfilePage';
import AdminPanel from './pages/AdminPanel';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';

export const router = createBrowserRouter([
  { path: '/',                   Component: Home },
  { path: '/login',              Component: Login },
  { path: '/register',           Component: Register },
  { path: '/movie/:id',          Component: MovieDetail },
  {
    path: '/booking/:showtimeId',
    element: (
      <RequireAuth>
        <SeatSelection />
      </RequireAuth>
    ),
  },
  {
    path: '/confirmation',
    element: (
      <RequireAuth>
        <BookingConfirmation />
      </RequireAuth>
    ),
  },
  {
    path: '/my-bookings',
    element: (
      <RequireAuth>
        <MyBookings />
      </RequireAuth>
    ),
  },
  {
    path: '/loyalty',
    element: (
      <RequireAuth>
        <LoyaltyPage />
      </RequireAuth>
    ),
  },
  {
    path: '/vouchers',
    element: (
      <RequireAuth>
        <VouchersPage />
      </RequireAuth>
    ),
  },
  {
    path: '/profile',
    element: (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminPanel />
      </RequireAdmin>
    ),
  },
]);
