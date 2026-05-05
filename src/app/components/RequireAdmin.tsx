import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';

/** The email of the only account allowed to manage the database. Must match
 *  ADMIN_EMAIL on the backend (app/core/deps.py). */
export const ADMIN_EMAIL = 'duy@admin.com';

export function isAdmin(email: string | null | undefined): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!isAdmin(user.email)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Không có quyền truy cập</h1>
          <p className="text-zinc-400">
            Trang này chỉ dành cho tài khoản quản trị (<code className="text-amber-400">{ADMIN_EMAIL}</code>).
            Tài khoản người dùng thông thường không thể chỉnh sửa cơ sở dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
