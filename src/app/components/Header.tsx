import { Link, useNavigate } from 'react-router';
import { Film, LogOut, Ticket, User as UserIcon, Star, Gift, Sparkles, Settings } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from './ui/button';
import { isAdmin } from './RequireAdmin';

export default function Header() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const isCustomer = user?.role === 'customer';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* CGV Red Top Strip */}
      <div className="h-1 bg-gradient-to-r from-red-700 via-red-600 to-red-700" />

      <header className="bg-[#0a0a0a]/95 border-b border-zinc-800/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <Film className="w-8 h-8 text-red-600 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-red-600/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-red-600">CGV</span>
                <span className="text-xs text-zinc-500 hidden sm:inline font-medium tracking-wider uppercase">Cinemas</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/" className="text-zinc-300 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium">
                Trang chủ
              </Link>
              <Link to="/" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium">
                Phim đang chiếu
              </Link>
              {user && (
                <Link to="/my-bookings" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" /> Vé của tôi
                </Link>
              )}
              {user && isCustomer && (
                <Link to="/loyalty" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Đổi điểm
                </Link>
              )}
              {user && (
                <Link to="/vouchers" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5">
                  <Gift className="w-4 h-4" /> Voucher
                </Link>
              )}
              {user && isAdmin(user.email) && (
                <Link to="/admin" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5">
                  <Settings className="w-4 h-4" /> Quản trị
                </Link>
              )}
            </nav>

            {/* Auth section */}
            <div className="flex items-center gap-2">
              {loading ? null : user ? (
                <>
                  <Link to="/profile" className="hidden sm:flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/50 hover:border-zinc-700 transition group">
                    <UserIcon className="w-4 h-4 text-red-600" />
                    <span className="text-zinc-300 font-medium group-hover:text-white transition">{user.full_name || user.email}</span>
                    {!isCustomer && (
                      <span className="text-xs text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">Staff</span>
                    )}
                  </Link>
                  {isCustomer && (
                    <Link to="/loyalty" className="hidden sm:flex items-center gap-1 text-amber-500 hover:text-amber-400 transition text-sm px-2 py-2 rounded-lg bg-zinc-900/80 border border-amber-500/10 hover:border-amber-500/30">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="text-xs font-semibold">{user.loyalty_points.toFixed(0)}</span>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-zinc-400 hover:text-red-500 hover:bg-zinc-800/50"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800/50">
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-600/20">
                      Đăng ký
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
