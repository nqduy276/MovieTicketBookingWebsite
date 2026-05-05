import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { ArrowLeft, User as UserIcon, Users, Plus, Minus, AlertCircle, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import type {
  ApiSeat,
  ApiShowtime,
  ApiMovie,
  ApiCinema,
  ApiFood,
  ApiBooking,
  PromoCheckResponse,
} from '../types/api';

interface SelectedFood {
  food: ApiFood;
  quantity: number;
}

const FALLBACK_POSTER = 'https://placehold.co/200x300/27272a/f97316?text=No+Image';

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showtime, setShowtime] = useState<ApiShowtime | null>(null);
  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [cinema, setCinema] = useState<ApiCinema | null>(null);
  const [seats, setSeats] = useState<ApiSeat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  const [foodMenu, setFoodMenu] = useState<ApiFood[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!showtimeId) return;
    Promise.all([
      apiGet<ApiShowtime>(`/api/showtimes/${showtimeId}`),
      apiGet<ApiSeat[]>(`/api/seats/showtime/${showtimeId}`),
      apiGet<ApiFood[]>(`/api/food`),
    ])
      .then(async ([st, ss, fs]) => {
        setShowtime(st);
        setSeats(ss);
        setFoodMenu(fs);
        // fetch movie + cinema in parallel
        const [m, cs] = await Promise.all([
          apiGet<ApiMovie>(`/api/movies/${st.movie_id}`),
          apiGet<ApiCinema[]>(`/api/cinemas`),
        ]);
        setMovie(m);
        setCinema(cs.find(c => c.id === st.cinema_id) || null);
      })
      .catch(e => setLoadError(e?.message || 'Không tải được suất chiếu'));
  }, [showtimeId]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-red-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {loadError}
        </div>
      </div>
    );
  }
  if (!showtime || !movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const titleVi = movie.title_vi || movie.title;
  const startDate = new Date(showtime.start_time);
  const endDate = showtime.end_time ? new Date(showtime.end_time) : null;
  const startStr = startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const showtimeRange = endDate
  ? `${startStr} ~ ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  : startDate.toLocaleString('vi-VN');


  const toggleSeat = (seat: ApiSeat) => {
    if (seat.status === 'booked' || seat.status === 'held') return;
    setSelectedSeatIds(prev =>
      prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id],
    );
  };

  const seatPriceFor = (id: number) => seats.find(s => s.id === id)?.price || 0;
  const seatTotal = selectedSeatIds.reduce((sum, id) => sum + seatPriceFor(id), 0);
  const foodTotal = selectedFoods.reduce((sum, sf) => sum + sf.food.price * sf.quantity, 0);
  const subtotal = seatTotal + foodTotal;
  const discount = promoApplied?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  const incFood = (food: ApiFood, delta: number) => {
    setSelectedFoods(prev => {
      const idx = prev.findIndex(p => p.food.id === food.id);
      if (idx === -1) {
        if (delta <= 0) return prev;
        return [...prev, { food, quantity: delta }];
      }
      const next = [...prev];
      const q = next[idx].quantity + delta;
      if (q <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], quantity: q };
      return next;
    });
  };
  const foodQty = (id: number) => selectedFoods.find(s => s.food.id === id)?.quantity || 0;

  const checkPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoMsg(null);
    try {
      const r = await apiGet<PromoCheckResponse>(
        `/api/promo/check/${encodeURIComponent(promoInput.trim())}?subtotal=${subtotal}`,
      );
      if (r.valid) {
        setPromoApplied({ code: promoInput.trim(), discount: r.discount_amount });
        setPromoMsg(`Áp dụng: -${r.discount_amount.toLocaleString('vi-VN')}đ`);
      } else {
        setPromoApplied(null);
        setPromoMsg(r.message);
      }
    } catch (e: any) {
      setPromoApplied(null);
      setPromoMsg(e?.detail?.detail || 'Không kiểm tra được mã');
    }
  };

  const submitBooking = async () => {
    if (selectedSeatIds.length === 0) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      const booking = await apiPost<ApiBooking>('/api/bookings', {
        showtime_id: showtime.id,
        seat_ids: selectedSeatIds,
        food_items: selectedFoods.map(sf => ({ food_id: sf.food.id, quantity: sf.quantity })),
        promo_code: promoApplied?.code || null,
      });
      setShowCheckoutDialog(false);
      navigate('/confirmation', { state: { booking, movie, cinema } });
    } catch (e: any) {
      setBookingError(e?.detail?.detail || e?.message || 'Đặt vé thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeatColor = (seat: ApiSeat) => {
    if (seat.status === 'booked' || seat.status === 'held')
      return 'bg-zinc-800/80 cursor-not-allowed border border-zinc-700/50 opacity-50';
    if (selectedSeatIds.includes(seat.id))
      return 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/40 border border-red-500 scale-105';
    switch (seat.type.toLowerCase()) {
      case 'vip':
        return 'bg-amber-500/90 hover:bg-amber-400 border border-amber-400 hover:shadow-lg hover:shadow-amber-500/30';
      case 'sweetbox':
        return 'bg-pink-500/90 hover:bg-pink-400 border border-pink-400 hover:shadow-lg hover:shadow-pink-500/30';
      default:
        return 'bg-zinc-600/80 hover:bg-zinc-500 border border-zinc-500/50 hover:shadow-lg hover:shadow-zinc-500/20';
    }
  };

  const getSeatIcon = (seat: ApiSeat) => {
    const t = seat.type.toLowerCase();
    if (t === 'sweetbox') return <Heart className="w-4 h-4 fill-current" />;
    if (t === 'vip') return <UserIcon className="w-3.5 h-3.5" />;
    return <UserIcon className="w-3 h-3" />;
  };

  const rows = Array.from(new Set(seats.map(s => s.row))).sort();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 text-white hover:text-red-500 hover:bg-zinc-800/50"
          onClick={() => navigate(`/movie/${movie.id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        {/* Movie info bar */}
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 mb-8 border border-zinc-800/50">
          <div className="flex items-start gap-4">
            <img src={movie.image || FALLBACK_POSTER} alt={titleVi} className="w-20 h-[120px] object-cover rounded-lg ring-2 ring-red-600/30" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white mb-1">{titleVi}</h1>
              <div className="text-zinc-400 text-sm space-y-0.5">
                <p>Rạp: <span className="text-zinc-200">{cinema?.name || '...'}{showtime.room ? ` - ${showtime.room}` : ''}{showtime.type ? ` (${showtime.type})` : ''}</span></p>
                <p>Suất chiếu: <span className="text-zinc-200">{showtimeRange}</span></p>
                {movie.age_restriction > 0 && (
                  <p>Giới hạn độ tuổi: <span className="text-amber-400 font-semibold">{movie.age_restriction}+</span></p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Age-gate warning — customers under the movie's required age */}
        {user?.role === 'customer'
          && movie.age_restriction > 0
          && typeof user.age === 'number'
          && user.age < movie.age_restriction && (
          <div className="bg-red-950/40 border border-red-600/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-300 font-semibold mb-0.5">Không đủ độ tuổi đặt vé</p>
              <p className="text-red-400/90">
                Phim này dành cho khán giả từ {movie.age_restriction} tuổi trở lên. Bạn hiện {user.age} tuổi.
              </p>
            </div>
          </div>
        )}

        {/* Screen */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div className="relative">
            <div className="h-3 bg-gradient-to-r from-transparent via-red-500/60 to-transparent rounded-t-[50%] mb-1" />
            <div className="h-1 bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />
            <p className="text-center text-zinc-500 text-xs mt-2 uppercase tracking-widest">Màn hình</p>
          </div>
        </div>

        {/* Seats */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="space-y-2.5">
            {rows.map(row => {
              const rowSeats = seats.filter(s => s.row === row).sort((a, b) => a.number - b.number);
              return (
                <div key={row} className="flex items-center justify-center gap-2">
                  <span className="w-7 text-zinc-500 text-center font-mono text-sm">{row}</span>
                  <div className="flex gap-1.5">
                    {rowSeats.map(seat => (
                      <button
                        key={seat.id}
                        id={`seat-${seat.row}${seat.number}`}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status === 'booked' || seat.status === 'held'}
                        className={`${
                          seat.type.toLowerCase() === 'sweetbox' ? 'w-[84px]' : 'w-10'
                        } h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-white text-xs ${getSeatColor(seat)}`}
                        title={`${seat.row}${seat.number} (${seat.type.toLowerCase() === 'vip' ? 'VIP' : seat.type.toLowerCase() === 'sweetbox' ? 'Sweetbox' : 'Thường'}) - ${seat.price.toLocaleString('vi-VN')}đ`}
                      >
                        {getSeatIcon(seat)}
                      </button>
                    ))}
                  </div>
                  <span className="w-7 text-zinc-500 text-center font-mono text-sm">{row}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-5 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-600/80 rounded-lg border border-zinc-500/50 flex items-center justify-center">
              <UserIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-zinc-400">Ghế thường</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500/90 rounded-lg border border-amber-400 flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-zinc-400">Ghế VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[52px] h-8 bg-pink-500/90 rounded-lg border border-pink-400 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-zinc-400">Sweetbox</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg border border-red-500 flex items-center justify-center">
              <UserIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-zinc-400">Đã chọn</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-800/80 rounded-lg border border-zinc-700/50 opacity-50 flex items-center justify-center">
              <UserIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-zinc-400">Đã đặt</span>
          </div>
        </div>

        {/* Checkout bar */}
        {selectedSeatIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 border-t border-zinc-800/50 p-4 z-40 backdrop-blur-xl">
            <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Ghế đã chọn:</p>
                <p className="text-white text-base font-medium">
                  {selectedSeatIds
                    .map(id => seats.find(s => s.id === id))
                    .filter(Boolean)
                    .map(s => `${s!.row}${s!.number}`)
                    .join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs mb-0.5">Tiền vé:</p>
                <p className="text-red-500 text-2xl font-bold">{seatTotal.toLocaleString('vi-VN')}đ</p>
              </div>
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 font-semibold"
                onClick={() => setShowCheckoutDialog(true)}
              >
                Tiếp tục
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Hoàn tất đặt vé</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Food menu */}
            <div>
              <h4 className="font-semibold mb-3 text-base">Bắp nước (tùy chọn)</h4>
              <div className="space-y-2">
                {foodMenu.length === 0 && <p className="text-zinc-500 text-sm">Hiện không có món nào.</p>}
                {foodMenu.map(food => (
                  <div key={food.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800/50 rounded-xl p-3.5">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{food.name}</p>
                      {food.description && <p className="text-xs text-zinc-500 mt-0.5">{food.description}</p>}
                      <p className="text-red-500 text-sm font-semibold mt-1">{food.price.toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-700 h-8 w-8 p-0 rounded-lg" onClick={() => incFood(food, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center font-medium">{foodQty(food.id)}</span>
                      <Button size="sm" variant="outline" className="border-zinc-700 h-8 w-8 p-0 rounded-lg" onClick={() => incFood(food, +1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo code */}
            <div>
              <Label htmlFor="promo" className="text-sm">Mã khuyến mãi (Promo / Voucher)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="promo"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoApplied(null); setPromoMsg(null); }}
                  placeholder="Nhập mã..."
                  className="bg-zinc-950 border-zinc-800/50 text-white placeholder:text-zinc-600 rounded-lg"
                />
                <Button variant="outline" className="border-zinc-700 rounded-lg" onClick={checkPromo}>Áp dụng</Button>
              </div>
              {promoMsg && (
                <p className={`text-sm mt-1.5 ${promoApplied ? 'text-emerald-400' : 'text-red-400'}`}>{promoMsg}</p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50 space-y-1.5 text-sm">
              <h4 className="font-semibold mb-3 text-base">Tóm tắt</h4>
              <p className="text-zinc-400">Phim: <span className="text-white">{titleVi}</span></p>
              <p className="text-zinc-400">Rạp: <span className="text-white">{cinema?.name}</span></p>
              <p className="text-zinc-400">Suất: <span className="text-white">{showtimeRange}</span></p>
              <p className="text-zinc-400">
                Ghế:{' '}
                <span className="text-white">
                  {selectedSeatIds.map(id => {
                    const s = seats.find(x => x.id === id); return s ? `${s.row}${s.number}` : '';
                  }).filter(Boolean).join(', ')}
                </span>
              </p>
              <div className="pt-3 mt-3 border-t border-zinc-800/50 space-y-1.5">
                <div className="flex justify-between"><span className="text-zinc-400">Tiền vé</span><span>{seatTotal.toLocaleString('vi-VN')}đ</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Bắp nước</span><span>{foodTotal.toLocaleString('vi-VN')}đ</span></div>
                {discount > 0 && (
                  <div className="flex justify-between"><span className="text-zinc-400">Giảm giá ({promoApplied?.code})</span><span className="text-emerald-400">-{discount.toLocaleString('vi-VN')}đ</span></div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2">
                  <span className="text-white">Tổng</span>
                  <span className="text-red-500">{total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            {bookingError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{bookingError}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} className="border-zinc-800 text-white hover:bg-zinc-950 rounded-lg">Hủy</Button>
            <Button onClick={submitBooking} className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 rounded-lg font-semibold" disabled={submitting || selectedSeatIds.length === 0}>
              {submitting ? 'Đang đặt...' : 'Xác nhận đặt vé'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
