import { useLocation, useNavigate, Link } from 'react-router';
import { useEffect } from 'react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { CheckCircle, Star, Ticket } from 'lucide-react';
import type { ApiBooking, ApiMovie, ApiCinema } from '../types/api';

interface LocationState {
  booking: ApiBooking;
  movie: ApiMovie;
  cinema: ApiCinema | null;
}

const FALLBACK_POSTER = 'https://placehold.co/200x300/27272a/f97316?text=No+Image';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  useEffect(() => {
    if (!state) navigate('/');
  }, [state, navigate]);

  if (!state) return null;

  const { booking, movie, cinema } = state;
  const titleVi = movie.title_vi || movie.title;
  const start = booking.showtime_start ? new Date(booking.showtime_start) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-full mb-4 ring-2 ring-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Đặt vé thành công!</h1>
            <p className="text-zinc-400">Mã đặt vé của bạn đã được lưu vào hệ thống.</p>
            {booking.loyalty_points_awarded > 0 && (
              <p className="text-sm mt-2 text-amber-500 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-500" /> +{booking.loyalty_points_awarded.toFixed(1)} điểm thưởng
              </p>
            )}
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
              <h2 className="text-xl font-semibold text-white">Thông tin vé</h2>
              <span className="text-red-500 font-mono font-bold">{booking.code}</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <img src={movie.image || FALLBACK_POSTER} alt={titleVi} className="w-24 h-36 object-cover rounded-lg ring-2 ring-red-600/30" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{titleVi}</h3>
                  <p className="text-zinc-400 text-sm mb-2">{movie.title}</p>
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>{movie.genre || ''} {movie.duration ? `• ${movie.duration} phút` : ''} {movie.rating ? `• ${movie.rating}` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/80 rounded-xl p-4 space-y-2 border border-zinc-800/50">
                <div className="flex justify-between"><span className="text-zinc-400">Rạp chiếu</span><span className="text-white">{cinema?.name || booking.cinema_name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Suất chiếu</span><span className="text-white">{start ? start.toLocaleString('vi-VN') : ''}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Ghế ngồi</span><span className="text-white">{booking.seats.map(s => `${s.row}${s.number}`).join(', ')}</span></div>
              </div>

              {booking.foods.length > 0 && (
                <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50">
                  <h4 className="font-semibold text-white mb-2">Bắp nước</h4>
                  {booking.foods.map((f, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{f.name || `#${f.food_id}`} × {f.quantity}</span>
                      <span className="text-white">{(f.unit_price * f.quantity).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Tiền vé</span><span className="text-white">{booking.seat_total.toLocaleString('vi-VN')}đ</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Bắp nước</span><span className="text-white">{booking.food_total.toLocaleString('vi-VN')}đ</span></div>
                {booking.discount > 0 && (
                  <div className="flex justify-between"><span className="text-zinc-400">Giảm ({booking.promo_code})</span><span className="text-emerald-400">-{booking.discount.toLocaleString('vi-VN')}đ</span></div>
                )}
                <div className="border-t border-zinc-800/50 mt-3 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Tổng cộng</span>
                  <span className="text-red-500 text-xl font-bold">{booking.total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/my-bookings" className="flex-1">
              <Button variant="outline" className="w-full border-zinc-800/50 text-white hover:bg-zinc-900 rounded-lg">
                <Ticket className="w-4 h-4 mr-2" />
                Xem vé của tôi
              </Button>
            </Link>
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 rounded-lg font-semibold"
            >
              Về trang chủ
            </Button>
          </div>

          <div className="mt-8 bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-5">
            <h4 className="text-red-500 font-semibold mb-2">Lưu ý</h4>
            <ul className="text-sm text-zinc-400 space-y-1.5">
              <li>• Vui lòng đến rạp trước giờ chiếu ít nhất 15 phút</li>
              <li>• Mang theo mã vé hoặc CCCD/CMND khi nhận vé</li>
              <li>• Bạn có thể huỷ vé tại trang "Vé của tôi" — sẽ nhận voucher tương đương (không hoàn tiền)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
