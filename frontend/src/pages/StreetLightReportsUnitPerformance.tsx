import { useCallback, useEffect, useState } from 'react';
import { getReportUnitPerformance, type UnitPerformanceItem } from '../api/streetLightApi';

const fmt = new Intl.NumberFormat('vi-VN');
const format = (value: number) => fmt.format(Number(value || 0));

const StreetLightReportsUnitPerformance = () => {
  const [rows, setRows] = useState<UnitPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getReportUnitPerformance());
      setError('');
    } catch {
      setError('Không thể tải báo cáo hiệu suất đơn vị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8"><div className="mx-auto max-w-[1700px] space-y-5">
    <section className="rounded-3xl border border-white/80 bg-white px-6 py-6 shadow-sm"><div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Thống kê & báo cáo</div><h1 className="text-3xl font-black text-slate-950">Hiệu suất đơn vị</h1><p className="mt-2 text-sm font-medium text-slate-500">Tổng hợp hiệu suất theo người phụ trách, nhân viên thực hiện và người kiểm tra.</p></section>
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
    <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-lg font-black text-slate-950">Bảng hiệu suất</h2></div>
      {loading ? <div className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải báo cáo...</div> : rows.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có dữ liệu hiệu suất.</div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Nhân sự/đơn vị</th><th className="px-4 py-3">Được giao</th><th className="px-4 py-3">Hoàn thành</th><th className="px-4 py-3">Tồn</th><th className="px-4 py-3">Tỷ lệ</th><th className="px-4 py-3">Biểu đồ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.unit_or_staff} className="hover:bg-blue-50/50"><td className="px-4 py-3 font-bold">{row.unit_or_staff}</td><td className="px-4 py-3">{format(row.assigned_work_orders)}</td><td className="px-4 py-3 text-emerald-700">{format(row.completed_work_orders)}</td><td className="px-4 py-3 text-orange-700">{format(row.pending_work_orders)}</td><td className="px-4 py-3 font-black text-blue-700">{row.completion_rate}%</td><td className="min-w-[220px] px-4 py-3"><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${Math.max(row.completion_rate, row.completion_rate ? 5 : 0)}%` }} /></div></td></tr>)}</tbody></table></div>}
    </section>
  </div></div>;
};

export default StreetLightReportsUnitPerformance;
