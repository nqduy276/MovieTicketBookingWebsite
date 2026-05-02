import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { apiGet } from '../lib/api';
import type { ApiPromo } from '../types/api';
import { useAuth } from '../lib/auth';
import { Gift, AlertCircle, Ticket, Copy, Check } from 'lucide-react';

function fmtDate(s?: string | null) {
  if (!s) return '';
  return new Date(s).toLocaleString('vi-VN');
}
function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function VouchersPage() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const [vouchers, setVouchers] = useState<ApiPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ApiPromo[]>('/api/promo/me')
      .then(setVouchers)
      .catch((e) => setError(e?.message || 'Không tải được voucher'))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categorize vouchers
  const loyaltyVouchers = vouchers.filter(v => v.code.startsWith('LP'));
  const refundVouchers = vouchers.filter(v => v.code.startsWith('VC'));
  const otherVouchers = vouchers.filter(v => !v.code.startsWith('LP') && !v.code.startsWith('VC'));

  const renderVoucherCard = (v: ApiPromo) => {
    const isLoyalty = v.code.startsWith('LP');
    const isRefund = v.code.startsWith('VC');
    const borderColor = isLoyalty ? 'border-amber-500/20 hover:border-amber-500/40' : isRefund ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-red-600/20 hover:border-red-600/40';
    const accentColor = isLoyalty ? 'text-amber-500' : isRefund ? 'text-emerald-400' : 'text-red-500';

    return (
      <div key={v.id} className={`bg-zinc-950/80 border ${borderColor} rounded-xl p-5 transition-all group relative`}>
        {/* Type badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            isLoyalty ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' :
            isRefund ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
            'border-red-500/30 text-red-500 bg-red-500/5'
          }`}>
            {isLoyalty ? 'Đổi điểm' : isRefund ? 'Hoàn vé' : 'Khuyến mãi'}
          </span>
          <span className="text-white font-bold text-lg">
            {v.discount_amount ? fmtVnd(v.discount_amount) : `${v.discount_percent}%`}
          </span>
        </div>

        {/* Code */}
        <div className="flex items-center gap-2 mb-3">
          <code className={`${accentColor} font-mono text-base font-bold tracking-wider`}>{v.code}</code>
          <button
            onClick={() => copyCode(v.id, v.code)}
            className="text-zinc-500 hover:text-white transition p-1 rounded"
            title="Sao chép mã"
          >
            {copiedId === v.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Details */}
        <div className="space-y-1">
          {v.expires_at && (
            <p className="text-xs text-zinc-500">
              HSD: <span className="text-zinc-400">{fmtDate(v.expires_at)}</span>
            </p>
          )}
          {v.note && <p className="text-xs text-zinc-500">{v.note}</p>}
        </div>

        {/* Usage hint */}
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600">Nhập mã này khi thanh toán để áp dụng giảm giá</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-red-600 rounded-full" />
          <h1 className="text-3xl font-bold text-white">Voucher của tôi</h1>
          <span className="bg-red-600/10 text-red-500 text-sm font-semibold px-3 py-1 rounded-full">
            {vouchers.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/80 border border-zinc-800/50 rounded-xl">
            <Gift className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg mb-2">Bạn chưa có voucher nào.</p>
            <p className="text-zinc-500 text-sm">
              {isCustomer
                ? 'Đổi điểm thưởng hoặc huỷ vé để nhận voucher.'
                : 'Voucher cá nhân của nhân viên sẽ xuất hiện tại đây.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Loyalty vouchers */}
            {loyaltyVouchers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Voucher đổi điểm ({loyaltyVouchers.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loyaltyVouchers.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Refund vouchers */}
            {refundVouchers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Voucher hoàn vé ({refundVouchers.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {refundVouchers.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Other vouchers */}
            {otherVouchers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Khuyến mãi khác ({otherVouchers.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherVouchers.map(renderVoucherCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
