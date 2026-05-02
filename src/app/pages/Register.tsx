import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Film } from 'lucide-react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../lib/auth';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    date_of_birth: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim()) {
      setError('Vui lòng nhập họ');
      return;
    }
    if (!form.last_name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }
    if (!form.date_of_birth) {
      setError('Vui lòng nhập ngày sinh');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
        phone: form.phone || undefined,
      });
      navigate('/');
    } catch (err: any) {
      setError(err?.detail?.detail || err?.message || 'Đăng ký thất bại');
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
            <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
            <p className="text-zinc-400 text-sm">Đăng ký để đặt vé và nhận điểm thưởng</p>
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name" className="text-zinc-300">Họ *</Label>
                <Input
                  id="first_name"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="Nguyễn"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-zinc-300">Tên *</Label>
                <Input
                  id="last_name"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                  placeholder="Văn A"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-zinc-300">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300">Mật khẩu * <span className="text-zinc-500">(≥ 6 ký tự)</span></Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <Label htmlFor="dob" className="text-zinc-300">Ngày sinh *</Label>
              <Input
                id="dob"
                type="date"
                required
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-zinc-300">Số điện thoại</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 mt-2"
            >
              {submitting ? 'Đang tạo...' : 'Đăng ký'}
            </Button>
          </form>

          <p className="text-center text-zinc-400 text-sm mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-red-600 hover:text-red-500">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
