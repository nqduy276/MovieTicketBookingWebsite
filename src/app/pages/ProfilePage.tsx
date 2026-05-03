import { useState } from 'react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../lib/auth';
import { User as UserIcon, Mail, Phone, Calendar, Star, CheckCircle, Edit3, Cake } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!user) return null;

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        phone: form.phone || undefined,
      });
      setMsg({ type: 'ok', text: 'Cập nhật thành công!' });
      setEditing(false);
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.detail?.detail || e?.message || 'Cập nhật thất bại' });
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
    });
    setEditing(false);
    setMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-red-600 rounded-full" />
            <h1 className="text-3xl font-bold text-white">Hồ sơ cá nhân</h1>
          </div>

          {/* Avatar + basic info */}
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-red-600/20">
                {(user.first_name || user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.full_name || user.email}</h2>
                <p className="text-zinc-400 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    isCustomer
                      ? 'border-amber-500/30 text-amber-500 bg-amber-500/5'
                      : 'border-zinc-600 text-zinc-400 bg-zinc-800/50'
                  }`}>
                    {isCustomer ? 'Khách hàng' : 'Nhân viên'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {isCustomer && (
                <div className="bg-zinc-950/80 border border-amber-500/10 rounded-xl p-4 text-center">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-amber-500">{user.loyalty_points.toFixed(0)}</p>
                  <p className="text-xs text-zinc-500">Điểm thưởng</p>
                </div>
              )}
              <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl p-4 text-center">
                <Calendar className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
                <p className="text-sm font-medium text-white">{new Date(user.created_at).toLocaleDateString('vi-VN')}</p>
                <p className="text-xs text-zinc-500">Ngày tham gia</p>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Thông tin chi tiết</h3>
              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:border-red-600 hover:text-red-500 rounded-lg"
                  onClick={() => setEditing(true)}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Chỉnh sửa
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <Label className="text-zinc-500 text-xs flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-zinc-400 text-sm">
                  {user.email}
                </div>
              </div>

              {/* First name */}
              <div>
                <Label htmlFor="profile-first-name" className="text-zinc-500 text-xs flex items-center gap-1.5 mb-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Họ
                </Label>
                {editing ? (
                  <Input
                    id="profile-first-name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="bg-zinc-950 border-zinc-800/50 text-white placeholder:text-zinc-600 rounded-lg"
                    placeholder="Nhập họ..."
                  />
                ) : (
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-white text-sm">
                    {user.first_name || <span className="text-zinc-600">Chưa cập nhật</span>}
                  </div>
                )}
              </div>

              {/* Last name */}
              <div>
                <Label htmlFor="profile-last-name" className="text-zinc-500 text-xs flex items-center gap-1.5 mb-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Tên
                </Label>
                {editing ? (
                  <Input
                    id="profile-last-name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="bg-zinc-950 border-zinc-800/50 text-white placeholder:text-zinc-600 rounded-lg"
                    placeholder="Nhập tên..."
                  />
                ) : (
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-white text-sm">
                    {user.last_name || <span className="text-zinc-600">Chưa cập nhật</span>}
                  </div>
                )}
              </div>

              {/* Date of birth + age (customers only — read-only) */}
              {isCustomer && (
                <div>
                  <Label className="text-zinc-500 text-xs flex items-center gap-1.5 mb-1.5">
                    <Cake className="w-3.5 h-3.5" /> Ngày sinh
                  </Label>
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-white text-sm flex items-center justify-between">
                    {user.date_of_birth ? (
                      <>
                        <span>{new Date(user.date_of_birth).toLocaleDateString('vi-VN')}</span>
                        {typeof user.age === 'number' && (
                          <span className="text-xs text-zinc-400">{user.age} tuổi</span>
                        )}
                      </>
                    ) : (
                      <span className="text-zinc-600">Chưa cập nhật</span>
                    )}
                  </div>
                </div>
              )}

              {/* Phone */}
              <div>
                <Label htmlFor="profile-phone" className="text-zinc-500 text-xs flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> Số điện thoại
                </Label>
                {editing ? (
                  <Input
                    id="profile-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-zinc-950 border-zinc-800/50 text-white placeholder:text-zinc-600 rounded-lg"
                    placeholder="Nhập số điện thoại..."
                  />
                ) : (
                  <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-white text-sm">
                    {user.phone || <span className="text-zinc-600">Chưa cập nhật</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {editing && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-800/50">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-950 rounded-lg"
                  onClick={onCancel}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 rounded-lg font-semibold flex-1"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            )}

            {msg && (
              <div className={`mt-4 flex items-center gap-2 text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                {msg.type === 'ok' && <CheckCircle className="w-4 h-4" />}
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
