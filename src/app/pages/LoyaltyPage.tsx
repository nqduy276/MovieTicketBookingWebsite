import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { apiGet, apiPost } from '../lib/api';
import type { ApiPromo } from '../types/api';
import { useAuth } from '../lib/auth';
import { Star, AlertCircle, Sparkles, Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

interface RedeemTier {
  points: number;
  percent: number;
}

function fmtDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleString('vi-VN');
}
function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function LoyaltyPage() {
  const { user, refresh } = useAuth();
  const [vouchers, setVouchers] = useState<ApiPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const v = await apiGet<ApiPromo[]>('/api/promo/me');
      setVouchers(v);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadVouchers(); }, []);

  const balance = user?.loyalty_points || 0;
  const tiers: RedeemTier[] = [];
  for (let pts = 500; pts <= Math.min(balance, 5000); pts += 500) {
    tiers.push({ points: pts, percent: (pts / 500) * 10 });
  }

  const redeem = async (pts: number) => {
    setRedeemBusy(true);
    setRedeemMsg(null);
    try {
      const res = await apiPost<{ promo_code: string; discount_percent: number; remaining_points: number }>(
        '/api/loyalty/redeem',
        { points: pts },
      );
      setRedeemMsg({ type: 'ok', text: `Đổi thành công! Mã ${res.promo_code} giảm ${res.discount_percent}%. Điểm còn lại: ${res.remaining_points.toFixed(0)}` });
      await loadVouchers();
      await refresh();
    } catch (e: any) {
      setRedeemMsg({ type: 'err', text: e?.detail?.detail || e?.message || 'Đổi điểm thất bại' });
    } finally {
      setRedeemBusy(false);
    }
  };

  // Recently redeemed vouchers (from loyalty)
  const loyaltyVouchers = vouchers.filter(v => v.code.startsWith('LP'));

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-amber-500 rounded-full" />
            <h1 className="text-3xl font-bold text-white">Đổi điểm thưởng</h1>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300 bg-zinc-900/80 border border-amber-500/20 rounded-xl px-5 py-3">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            <div>
              <p className="text-xs text-zinc-500">Điểm hiện có</p>
              <p className="text-amber-500 font-bold text-2xl">{balance.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Cách tính điểm
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 text-center">
              <p className="text-3xl font-bold text-red-500 mb-1">1,000đ</p>
              <p className="text-zinc-500 text-sm">chi tiêu</p>
              <ArrowRight className="w-4 h-4 text-zinc-600 mx-auto my-2" />
              <p className="text-2xl font-bold text-amber-500">1</p>
              <p className="text-zinc-500 text-sm">điểm thưởng</p>
            </div>
            <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 text-center">
              <p className="text-3xl font-bold text-amber-500 mb-1">500</p>
              <p className="text-zinc-500 text-sm">điểm</p>
              <ArrowRight className="w-4 h-4 text-zinc-600 mx-auto my-2" />
              <p className="text-2xl font-bold text-emerald-400">10%</p>
              <p className="text-zinc-500 text-sm">voucher giảm giá</p>
            </div>
            <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 text-center">
              <p className="text-zinc-400 text-sm mb-1">Voucher có hiệu lực</p>
              <p className="text-3xl font-bold text-white">30</p>
              <p className="text-zinc-500 text-sm">ngày kể từ ngày đổi</p>
            </div>
          </div>
        </div>

        {/* Redemption tiers */}
        {balance >= 500 ? (
          <div className="bg-gradient-to-r from-amber-500/5 via-zinc-900/80 to-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">Chọn mức đổi</h2>
            <p className="text-zinc-400 text-sm mb-5">Nhấn vào mức đổi mong muốn để nhận voucher giảm giá.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {tiers.map(t => (
                <button
                  key={t.points}
                  onClick={() => redeem(t.points)}
                  disabled={redeemBusy}
                  className="bg-zinc-900/80 border border-zinc-800/50 hover:border-amber-500/50 rounded-xl p-4 text-center transition-all hover:bg-amber-500/5 group disabled:opacity-50 hover:scale-105"
                >
                  <div className="text-amber-500 font-bold text-2xl mb-1 group-hover:scale-110 transition-transform">{t.percent}%</div>
                  <div className="text-zinc-400 text-xs">giảm giá</div>
                  <div className="mt-3 pt-3 border-t border-zinc-800/50">
                    <span className="text-white text-sm font-semibold">{t.points}</span>
                    <span className="text-zinc-500 text-xs ml-1">điểm</span>
                  </div>
                </button>
              ))}
            </div>

            {redeemMsg && (
              <p className={`text-sm mt-4 ${redeemMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                {redeemMsg.text}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-8 mb-8 text-center">
            <Star className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 mb-1">Bạn cần ít nhất <span className="text-amber-500 font-bold">500</span> điểm để đổi voucher.</p>
            <p className="text-zinc-500 text-sm">Hãy đặt vé để tích lũy thêm điểm thưởng!</p>
          </div>
        )}

        {/* Recently redeemed vouchers */}
        {loyaltyVouchers.length > 0 && (
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" /> Voucher đã đổi
              </h2>
              <Link to="/vouchers" className="text-sm text-red-500 hover:text-red-400 transition flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loyaltyVouchers.map(v => (
                <div key={v.id} className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-amber-500 font-mono text-sm font-bold">{v.code}</code>
                    <span className="text-white font-semibold text-sm">
                      {v.discount_amount ? fmtVnd(v.discount_amount) : `${v.discount_percent}%`}
                    </span>
                  </div>
                  {v.expires_at && (
                    <p className="text-xs text-zinc-500">HSD: {fmtDate(v.expires_at)}</p>
                  )}
                  {v.note && <p className="text-xs text-zinc-500 mt-1">{v.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
