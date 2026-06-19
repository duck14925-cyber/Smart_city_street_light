import { useCallback, useEffect, useState } from 'react';
import { getReportIncidents, type ReportIncidentsData, type StreetLightChartItem } from '../api/streetLightApi';

const fmt = new Intl.NumberFormat('vi-VN');
const format = (value: number) => fmt.format(Number(value || 0));
const badge = (value?: string) => value === 'Rất cấp tính' || value === 'Cao' ? 'bg-red-50 text-red-700 ring-red-200' : value === 'Đang xử lý' || value === 'Trung bình' ? 'bg-orange-50 text-orange-700 ring-orange-200' : value === 'Đã giải quyết' || value === 'Đã đóng' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-blue-200';

const BarPanel = ({ title, items }: { title: string; items: StreetLightChartItem[] }) => {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  return <section className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm"><h2 className="mb-5 text-lg font-black text-slate-950">{title}</h2>{items.length === 0 ? <p className="py-6 text-center text-sm font-semibold text-slate-500">Chưa có dữ liệu.</p> : <div className="space-y-4">{items.map((item) => <div key={`${title}-${item.label}`} className="space-y-2"><div className="flex justify-between text-sm font-bold"><span>{item.label}</span><span>{format(item.value)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max((Number(item.value) / max) * 100, item.value ? 6 : 0)}%` }} /></div></div>)}</div>}</section>;
};

const StreetLightReportsIncidents = () => {
  const [data, setData] = useState<ReportIncidentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getReportIncidents());
      setError('');
    } catch {
      setError('Không thể tải báo cáo sự cố.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8"><div className="mx-auto max-w-[1700px] space-y-5">
    <section className="rounded-3xl border border-white/80 bg-white px-6 py-6 shadow-sm"><div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Thống kê & báo cáo</div><h1 className="text-3xl font-black text-slate-950">Báo cáo sự cố</h1><p className="mt-2 text-sm font-medium text-slate-500">Theo dõi tình hình sự cố đèn đường theo trạng thái, ưu tiên và khu vực.</p></section>
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
    <div className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">Tổng sự cố</p><p className="mt-2 text-4xl font-black text-orange-600">{format(data?.total_incidents || 0)}</p></div>
    {loading ? <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-slate-500">Đang tải báo cáo...</div> : <>
      <div className="grid gap-4 lg:grid-cols-3"><BarPanel title="Theo trạng thái" items={data?.by_status || []} /><BarPanel title="Theo mức ưu tiên" items={data?.by_priority || []} /><BarPanel title="Theo khu vực" items={data?.by_area || []} /></div>
      <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm"><div className="border-b border-slate-100 px-6 py-4"><h2 className="text-lg font-black text-slate-950">Sự cố gần đây</h2></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Tiêu đề</th><th className="px-4 py-3">Đèn</th><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Ưu tiên</th><th className="px-4 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{(data?.recent_incidents || []).map((item) => <tr key={item.name} className="hover:bg-blue-50/50"><td className="px-4 py-3 font-bold">{item.tieu_de}</td><td className="px-4 py-3">{item.ma_tai_san || '—'}</td><td className="px-4 py-3">{item.ten_khu_vuc || item.khu_vuc || '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(item.muc_do_uu_tien)}`}>{item.muc_do_uu_tien || '—'}</span></td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(item.trang_thai)}`}>{item.trang_thai || '—'}</span></td></tr>)}</tbody></table></div></section>
    </>}
  </div></div>;
};

export default StreetLightReportsIncidents;
