import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createWorkOrder,
  getMaintenancePlans,
  getStreetLights,
  getWorkOrders,
  updateWorkOrderStatus,
  type MaintenancePlan,
  type StreetLightRecord,
  type WorkOrder,
} from '../api/streetLightApi';

const JOB_TYPES = ['Kiểm tra', 'Bảo trì', 'Sửa chữa', 'Thay thế', 'Vệ sinh'];
const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUSES = ['Mới', 'Đang thực hiện', 'Hoàn thành', 'Hủy'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const today = () => new Date().toISOString().slice(0, 10);
const badge = (value?: string) => value === 'Khẩn cấp' || value === 'Hủy' ? 'bg-red-50 text-red-700 ring-red-200' : value === 'Cao' || value === 'Đang thực hiện' ? 'bg-orange-50 text-orange-700 ring-orange-200' : value === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-blue-200';
const formatDate = (value?: string) => !value ? 'Chưa có' : (Number.isNaN(new Date(value).getTime()) ? value : new Date(value).toLocaleDateString('vi-VN'));

interface WorkForm {
  tieu_de: string;
  ke_hoach: string;
  thiet_bi: string;
  loai_cong_viec: string;
  muc_uu_tien: string;
  ngay_thuc_hien: string;
  nhan_vien_thuc_hien: string;
  mo_ta_cong_viec: string;
}

const emptyForm: WorkForm = {
  tieu_de: '',
  ke_hoach: '',
  thiet_bi: '',
  loai_cong_viec: 'Bảo trì',
  muc_uu_tien: 'Trung bình',
  ngay_thuc_hien: today(),
  nhan_vien_thuc_hien: '',
  mo_ta_cong_viec: '',
};

const StreetLightWorkOrders = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WorkForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRows, planRows, lightRows] = await Promise.all([
        getWorkOrders({ limit: 500 }),
        getMaintenancePlans({ limit: 500 }),
        getStreetLights({ limit: 500 }),
      ]);
      setOrders(orderRows);
      setPlans(planRows);
      setLights(lightRows);
      setError('');
    } catch {
      setError('Không thể tải danh sách phiếu công việc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPlan = plans.find((plan) => plan.name === form.ke_hoach);
  const selectedLight = lights.find((light) => light.name === form.thiet_bi);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((order) => {
      const text = [order.ma_phieu, order.tieu_de, order.ma_tai_san, order.ten_tai_san, order.tuyen_duong, order.nhan_vien_thuc_hien].filter(Boolean).join(' ').toLowerCase();
      return (!keyword || text.includes(keyword)) &&
        (!typeFilter || order.loai_cong_viec === typeFilter) &&
        (!priorityFilter || order.muc_uu_tien === priorityFilter) &&
        (!statusFilter || order.trang_thai === statusFilter);
    });
  }, [orders, priorityFilter, search, statusFilter, typeFilter]);

  const saveOrder = async () => {
    if (!form.tieu_de.trim()) {
      setError('Vui lòng nhập tiêu đề phiếu công việc.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createWorkOrder(form);
      setNotice('Đã tạo phiếu công việc.');
      setOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setError('Không thể tạo phiếu công việc.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (order: WorkOrder, status: string) => {
    setUpdating(order.name);
    try {
      await updateWorkOrderStatus(order.name, status);
      setNotice(`Đã cập nhật ${order.ma_phieu} thành ${status}.`);
      await loadData();
    } catch {
      setError('Không thể cập nhật trạng thái phiếu công việc.');
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
              <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Kế hoạch & thi công</div>
              <h1 className="text-3xl font-black text-slate-950">Phiếu công việc</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Giao việc kiểm tra, bảo trì, sửa chữa, thay thế và vệ sinh đèn đường.</p>
            </div>
            <button onClick={() => setOpen(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">+ Tạo phiếu công việc</button>
          </div>
          <div className="space-y-4 p-6">
            {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
            {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px_170px]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã phiếu, tiêu đề, mã đèn..." className={inputClass} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}><option value="">Loại công việc</option>{JOB_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputClass}><option value="">Ưu tiên</option>{PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}><option value="">Trạng thái</option>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            </div>
            <p className="text-sm font-bold text-slate-500">Hiển thị {filtered.length} / {orders.length} phiếu</p>
          </div>
        </section>
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          {loading ? <div className="p-8 text-sm font-bold text-slate-500">Đang tải...</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm font-bold text-slate-500">Chưa có phiếu công việc phù hợp.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>{['Mã phiếu', 'Tiêu đề', 'Kế hoạch', 'Đèn', 'Tuyến', 'Khu vực', 'Loại', 'Ưu tiên', 'Ngày TH', 'Nhân viên', 'Kết quả', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map((order) => (
                  <tr key={order.name} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-mono text-sm font-black text-blue-700">{order.ma_phieu}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{order.tieu_de}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{order.ke_hoach || '—'}</td>
                    <td className="px-5 py-4 text-sm"><p className="font-mono font-bold">{order.ma_tai_san || '—'}</p><p className="text-xs text-slate-400">{order.ten_tai_san}</p></td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{order.tuyen_duong || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{order.ten_khu_vuc || order.khu_vuc || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{order.loai_cong_viec}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(order.muc_uu_tien)}`}>{order.muc_uu_tien}</span></td>
                    <td className="px-5 py-4 text-sm">{formatDate(order.ngay_thuc_hien)}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{order.nhan_vien_thuc_hien || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{order.ket_qua || 'Chưa thực hiện'}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(order.trang_thai)}`}>{order.trang_thai}</span></td>
                    <td className="px-5 py-4"><div className="flex gap-2">{['Đang thực hiện', 'Hoàn thành', 'Hủy'].map((s) => <button key={s} disabled={updating === order.name || order.trang_thai === s} onClick={() => changeStatus(order, s)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40">{s}</button>)}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex justify-between border-b border-slate-100 px-6 py-5"><h2 className="text-2xl font-black">Tạo phiếu công việc</h2><button onClick={() => setOpen(false)}>✕</button></div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <input value={form.tieu_de} onChange={(e) => setForm({...form, tieu_de: e.target.value})} placeholder="Tiêu đề" className={inputClass} />
              <select value={form.ke_hoach} onChange={(e) => setForm({...form, ke_hoach: e.target.value})} className={inputClass}><option value="">Chọn kế hoạch nếu có</option>{plans.map((p) => <option key={p.name} value={p.name}>{p.ma_ke_hoach} - {p.ten_ke_hoach}</option>)}</select>
              <select value={form.thiet_bi} onChange={(e) => setForm({...form, thiet_bi: e.target.value})} className={inputClass}><option value="">Chọn thiết bị</option>{lights.map((l) => <option key={l.name} value={l.name}>{l.ma_tai_san} - {l.ten_tai_san}</option>)}</select>
              <select value={form.loai_cong_viec} onChange={(e) => setForm({...form, loai_cong_viec: e.target.value})} className={inputClass}>{JOB_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              <select value={form.muc_uu_tien} onChange={(e) => setForm({...form, muc_uu_tien: e.target.value})} className={inputClass}>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select>
              <input type="date" value={form.ngay_thuc_hien} onChange={(e) => setForm({...form, ngay_thuc_hien: e.target.value})} className={inputClass} />
              <input value={form.nhan_vien_thuc_hien} onChange={(e) => setForm({...form, nhan_vien_thuc_hien: e.target.value})} placeholder="Nhân viên thực hiện" className={inputClass} />
              {selectedPlan ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">Kế hoạch: {selectedPlan.ma_ke_hoach}</div> : selectedLight ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{selectedLight.ma_tai_san} · {selectedLight.route_name || 'Chưa có tuyến'}</div> : null}
              <textarea value={form.mo_ta_cong_viec} onChange={(e) => setForm({...form, mo_ta_cong_viec: e.target.value})} placeholder="Mô tả công việc" rows={4} className={`${inputClass} md:col-span-2`} />
            </div>
            <div className="flex gap-3 border-t px-6 py-5"><button onClick={() => setOpen(false)} className="flex-1 rounded-xl border px-4 py-2.5 font-bold">Hủy</button><button onClick={saveOrder} disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StreetLightWorkOrders;
