import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import Header from '../components/Header';
import { Clock, Calendar, User, Film, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { apiGet } from '../lib/api';
import type { ApiMovie, ApiCinema, ApiShowtime } from '../types/api';

const FALLBACK_POSTER = 'https://placehold.co/400x600/27272a/f97316?text=No+Image';

function formatDateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Ngày mai';
  return d.toLocaleDateString('vi-VN', { weekday: 'short' });
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<ApiMovie | null>(null);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [showtimes, setShowtimes] = useState<ApiShowtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date and Cinema states
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);

  // Generate 14 days of dates
  const dateOptions: { key: string; date: Date; label: string; dayNum: string; monthLabel: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push({
      key: formatDateKey(d),
      date: d,
      label: formatDateLabel(d),
      dayNum: String(d.getDate()).padStart(2, '0'),
      monthLabel: d.toLocaleDateString('vi-VN', { month: 'short' }),
    });
  }

  const visibleDates = dateOptions.slice(dateOffset, dateOffset + 7);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiGet<ApiMovie>(`/api/movies/${id}`),
      apiGet<ApiCinema[]>(`/api/cinemas/by-movie/${id}`),
    ])
      .then(([m, c]) => {
        setMovie(m);
        setCinemas(c);
      })
      .catch(e => setError(e?.message || 'Không tải được thông tin phim'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch showtimes when date changes
  useEffect(() => {
    if (!id) return;
    apiGet<ApiShowtime[]>(`/api/showtimes?movie_id=${id}&date=${selectedDate}`)
      .then((data) => {
        setShowtimes(data);
        setSelectedCinemaId(null); // Reset cinema when date changes
      })
      .catch(() => setShowtimes([]));
  }, [id, selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-red-400 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error || 'Không tìm thấy phim'}
          </p>
        </div>
      </div>
    );
  }

  const titleVi = movie.title_vi || movie.title;
  const showtimesByCinema = cinemas.map(c => ({
    cinema: c,
    times: showtimes.filter(s => s.cinema_id === c.id),
  })).filter(x => x.times.length > 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      {/* Hero backdrop */}
      <div className="relative h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
        <img src={movie.image || FALLBACK_POSTER} alt={titleVi} className="w-full h-full object-cover opacity-30 scale-105" />
        <div className="absolute inset-0 z-20">
          <div className="container mx-auto px-4 h-full flex items-end pb-8">
            <Link to="/">
              <Button variant="ghost" className="mb-4 text-white hover:text-red-500 hover:bg-zinc-800/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Movie detail content */}
      <div className="container mx-auto px-4 -mt-36 relative z-30 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <img
              src={movie.image || FALLBACK_POSTER}
              alt={titleVi}
              className="w-60 rounded-xl shadow-2xl ring-2 ring-red-600/30"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-white mb-2">{titleVi}</h1>
                  <p className="text-lg text-zinc-400 mb-4">{movie.title}</p>
                </div>
                {movie.rating && (
                  <Badge variant="destructive" className="text-lg px-3 py-1 bg-red-600 hover:bg-red-700 font-bold">
                    {movie.rating}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {movie.genre && (
                  <div className="flex items-center gap-2.5 text-zinc-300">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <Film className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Thể loại</p>
                      <p className="text-sm font-medium">{movie.genre}</p>
                    </div>
                  </div>
                )}

                {movie.duration && (
                  <div className="flex items-center gap-2.5 text-zinc-300">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <Clock className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Thời lượng</p>
                      <p className="text-sm font-medium">{movie.duration} phút</p>
                    </div>
                  </div>
                )}

                {movie.release_date && (
                  <div className="flex items-center gap-2.5 text-zinc-300">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <Calendar className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Khởi chiếu</p>
                      <p className="text-sm font-medium">{new Date(movie.release_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                )}

                {movie.director && (
                  <div className="flex items-center gap-2.5 text-zinc-300">
                    <div className="w-9 h-9 rounded-lg bg-red-600/10 flex items-center justify-center">
                      <User className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Đạo diễn</p>
                      <p className="text-sm font-medium">{movie.director}</p>
                    </div>
                  </div>
                )}
              </div>

              {movie.description && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-white mb-2">Nội dung phim</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">{movie.description}</p>
                </div>
              )}

              {movie.cast && (
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">Diễn viên</h3>
                  <p className="text-zinc-400 text-sm">{movie.cast}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Showtimes section */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-red-600 rounded-full" />
            <h2 className="text-2xl font-bold text-white">Lịch chiếu</h2>
          </div>

          {/* Date selector */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-zinc-800/50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateOffset(Math.max(0, dateOffset - 1))}
                disabled={dateOffset === 0}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 flex gap-2 overflow-hidden">
                {visibleDates.map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDate(d.key)}
                    className={`flex-1 min-w-[72px] py-3 px-2 rounded-xl text-center transition-all ${
                      selectedDate === d.key
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-700/30'
                    }`}
                  >
                    <div className="text-xs font-medium mb-0.5">{d.label}</div>
                    <div className="text-xl font-bold">{d.dayNum}</div>
                    <div className="text-xs opacity-70">{d.monthLabel}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setDateOffset(Math.min(dateOptions.length - 7, dateOffset + 1))}
                disabled={dateOffset >= dateOptions.length - 7}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cinema selector */}
          {showtimesByCinema.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Chọn rạp</h3>
              <div className="flex flex-wrap gap-3">
                {showtimesByCinema.map(({ cinema }) => (
                  <button
                    key={cinema.id}
                    onClick={() => setSelectedCinemaId(cinema.id)}
                    className={`px-5 py-3 rounded-xl border transition-all ${
                      selectedCinemaId === cinema.id
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30'
                        : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {cinema.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Showtimes list */}
          {showtimesByCinema.length === 0 ? (
            <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-8 text-center text-zinc-500">
              Không có suất chiếu cho ngày này.
            </div>
          ) : selectedCinemaId ? (
            <div className="space-y-4">
              {showtimesByCinema
                .filter(({ cinema }) => cinema.id === selectedCinemaId)
                .map(({ cinema, times }) => (
                <div key={cinema.id} className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-600" />
                    <h3 className="text-lg font-semibold text-white">Chọn giờ chiếu tại {cinema.name}</h3>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {times.map(showtime => {
                      const dt = new Date(showtime.start_time);
                      const endDt = showtime.end_time ? new Date(showtime.end_time) : null;
                      const fmt = (d: Date) =>
                        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <button
                          key={showtime.id}
                          onClick={() => navigate(`/booking/${showtime.id}`)}
                          className="bg-zinc-800/80 hover:bg-red-600 text-white rounded-xl px-5 py-3 transition-all group border border-zinc-700/50 hover:border-red-600 hover:shadow-lg hover:shadow-red-600/20 min-w-[120px]"
                        >
                          <div className="text-xl font-bold mb-0.5">
                            {fmt(dt)}
                            {endDt && (
                              <span className="text-sm font-normal text-zinc-400 group-hover:text-white/80">
                                {' '}~ {fmt(endDt)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 group-hover:text-white/80 mb-1">
                            {[showtime.room, showtime.type].filter(Boolean).join(' • ')}
                          </div>
                          <div className="text-xs text-zinc-500 group-hover:text-white/70">
                            {showtime.available_seats ?? '?'} ghế trống
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-8 text-center text-zinc-500">
              Vui lòng chọn rạp để xem suất chiếu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
