import { useCallback, useEffect, useMemo, useState } from 'react';
import { getReportByArea, type ReportByAreaItem } from '../api/streetLightApi';

const fmt = new Intl.NumberFormat('vi-VN');
const format = (value: number) => fmt.format(Number(value || 0));
const cardClass = 'rounded-2xl border border-white/80 bg-white p-5 shadow-sm';

const StreetLightReportsArea = () => {
  const [rows, setRows] = useState<ReportByAreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getReportByArea());
      setError('');
    } catch {
      setError('Không thể tải báo cáo theo khu vực.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    total_lights: acc.total_lights + row.total_lights,
    broken_lights: acc.broken_lights + row.broken_lights,
    total_incidents: acc.total_incidents + row.total_incidents,
    total_work_orders: acc.total_work_orders + row.total_work_orders,
  }), { total_lights: 0, broken_lights: 0, total_incidents: 0, total_work_orders: 0 }), [rows]);
  const maxLights = Math.max(...rows.map((row) => row.total_lights), 1);

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white px-6 py-6 shadow-sm">
          <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Thống kê & báo cáo</div>
          <h1 className="text-3xl font-black text-slate-950">Báo cáo theo khu vực</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Tổng hợp thiết bị, sự cố và phiếu công việc theo từng khu vực quản lý.</p>
        </section>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className={cardClass}><p className="text-sm font-semibold text-slate-500">Tổng đèn</p><p className="mt-2 text-3xl font-black text-slate-950">{format(totals.total_lights)}</p></div>
          <div className={cardClass}><p className="text-sm font-semibold text-slate-500">Đèn hỏng</p><p className="mt-2 text-3xl font-black text-red-600">{format(totals.broken_lights)}</p></div>
          <div className={cardClass}><p className="text-sm font-semibold text-slate-500">Tổng sự cố</p><p className="mt-2 text-3xl font-black text-orange-600">{format(totals.total_incidents)}</p></div>
          <div className={cardClass}><p className="text-sm font-semibold text-slate-500">Phiếu công việc</p><p className="mt-2 text-3xl font-black text-blue-600">{format(totals.total_work_orders)}</p></div>
        </div>

        <section className={cardClass}>
          <h2 className="mb-5 text-lg font-black text-slate-950">Mật độ đèn theo khu vực</h2>
          {loading ? <p className="py-8 text-center text-sm font-semibold text-slate-500">Đang tải báo cáo...</p> : rows.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-slate-500">Chưa có dữ liệu khu vực.</p> : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.khu_vuc} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold"><span>{row.ten_khu_vuc}</span><span>{format(row.total_lights)} đèn</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max((row.total_lights / maxLights) * 100, row.total_lights ? 5 : 0)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-lg font-black text-slate-950">Bảng chi tiết khu vực</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Tổng đèn</th><th className="px-4 py-3">Hoạt động</th><th className="px-4 py-3">Hỏng</th><th className="px-4 py-3">Bảo trì</th><th className="px-4 py-3">Sự cố</th><th className="px-4 py-3">Sự cố mở</th><th className="px-4 py-3">Phiếu CV</th><th className="px-4 py-3">Hoàn thành</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.khu_vuc} className="hover:bg-blue-50/50"><td className="px-4 py-3 font-bold">{row.ten_khu_vuc}</td><td className="px-4 py-3">{format(row.total_lights)}</td><td className="px-4 py-3 text-emerald-700">{format(row.active_lights)}</td><td className="px-4 py-3 text-red-700">{format(row.broken_lights)}</td><td className="px-4 py-3 text-amber-700">{format(row.maintenance_lights)}</td><td className="px-4 py-3">{format(row.total_incidents)}</td><td className="px-4 py-3">{format(row.open_incidents)}</td><td className="px-4 py-3">{format(row.total_work_orders)}</td><td className="px-4 py-3">{format(row.completed_work_orders)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StreetLightReportsArea;
