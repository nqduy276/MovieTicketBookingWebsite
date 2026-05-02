import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { apiGet, apiPost } from '../lib/api';
import type { ApiBooking, ApiBookingStatus } from '../types/api';
import { useAuth } from '../lib/auth';
import { CalendarClock, Ticket, Star, AlertCircle } from 'lucide-react';

const statusLabel: Record<ApiBookingStatus, string> = {
  UPCOMING: 'Sắp chiếu',
  CANCELLED: 'Đã huỷ',
  EXPIRED: 'Đã hết hạn',
};
const statusBadge: Record<ApiBookingStatus, string> = {
  UPCOMING: 'bg-emerald-600 hover:bg-emerald-700',
  CANCELLED: 'bg-zinc-700 hover:bg-zinc-700',
  EXPIRED: 'bg-zinc-800 hover:bg-zinc-800',
};

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}
function fmtDate(s?: string | null) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleString('vi-VN');
}

export default function MyBookings() {
  const { user, refresh } = useAuth();
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isCustomer = user?.role === 'customer';

  const load = async () => {
    setLoading(true);
    try {
      const b = await apiGet<ApiBooking[]>('/api/bookings/me');
      setBookings(b);
    } catch (e: any) {
      setError(e?.message || 'Không tải được lịch sử đặt vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id: number) => {
    if (!confirm('Huỷ đặt vé này? Bạn sẽ nhận được voucher có giá trị tương đương (nếu tổng > 0đ).')) return;
    setBusyId(id);
    try {
      await apiPost(`/api/bookings/${id}/cancel`);
      await load();
      await refresh();
    } catch (e: any) {
      alert(e?.detail?.detail || e?.message || 'Huỷ thất bại');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-red-600 rounded-full" />
            <h1 className="text-3xl font-bold text-white">Vé của tôi</h1>
          </div>
          {user && isCustomer && (
            <div className="flex items-center gap-2.5 text-zinc-300 bg-zinc-900/80 border border-zinc-800/50 rounded-xl px-4 py-2.5">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-sm">Điểm thưởng:</span>
              <span className="text-amber-500 font-bold text-lg">{(user.loyalty_points || 0).toFixed(0)}</span>
            </div>
          )}
        </div>

        {/* Bookings list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/80 border border-zinc-800/50 rounded-xl">
            <Ticket className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Bạn chưa có vé nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b.id} className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{b.movie_title || 'Phim'}</h3>
                      <Badge className={statusBadge[b.status]}>{statusLabel[b.status]}</Badge>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {b.cinema_name} • {fmtDate(b.showtime_start)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Mã đặt</p>
                    <p className="font-mono text-red-500 font-semibold">{b.code}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl p-3.5">
                    <p className="text-zinc-500 mb-1 text-xs">Ghế</p>
                    <p className="text-white font-medium">
                      {b.seats.map(s => `${s.row}${s.number}`).join(', ') || '—'}
                    </p>
                    {b.foods.length > 0 && (
                      <>
                        <p className="text-zinc-500 mt-3 mb-1 text-xs">Bắp nước</p>
                        <ul className="text-white">
                          {b.foods.map((f, i) => (
                            <li key={i}>{f.name || `#${f.food_id}`} × {f.quantity}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl p-3.5">
                    <div className="flex justify-between text-zinc-400">
                      <span>Tiền vé</span><span className="text-white">{fmtVnd(b.seat_total)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Bắp nước</span><span className="text-white">{fmtVnd(b.food_total)}</span>
                    </div>
                    {b.discount > 0 && (
                      <div className="flex justify-between text-zinc-400">
                        <span>Giảm giá ({b.promo_code})</span>
                        <span className="text-emerald-400">-{fmtVnd(b.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t border-zinc-800/50">
                      <span className="text-white font-medium">Tổng</span>
                      <span className="text-red-500 font-bold">{fmtVnd(b.total)}</span>
                    </div>
                    {isCustomer && b.loyalty_points_awarded > 0 && (
                      <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        +{b.loyalty_points_awarded.toFixed(1)} điểm thưởng
                      </p>
                    )}
                  </div>
                </div>

                {b.status === 'UPCOMING' && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg"
                      onClick={() => cancel(b.id)}
                      disabled={busyId === b.id}
                    >
                      <CalendarClock className="w-4 h-4 mr-2" />
                      {busyId === b.id ? 'Đang huỷ...' : 'Huỷ vé (nhận voucher)'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
