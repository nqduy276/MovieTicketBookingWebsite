import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { apiDel, apiGet, apiPost, apiPut, ApiError } from '../../lib/api';
import type { ApiCinema, ApiMovie, ApiShowtime } from '../../types/api';
import {
  Calendar,
  Film,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

interface ProcRow {
  id: number;
  movie_id: number;
  cinema_id: number;
  room_id: number;
  movie_title: string;
  theater_name: string;
  room_name: string;
  screen_type: string;
  start_time: string;
  end_time: string | null;
  base_price: number;
  available_seats: number;
  tickets_sold: number;
}

type SortKey = 'start_time' | 'movie_title' | 'theater_name' | 'available_seats' | 'base_price';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { hour12: false });
}

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  return local.length === 16 ? local + ':00' : local;
}

interface FormState {
  id: number | null;
  movie_id: string;
  cinema_id: string;
  start_time: string;
}

const emptyForm: FormState = { id: null, movie_id: '', cinema_id: '', start_time: '' };

const BUFFER_MINUTES = 15;

function computeEndTime(startLocal: string, durationMinutes: number | null | undefined): string {
  if (!startLocal || !durationMinutes || durationMinutes <= 0) return '';
  const start = new Date(startLocal);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + (durationMinutes + BUFFER_MINUTES) * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export default function ShowtimesAdmin() {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [cinemas, setCinemas] = useState<ApiCinema[]>([]);
  const [rows, setRows] = useState<ProcRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [filterMovie, setFilterMovie] = useState('');
  const [filterTheater, setFilterTheater] = useState('');
  const [filterDate, setFilterDate] = useState(todayStr());

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('start_time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiGet<ApiMovie[]>('/api/movies').then(setMovies).catch(() => setMovies([]));
    apiGet<ApiCinema[]>('/api/cinemas').then(setCinemas).catch(() => setCinemas([]));
  }, []);

  const loadList = async () => {
    setLoadingList(true);
    setBanner(null);
    try {
      const params = new URLSearchParams();
      if (filterMovie) params.set('movie_name', filterMovie);
      if (filterTheater) params.set('theater_name', filterTheater);
      params.set('date', filterDate);
      const data = await apiGet<ProcRow[]>(`/api/showtimes/by-procedure?${params}`);
      setRows(data);
    } catch (e) {
      setBanner({ type: 'err', text: e instanceof ApiError ? e.message : 'Không thể tải danh sách.' });
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(); }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.movie_title.toLowerCase().includes(q) ||
          r.theater_name.toLowerCase().includes(q) ||
          r.room_name.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, search, sortKey, sortDir]);

  const validate = (f: FormState): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.movie_id) errs.movie_id = 'Vui lòng chọn phim.';
    if (!f.cinema_id) errs.cinema_id = 'Vui lòng chọn rạp.';
    if (!f.start_time) errs.start_time = 'Vui lòng nhập giờ bắt đầu.';
    if (f.start_time) {
      const start = new Date(f.start_time);
      if (Number.isNaN(start.getTime())) errs.start_time = 'Giờ bắt đầu không hợp lệ.';
      else if (start.getTime() <= Date.now()) errs.start_time = 'Giờ bắt đầu phải ở tương lai.';
    }
    return errs;
  };

  const startEdit = (r: ProcRow) => {
    setForm({
      id: r.id,
      movie_id: String(r.movie_id),
      cinema_id: String(r.cinema_id),
      start_time: isoToLocalInput(r.start_time),
    });
    setFormErrors({});
    setBanner(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => { setForm(emptyForm); setFormErrors({}); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    const errs = validate(form);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload: any = {
        movie_id: Number(form.movie_id),
        cinema_id: Number(form.cinema_id),
        start_time: localInputToIso(form.start_time),
      };

      if (form.id == null) {
        await apiPost<ApiShowtime>('/api/showtimes', payload);
        setBanner({ type: 'ok', text: 'Tạo suất chiếu thành công.' });
      } else {
        await apiPut<ApiShowtime>(`/api/showtimes/${form.id}`, payload);
        setBanner({ type: 'ok', text: `Cập nhật suất chiếu #${form.id} thành công.` });
      }
      resetForm();
      await loadList();
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : 'Thao tác thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (r: ProcRow) => {
    if (!window.confirm(`Xoá suất chiếu #${r.id} (${r.movie_title} — ${r.theater_name})?`)) return;
    setBanner(null);
    try {
      await apiDel(`/api/showtimes/${r.id}`);
      setBanner({ type: 'ok', text: `Đã xoá suất chiếu #${r.id}.` });
      await loadList();
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : 'Xoá thất bại.' });
    }
  };

  const editing = form.id != null;

  return (
    <>
      {banner && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg border ${
            banner.type === 'ok'
              ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-300'
              : 'border-red-600/40 bg-red-600/10 text-red-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* CRUD Form */}
      <section className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {editing ? <Pencil className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            {editing ? `Cập nhật suất chiếu #${form.id}` : 'Tạo suất chiếu mới'}
          </h2>
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm} className="text-zinc-400">
              <RotateCcw className="w-4 h-4 mr-1" /> Huỷ
            </Button>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Film className="w-4 h-4" /> Phim <span className="text-red-500">*</span>
            </Label>
            <select
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-white px-3 py-2"
              value={form.movie_id}
              onChange={(e) => setForm({ ...form, movie_id: e.target.value })}
            >
              <option value="">— Chọn phim —</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
            {formErrors.movie_id && <p className="text-red-400 text-xs mt-1">{formErrors.movie_id}</p>}
          </div>

          <div>
            <Label className="text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> Rạp <span className="text-red-500">*</span>
            </Label>
            <select
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-white px-3 py-2"
              value={form.cinema_id}
              onChange={(e) => setForm({ ...form, cinema_id: e.target.value })}
            >
              <option value="">— Chọn rạp —</option>
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formErrors.cinema_id && <p className="text-red-400 text-xs mt-1">{formErrors.cinema_id}</p>}
          </div>

          <div>
            <Label className="text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Giờ bắt đầu <span className="text-red-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="bg-zinc-950 border-zinc-700 text-white"
            />
            {formErrors.start_time && <p className="text-red-400 text-xs mt-1">{formErrors.start_time}</p>}
          </div>

          <div>
            <Label className="text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Giờ kết thúc (tự động)
            </Label>
            <Input
              type="datetime-local"
              value={computeEndTime(
                form.start_time,
                movies.find((m) => String(m.id) === form.movie_id)?.duration,
              )}
              readOnly
              disabled
              className="bg-zinc-950/60 border-zinc-700 text-zinc-400 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Tự tính = giờ bắt đầu + thời lượng phim + {BUFFER_MINUTES} phút.
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo suất chiếu'}
            </Button>
          </div>
        </form>
      </section>

      {/* Procedure-driven list */}
      <section className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-1">Danh sách suất chiếu</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Lấy bằng stored procedure <code className="text-amber-400">GetShowtimesByMovieTheaterAndDate</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-zinc-400 text-xs mb-1">Tên phim chứa</Label>
            <Input value={filterMovie} onChange={(e) => setFilterMovie(e.target.value)} placeholder="vd: Avengers" className="bg-zinc-950 border-zinc-700 text-white" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1">Tên rạp chứa</Label>
            <Input value={filterTheater} onChange={(e) => setFilterTheater(e.target.value)} placeholder="vd: CGV" className="bg-zinc-950 border-zinc-700 text-white" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs mb-1">Ngày <span className="text-red-500">*</span></Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-zinc-950 border-zinc-700 text-white" />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={loadList} disabled={loadingList || !filterDate} className="bg-zinc-800 hover:bg-zinc-700 text-white w-full">
              <Search className="w-4 h-4 mr-1" />
              {loadingList ? 'Đang tải...' : 'Gọi procedure'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm trong kết quả (phim / rạp / phòng)" className="pl-9 bg-zinc-950 border-zinc-700 text-white" />
          </div>
          <div className="flex gap-2">
            <select className="bg-zinc-950 border border-zinc-700 rounded-md text-white px-3 py-2" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="start_time">Sắp xếp: Giờ chiếu</option>
              <option value="movie_title">Sắp xếp: Tên phim</option>
              <option value="theater_name">Sắp xếp: Tên rạp</option>
              <option value="available_seats">Sắp xếp: Ghế trống</option>
              <option value="base_price">Sắp xếp: Giá vé</option>
            </select>
            <Button type="button" variant="ghost" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="text-zinc-300 border border-zinc-700">
              {sortDir === 'asc' ? '↑ Tăng' : '↓ Giảm'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-800/60">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/60 text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Phim</th>
                <th className="text-left px-3 py-2">Rạp</th>
                <th className="text-left px-3 py-2">Phòng</th>
                <th className="text-left px-3 py-2">Bắt đầu</th>
                <th className="text-right px-3 py-2">Giá từ</th>
                <th className="text-right px-3 py-2"><Users className="w-4 h-4 inline" /> Trống</th>
                <th className="text-right px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">{loadingList ? 'Đang tải...' : 'Không có suất chiếu phù hợp.'}</td></tr>
              )}
              {filteredSorted.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800/60 hover:bg-zinc-950/40">
                  <td className="px-3 py-2 text-zinc-400">#{r.id}</td>
                  <td className="px-3 py-2 text-white">{r.movie_title}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.theater_name}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.room_name} <span className="text-xs text-zinc-500">({r.screen_type})</span></td>
                  <td className="px-3 py-2 text-zinc-300">{formatDateTime(r.start_time)}</td>
                  <td className="px-3 py-2 text-right text-amber-400">{formatVND(r.base_price)}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {r.available_seats}
                    {r.tickets_sold > 0 && <span className="text-xs text-zinc-500"> ({r.tickets_sold} đã bán)</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(r)} className="text-amber-400 hover:bg-amber-500/10">
                        <Pencil className="w-4 h-4 mr-1" /> Sửa
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(r)} className="text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4 mr-1" /> Xoá
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
