import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAcceptanceRecord,
  getAcceptanceRecords,
  getMaintenancePlans,
  getStreetLights,
  getWorkOrders,
  updateAcceptanceStatus,
  type AcceptanceRecord,
  type MaintenancePlan,
  type StreetLightRecord,
  type WorkOrder,
} from '../api/streetLightApi';

const ACCEPTANCE_RESULTS = ['Đạt', 'Không đạt', 'Đạt có điều kiện'];
const STATUSES = ['Nháp', 'Đã nghiệm thu', 'Cần làm lại'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const today = () => new Date().toISOString().slice(0, 10);
const badge = (value?: string) => value === 'Không đạt' || value === 'Cần làm lại' ? 'bg-red-50 text-red-700 ring-red-200' : value === 'Đạt có điều kiện' || value === 'Nháp' ? 'bg-amber-50 text-amber-700 ring-amber-200' : value === 'Đạt' || value === 'Đã nghiệm thu' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-blue-200';
const formatDate = (value?: string) => !value ? 'Chưa có' : (Number.isNaN(new Date(value).getTime()) ? value : new Date(value).toLocaleDateString('vi-VN'));

interface AcceptanceForm {
  phieu_cong_viec: string;
  ke_hoach: string;
  thiet_bi: string;
  ngay_nghiem_thu: string;
  nguoi_nghiem_thu: string;
  don_vi_thuc_hien: string;
  ket_qua_nghiem_thu: string;
  noi_dung_nghiem_thu: string;
  kien_nghi: string;
  trang_thai: string;
}

const emptyForm: AcceptanceForm = {
  phieu_cong_viec: '',
  ke_hoach: '',
  thiet_bi: '',
  ngay_nghiem_thu: today(),
  nguoi_nghiem_thu: '',
  don_vi_thuc_hien: '',
  ket_qua_nghiem_thu: 'Đạt',
  noi_dung_nghiem_thu: '',
  kien_nghi: '',
  trang_thai: 'Nháp',
};

const StreetLightAcceptance = () => {
  const [records, setRecords] = useState<AcceptanceRecord[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AcceptanceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordRows, orderRows, planRows, lightRows] = await Promise.all([
        getAcceptanceRecords({ limit: 500 }),
        getWorkOrders({ limit: 500 }),
        getMaintenancePlans({ limit: 500 }),
        getStreetLights({ limit: 500 }),
      ]);
      setRecords(recordRows);
      setOrders(orderRows);
      setPlans(planRows);
      setLights(lightRows);
      setError('');
    } catch {
      setError('Không thể tải biên bản nghiệm thu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedOrder = orders.find((order) => order.name === form.phieu_cong_viec);
  const selectedPlan = plans.find((plan) => plan.name === form.ke_hoach);
  const selectedLight = lights.find((light) => light.name === form.thiet_bi);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return records.filter((record) => {
      const text = [record.ma_bien_ban, record.ma_tai_san, record.ten_tai_san, record.tuyen_duong, record.nguoi_nghiem_thu, record.don_vi_thuc_hien].filter(Boolean).join(' ').toLowerCase();
      return (!keyword || text.includes(keyword)) &&
        (!resultFilter || record.ket_qua_nghiem_thu === resultFilter) &&
        (!statusFilter || record.trang_thai === statusFilter);
    });
  }, [records, resultFilter, search, statusFilter]);

  const saveRecord = async () => {
    if (!form.phieu_cong_viec && !form.thiet_bi) {
      setError('Vui lòng chọn phiếu công việc hoặc thiết bị.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createAcceptanceRecord(form);
      setNotice('Đã tạo biên bản nghiệm thu.');
      setOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setError('Không thể tạo biên bản nghiệm thu.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (record: AcceptanceRecord, status: string) => {
    setUpdating(record.name);
    try {
      await updateAcceptanceStatus(record.name, status);
      setNotice(`Đã cập nhật ${record.ma_bien_ban} thành ${status}.`);
      await loadData();
    } catch {
      setError('Không thể cập nhật trạng thái nghiệm thu.');
    } finally {
      setUpdating('');
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Nghiệm thu</div>
              <h1 className="text-3xl font-black text-slate-950">Biên bản nghiệm thu</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Xác nhận kết quả sau khi hoàn thành phiếu công việc đèn đường.</p>
            </div>
            <button onClick={() => setOpen(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">+ Tạo biên bản</button>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-3">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã biên bản, mã đèn..." className={inputClass} />
            <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} className={inputClass}><option value="">Kết quả nghiệm thu</option>{ACCEPTANCE_RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="">Trạng thái</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
        </section>

        {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black text-slate-950">Danh sách biên bản</h2>
            <span className="text-sm font-bold text-slate-500">Hiển thị {filtered.length} / {records.length}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải biên bản nghiệm thu...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">Chưa có biên bản phù hợp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã biên bản</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Mã đèn</th><th className="px-4 py-3">Tuyến</th><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Người NT</th><th className="px-4 py-3">Đơn vị</th><th className="px-4 py-3">Kết quả</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((record) => (
                    <tr key={record.name} className="hover:bg-blue-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{record.ma_bien_ban}</td>
                      <td className="px-4 py-3">{formatDate(record.ngay_nghiem_thu)}</td>
                      <td className="px-4 py-3 font-semibold">{record.ma_tai_san || '—'}</td>
                      <td className="px-4 py-3">{record.tuyen_duong || '—'}</td>
                      <td className="px-4 py-3">{record.ten_khu_vuc || record.khu_vuc || '—'}</td>
                      <td className="px-4 py-3">{record.nguoi_nghiem_thu || '—'}</td>
                      <td className="px-4 py-3">{record.don_vi_thuc_hien || '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(record.ket_qua_nghiem_thu)}`}>{record.ket_qua_nghiem_thu || '—'}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${badge(record.trang_thai)}`}>{record.trang_thai || '—'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {['Đã nghiệm thu', 'Cần làm lại'].map((status) => <button key={status} disabled={updating === record.name || record.trang_thai === status} onClick={() => changeStatus(record, status)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-blue-100 disabled:opacity-50">{status}</button>)}
                        </div>
                      </td>
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
              <div><h2 className="text-2xl font-black text-slate-950">Tạo biên bản nghiệm thu</h2><p className="text-sm font-medium text-slate-500">Chọn phiếu công việc để tự điền thiết bị/kế hoạch.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Đóng</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-slate-700">Phiếu công việc<select value={form.phieu_cong_viec} onChange={(event) => setForm({ ...form, phieu_cong_viec: event.target.value, thiet_bi: event.target.value ? '' : form.thiet_bi })} className={inputClass}><option value="">Không chọn</option>{orders.map((order) => <option key={order.name} value={order.name}>{order.ma_phieu} - {order.tieu_de}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Kế hoạch nếu có<select value={form.ke_hoach} onChange={(event) => setForm({ ...form, ke_hoach: event.target.value })} className={inputClass}><option value="">Không chọn</option>{plans.map((plan) => <option key={plan.name} value={plan.name}>{plan.ma_ke_hoach} - {plan.ten_ke_hoach}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Thiết bị nếu không có phiếu<select value={form.thiet_bi} onChange={(event) => setForm({ ...form, thiet_bi: event.target.value })} disabled={Boolean(form.phieu_cong_viec)} className={inputClass}><option value="">Chọn thiết bị</option>{lights.map((light) => <option key={light.name} value={light.name}>{light.ma_tai_san} - {light.ten_tai_san}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Ngày nghiệm thu<input type="date" value={form.ngay_nghiem_thu} onChange={(event) => setForm({ ...form, ngay_nghiem_thu: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Người nghiệm thu<input value={form.nguoi_nghiem_thu} onChange={(event) => setForm({ ...form, nguoi_nghiem_thu: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Đơn vị thực hiện<input value={form.don_vi_thuc_hien} onChange={(event) => setForm({ ...form, don_vi_thuc_hien: event.target.value })} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Kết quả nghiệm thu<select value={form.ket_qua_nghiem_thu} onChange={(event) => setForm({ ...form, ket_qua_nghiem_thu: event.target.value })} className={inputClass}>{ACCEPTANCE_RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700">Trạng thái<select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value })} className={inputClass}>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Nội dung nghiệm thu<textarea value={form.noi_dung_nghiem_thu} onChange={(event) => setForm({ ...form, noi_dung_nghiem_thu: event.target.value })} rows={3} className={inputClass} /></label>
              <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">Kiến nghị<textarea value={form.kien_nghi} onChange={(event) => setForm({ ...form, kien_nghi: event.target.value })} rows={2} className={inputClass} /></label>
            </div>
            {(selectedOrder || selectedPlan || selectedLight) ? <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Liên kết: {selectedOrder ? `${selectedOrder.ma_phieu} - ${selectedOrder.ma_tai_san || ''}` : selectedPlan ? `${selectedPlan.ma_ke_hoach} - ${selectedPlan.ten_ke_hoach}` : `${selectedLight?.ma_tai_san} - ${selectedLight?.ten_tai_san}`}</div> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700">Hủy</button>
              <button onClick={saveRecord} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu biên bản'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StreetLightAcceptance;
