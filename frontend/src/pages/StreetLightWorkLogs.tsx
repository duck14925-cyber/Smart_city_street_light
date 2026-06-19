import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createWorkLog,
  getStreetLights,
  getWorkLogs,
  getWorkOrders,
  type StreetLightRecord,
  type WorkLog,
  type WorkOrder,
} from '../api/streetLightApi';

const ACTION_TYPES = ['Kiểm tra', 'Sửa chữa', 'Thay thế', 'Bảo trì', 'Vệ sinh', 'Khác'];
const RESULTS = ['Đạt', 'Chưa đạt', 'Cần xử lý thêm'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const today = () => new Date().toISOString().slice(0, 10);
const badge = (value?: string) => value === 'Chưa đạt' ? 'bg-red-50 text-red-700 ring-red-200' : value === 'Cần xử lý thêm' ? 'bg-orange-50 text-orange-700 ring-orange-200' : value === 'Đạt' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-blue-200';
const formatDate = (value?: string) => !value ? 'Chưa có' : (Number.isNaN(new Date(value).getTime()) ? value : new Date(value).toLocaleDateString('vi-VN'));

interface WorkLogForm {
  phieu_cong_viec: string;
  thiet_bi: string;
  ngay_thi_cong: string;
  loai_hanh_dong: string;
  noi_dung_thuc_hien: string;
  vat_tu_su_dung: string;
  nhan_su_thuc_hien: string;
  thoi_gian_bat_dau: string;
  thoi_gian_ket_thuc: string;
  ket_qua: string;
  ghi_chu: string;
}

const emptyForm: WorkLogForm = {
  phieu_cong_viec: '',
  thiet_bi: '',
  ngay_thi_cong: today(),
  loai_hanh_dong: 'Bảo trì',
  noi_dung_thuc_hien: '',
  vat_tu_su_dung: '',
  nhan_su_thuc_hien: '',
  thoi_gian_bat_dau: '',
  thoi_gian_ket_thuc: '',
  ket_qua: 'Đạt',
  ghi_chu: '',
};

const StreetLightWorkLogs = () => {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WorkLogForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRows, orderRows, lightRows] = await Promise.all([
        getWorkLogs({ limit: 500 }),
        getWorkOrders({ limit: 500 }),
        getStreetLights({ limit: 500 }),
      ]);
      setLogs(logRows);
      setOrders(orderRows);
      setLights(lightRows);
      setError('');
    } catch {
      setError('Không thể tải nhật ký thi công.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedOrder = orders.find((order) => order.name === form.phieu_cong_viec);
  const selectedLight = lights.find((light) => light.name === form.thiet_bi);
  const routes = Array.from(new Set(logs.map((log) => log.tuyen_duong).filter(Boolean))).sort();
  const areas = Array.from(new Set(logs.map((log) => log.ten_khu_vuc || log.khu_vuc).filter(Boolean))).sort();

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return logs.filter((log) => {
      const areaName = log.ten_khu_vuc || log.khu_vuc || '';
      const text = [log.ma_nhat_ky, log.ma_tai_san, log.ten_tai_san, log.tuyen_duong, areaName, log.noi_dung_thuc_hien, log.nhan_su_thuc_hien].filter(Boolean).join(' ').toLowerCase();
      return (!keyword || text.includes(keyword)) &&
        (!actionFilter || log.loai_hanh_dong === actionFilter) &&
        (!resultFilter || log.ket_qua === resultFilter) &&
        (!routeFilter || log.tuyen_duong === routeFilter) &&
        (!areaFilter || areaName === areaFilter);
    });
  }, [actionFilter, areaFilter, logs, resultFilter, routeFilter, search]);

  const saveLog = async () => {
    if (!form.phieu_cong_viec && !form.thiet_bi) {
      setError('Vui lòng chọn phiếu công việc hoặc thiết bị.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createWorkLog(form);
      setNotice('Đã thêm nhật ký thi công.');
      setOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setError('Không thể tạo nhật ký thi công.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Thi công</div>
              <h1 className="text-3xl font-black text-slate-950">Nhật ký thi công</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Ghi nhận quá trình kiểm tra, sửa chữa, bảo trì và vật tư sử dụng cho đèn đường.</p>
            </div>
            <button onClick={() => setOpen(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">+ Thêm nhật ký</button>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-5">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã nhật ký, mã đèn, nội dung..." className={inputClass} />
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className={inputClass}><option value="">Loại hành động</option>{ACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} className={inputClass}><option value="">Kết quả</option>{RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} className={inputClass}><option value="">Tuyến đường</option>{routes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className={inputClass}><option value="">Khu vực</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black text-slate-950">Danh sách nhật ký</h2>
            <span className="text-sm font-bold text-slate-500">Hiển thị {filtered.length} / {logs.length}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải nhật ký thi công...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">Chưa có nhật ký phù hợp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã nhật ký</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Mã đèn</th><th className="px-4 py-3">Tuyến</th><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Hành động</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Vật tư</th><th className="px-4 py-3">Nhân sự</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((log) => (
                    <tr key={log.name} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{log.ma_nhat_ky}</td>
                      <td className="px-4 py-3">{formatDate(log.ngay_thi_cong)}</td>
                      <td className="px-4 py-3 font-semibold">{log.ma_tai_san || '—'}</td>
                      <td className="px-4 py-3">{log.tuyen_duong || '—'}</td>
                      <td className="px-4 py-3">{log.ten_khu_vuc || log.khu_vuc || '—'}</td>
                      <td className="px-4 py-3">{log.loai_hanh_dong || '—'}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">{log.noi_dung_thuc_hien || '—'}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">{log.vat_tu_su_dung || '—'}</td>
                      <td className="px-4 py-3">{log.nhan_su_thuc_hien || '—'}</td>
                      <td className="px-4 py-3">{log.thoi_gian_bat_dau || '—'} - {log.thoi_gian_ket_thuc || '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(log.ket_qua)}`}>{log.ket_qua || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-2xl font-black text-slate-950">Thêm nhật ký thi công</h2><p className="text-sm font-medium text-slate-500">Chọn phiếu công việc để tự điền thông tin thiết bị.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Đóng</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-slate-700">Phiếu công việc<select value={form.phieu_cong_viec} onChange={(event) => setForm({ ...form, phieu_cong_viec: event.target.value, thiet_bi: event.target.value ? '' : form.thiet_bi })} className={inputClass}><option value="">Không chọn</option>{orders.map((order) => <option key={order.name} value={order.name}>{order.ma_phieu} - {order.tieu_de}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Thiết bị nếu không có phiếu<select value={form.thiet_bi} onChange={(event) => setForm({ ...form, thiet_bi: event.target.value })} disabled={Boolean(form.phieu_cong_viec)} className={inputClass}><option value="">Chọn thiết bị</option>{lights.map((light) => <option key={light.name} value={light.name}>{light.ma_tai_san} - {light.ten_tai_san}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Ngày thi công<input type="date" value={form.ngay_thi_cong} onChange={(event) => setForm({ ...form, ngay_thi_cong: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Loại hành động<select value={form.loai_hanh_dong} onChange={(event) => setForm({ ...form, loai_hanh_dong: event.target.value })} className={inputClass}>{ACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Thời gian bắt đầu<input type="time" value={form.thoi_gian_bat_dau} onChange={(event) => setForm({ ...form, thoi_gian_bat_dau: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Thời gian kết thúc<input type="time" value={form.thoi_gian_ket_thuc} onChange={(event) => setForm({ ...form, thoi_gian_ket_thuc: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Nhân sự thực hiện<input value={form.nhan_su_thuc_hien} onChange={(event) => setForm({ ...form, nhan_su_thuc_hien: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Kết quả<select value={form.ket_qua} onChange={(event) => setForm({ ...form, ket_qua: event.target.value })} className={inputClass}>{RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Nội dung thực hiện<textarea value={form.noi_dung_thuc_hien} onChange={(event) => setForm({ ...form, noi_dung_thuc_hien: event.target.value })} rows={3} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Vật tư sử dụng<textarea value={form.vat_tu_su_dung} onChange={(event) => setForm({ ...form, vat_tu_su_dung: event.target.value })} rows={2} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Ghi chú<textarea value={form.ghi_chu} onChange={(event) => setForm({ ...form, ghi_chu: event.target.value })} rows={2} className={inputClass} /></label>
            </div>
            {(selectedOrder || selectedLight) ? <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Tự điền từ: {selectedOrder ? `${selectedOrder.ma_phieu} - ${selectedOrder.ma_tai_san || ''}` : `${selectedLight?.ma_tai_san} - ${selectedLight?.ten_tai_san}`}</div> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700">Hủy</button>
              <button onClick={saveLog} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu nhật ký'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StreetLightWorkLogs;
