import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Film, Mail, Lock } from 'lucide-react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from || '/';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.detail?.detail || err?.message || 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <Film className="w-12 h-12 text-red-600 mb-2" />
            <h1 className="text-2xl font-bold text-white">Đăng nhập</h1>
            <p className="text-zinc-400 text-sm">Nhập email và mật khẩu để đăng nhập</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="customer@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300">Mật khẩu</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="text-center text-zinc-400 text-sm mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-red-600 hover:text-red-500">
              Đăng ký ngay
            </Link>
          </p>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
            <p className="font-semibold text-zinc-400 mb-1">Tài khoản demo:</p>
            <p>Khách: <span className="text-zinc-300">customer@example.com / password123</span></p>
            <p>Nhân viên: <span className="text-zinc-300">staff@example.com / password123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
