import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { apiDel, apiGet, apiPost, apiPut, ApiError } from '../../lib/api';
import type { ApiMovie } from '../../types/api';
import { Film, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';

type SortKey = 'title' | 'duration' | 'age_restriction' | 'genre';

interface FormState {
  id: number | null;
  title: string;
  duration: string;
  age_restriction: string;
  genres: string;
}

const emptyForm: FormState = {
  id: null,
  title: '',
  duration: '',
  age_restriction: '',
  genres: '',
};

export default function MoviesAdmin() {
  const [movies, setMovies] = useState<ApiMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadList = async () => {
    setLoading(true);
    setBanner(null);
    try {
      const data = await apiGet<ApiMovie[]>('/api/movies');
      setMovies(data);
    } catch (e) {
      setBanner({ type: 'err', text: e instanceof ApiError ? e.message : 'Không thể tải phim.' });
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = movies;
    if (q) {
      out = out.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.genre || '').toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av || '').localeCompare(String(bv || '')) * dir;
    });
  }, [movies, search, sortKey, sortDir]);

  const validate = (f: FormState): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs.title = 'Vui lòng nhập tên phim.';
    if (f.title.length > 255) errs.title = 'Tên phim không được dài quá 255 ký tự.';
    const dur = Number(f.duration);
    if (!f.duration || Number.isNaN(dur) || dur <= 0)
      errs.duration = 'Thời lượng phải là số phút lớn hơn 0.';
    if (dur > 600) errs.duration = 'Thời lượng quá lớn (tối đa 600 phút).';
    const age = Number(f.age_restriction);
    if (f.age_restriction === '' || Number.isNaN(age) || age < 0)
      errs.age_restriction = 'Độ tuổi giới hạn phải là số ≥ 0.';
    if (age > 21) errs.age_restriction = 'Độ tuổi giới hạn không hợp lệ (≤ 21).';
    return errs;
  };

  const startEdit = (m: ApiMovie) => {
    setForm({
      id: m.id,
      title: m.title,
      duration: String(m.duration),
      age_restriction: String(m.age_restriction),
      genres: m.genre || '',
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
      const genres = form.genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean);
      const payload: any = {
        title: form.title.trim(),
        duration: Number(form.duration),
        age_restriction: Number(form.age_restriction),
        genres,
      };

      if (form.id == null) {
        await apiPost<ApiMovie>('/api/movies', payload);
        setBanner({ type: 'ok', text: 'Tạo phim thành công.' });
      } else {
        await apiPut<ApiMovie>(`/api/movies/${form.id}`, payload);
        setBanner({ type: 'ok', text: `Cập nhật phim #${form.id} thành công.` });
      }
      resetForm();
      await loadList();
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof ApiError ? err.message : 'Thao tác thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (m: ApiMovie) => {
    if (!window.confirm(`Xoá phim "${m.title}" (#${m.id})?`)) return;
    setBanner(null);
    try {
      await apiDel(`/api/movies/${m.id}`);
      setBanner({ type: 'ok', text: `Đã xoá phim "${m.title}".` });
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
            {editing ? `Cập nhật phim #${form.id}` : 'Thêm phim mới'}
          </h2>
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm} className="text-zinc-400">
              <RotateCcw className="w-4 h-4 mr-1" /> Huỷ
            </Button>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Film className="w-4 h-4" /> Tên phim <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="vd: Avengers: Hồi Kết"
              className="bg-zinc-950 border-zinc-700 text-white"
              maxLength={255}
            />
            {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <Label className="text-zinc-300 mb-1.5">Thời lượng (phút) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min={1}
              max={600}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="bg-zinc-950 border-zinc-700 text-white"
            />
            {formErrors.duration && <p className="text-red-400 text-xs mt-1">{formErrors.duration}</p>}
          </div>

          <div>
            <Label className="text-zinc-300 mb-1.5">Độ tuổi giới hạn <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min={0}
              max={21}
              value={form.age_restriction}
              onChange={(e) => setForm({ ...form, age_restriction: e.target.value })}
              className="bg-zinc-950 border-zinc-700 text-white"
            />
            {formErrors.age_restriction && <p className="text-red-400 text-xs mt-1">{formErrors.age_restriction}</p>}
            <p className="text-xs text-zinc-500 mt-1">0 = P, 13 = 13+, 16 = 16+, 18 = 18+.</p>
          </div>

          <div className="md:col-span-2">
            <Label className="text-zinc-300 mb-1.5">Thể loại (cách nhau bằng dấu phẩy)</Label>
            <Input
              value={form.genres}
              onChange={(e) => setForm({ ...form, genres: e.target.value })}
              placeholder="vd: Action, Adventure"
              className="bg-zinc-950 border-zinc-700 text-white"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm phim'}
            </Button>
          </div>
        </form>
      </section>

      {/* Movie list */}
      <section className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Danh sách phim ({filteredSorted.length})</h2>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc thể loại"
              className="pl-9 bg-zinc-950 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-zinc-950 border border-zinc-700 rounded-md text-white px-3 py-2" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="title">Sắp xếp: Tên</option>
              <option value="duration">Sắp xếp: Thời lượng</option>
              <option value="age_restriction">Sắp xếp: Độ tuổi</option>
              <option value="genre">Sắp xếp: Thể loại</option>
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
                <th className="text-left px-3 py-2">Tên phim</th>
                <th className="text-left px-3 py-2">Thể loại</th>
                <th className="text-right px-3 py-2">Thời lượng</th>
                <th className="text-right px-3 py-2">Độ tuổi</th>
                <th className="text-right px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">{loading ? 'Đang tải...' : 'Không có phim phù hợp.'}</td></tr>
              )}
              {filteredSorted.map((m) => (
                <tr key={m.id} className="border-t border-zinc-800/60 hover:bg-zinc-950/40">
                  <td className="px-3 py-2 text-zinc-400">#{m.id}</td>
                  <td className="px-3 py-2 text-white">{m.title}</td>
                  <td className="px-3 py-2 text-zinc-300">{m.genre || '—'}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{m.duration} phút</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{m.rating || `${m.age_restriction}+`}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(m)} className="text-amber-400 hover:bg-amber-500/10">
                        <Pencil className="w-4 h-4 mr-1" /> Sửa
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(m)} className="text-red-400 hover:bg-red-500/10">
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
