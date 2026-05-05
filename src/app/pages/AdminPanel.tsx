import { useState } from 'react';
import Header from '../components/Header';
import { Film, Clapperboard, Database } from 'lucide-react';
import ShowtimesAdmin from './admin/ShowtimesAdmin';
import MoviesAdmin from './admin/MoviesAdmin';
import { ADMIN_EMAIL } from '../components/RequireAdmin';

type Tab = 'showtimes' | 'movies';

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('showtimes');

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-red-600 rounded-full" />
            <h1 className="text-3xl font-bold text-white">Trang quản trị</h1>
          </div>
          <p className="text-zinc-400 mb-6 flex items-center gap-2">
            <Database className="w-4 h-4" /> Đang đăng nhập với tài khoản quản trị{' '}
            <code className="text-amber-400">{ADMIN_EMAIL}</code>. Người dùng thông thường không có
            quyền chỉnh sửa cơ sở dữ liệu.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-zinc-800/60">
            <TabButton
              active={tab === 'showtimes'}
              onClick={() => setTab('showtimes')}
              icon={<Clapperboard className="w-4 h-4" />}
              label="Suất chiếu (SHOWTIME)"
            />
            <TabButton
              active={tab === 'movies'}
              onClick={() => setTab('movies')}
              icon={<Film className="w-4 h-4" />}
              label="Phim (MOVIE)"
            />
          </div>

          {tab === 'showtimes' && <ShowtimesAdmin />}
          {tab === 'movies' && <MoviesAdmin />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-medium flex items-center gap-2 transition-colors ${
        active
          ? 'border-red-600 text-white'
          : 'border-transparent text-zinc-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
