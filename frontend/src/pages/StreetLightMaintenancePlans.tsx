import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createMaintenancePlan,
  getMaintenancePlans,
  getStreetLights,
  updateMaintenancePlanStatus,
  type MaintenancePlan,
  type StreetLightRecord,
} from '../api/streetLightApi';

const PLAN_TYPES = ['Bảo trì định kỳ', 'Sửa chữa sự cố', 'Thay thế thiết bị', 'Kiểm tra an toàn'];
const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUSES = ['Lập kế hoạch', 'Đang thực hiện', 'Hoàn thành', 'Hủy'];

const badge = (value?: string) =>
  value === 'Khẩn cấp' || value === 'Hủy'
    ? 'bg-red-50 text-red-700 ring-red-200'
    : value === 'Cao' || value === 'Đang thực hiện'
      ? 'bg-orange-50 text-orange-700 ring-orange-200'
      : value === 'Hoàn thành'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : 'bg-blue-50 text-blue-700 ring-blue-200';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const today = () => new Date().toISOString().slice(0, 10);

interface PlanForm {
  ten_ke_hoach: string;
  loai_ke_hoach: string;
  muc_uu_tien: string;
  thiet_bi: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  noi_dung: string;
  nguoi_phu_trach: string;
}

const emptyForm: PlanForm = {
  ten_ke_hoach: '',
  loai_ke_hoach: PLAN_TYPES[0],
  muc_uu_tien: 'Trung bình',
  thiet_bi: '',
  ngay_bat_dau: today(),
  ngay_ket_thuc: '',
  noi_dung: '',
  nguoi_phu_trach: '',
};

const unique = (items: MaintenancePlan[], key: keyof MaintenancePlan) =>
  Array.from(new Set(items.map((item) => item[key]).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, 'vi-VN')
  );

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const StreetLightMaintenancePlans = () => {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planRows, lightRows] = await Promise.all([
        getMaintenancePlans({ limit: 500 }),
        getStreetLights({ limit: 500 }),
      ]);
      setPlans(planRows);
      setLights(lightRows);
      setError('');
    } catch {
      setError('Không thể tải kế hoạch bảo trì.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const areaOptions = useMemo(() => unique(plans, 'ten_khu_vuc'), [plans]);
  const routeOptions = useMemo(() => unique(plans, 'tuyen_duong'), [plans]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const text = [plan.ma_ke_hoach, plan.ten_ke_hoach, plan.ma_tai_san, plan.ten_tai_san, plan.tuyen_duong].filter(Boolean).join(' ').toLowerCase();
      return (!keyword || text.includes(keyword)) &&
        (!typeFilter || plan.loai_ke_hoach === typeFilter) &&
        (!priorityFilter || plan.muc_uu_tien === priorityFilter) &&
        (!statusFilter || plan.trang_thai === statusFilter) &&
        (!areaFilter || plan.ten_khu_vuc === areaFilter || plan.khu_vuc === areaFilter) &&
        (!routeFilter || plan.tuyen_duong === routeFilter);
    });
  }, [areaFilter, plans, priorityFilter, routeFilter, search, statusFilter, typeFilter]);

  const selectedLight = lights.find((light) => light.name === form.thiet_bi);

  const savePlan = async () => {
    if (!form.ten_ke_hoach.trim()) {
      setError('Vui lòng nhập tên kế hoạch.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createMaintenancePlan(form);
      setNotice('Đã tạo kế hoạch bảo trì.');
      setOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setError('Không thể tạo kế hoạch bảo trì.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (plan: MaintenancePlan, status: string) => {
    setUpdating(plan.name);
    try {
      await updateMaintenancePlanStatus(plan.name, status);
      setNotice(`Đã cập nhật ${plan.ma_ke_hoach} thành ${status}.`);
      await loadData();
    } catch {
      setError('Không thể cập nhật trạng thái kế hoạch.');
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
              <h1 className="text-3xl font-black text-slate-950">Kế hoạch bảo trì</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Lập kế hoạch bảo trì, sửa chữa, thay thế thiết bị đèn đường.</p>
            </div>
            <button onClick={() => setOpen(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">+ Tạo kế hoạch</button>
          </div>
          <div className="space-y-4 p-6">
            {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
            {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_160px_170px_180px_180px]">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã, tên kế hoạch, mã đèn..." className={inputClass} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}><option value="">Loại kế hoạch</option>{PLAN_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputClass}><option value="">Ưu tiên</option>{PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}><option value="">Trạng thái</option>{STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={inputClass}><option value="">Khu vực</option>{areaOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className={inputClass}><option value="">Tuyến</option>{routeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            </div>
            <p className="text-sm font-bold text-slate-500">Hiển thị {filtered.length} / {plans.length} kế hoạch</p>
          </div>
        </section>
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          {loading ? <div className="p-8 text-sm font-bold text-slate-500">Đang tải...</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm font-bold text-slate-500">Chưa có kế hoạch phù hợp.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>{['Mã', 'Tên kế hoạch', 'Loại', 'Ưu tiên', 'Đèn', 'Tuyến', 'Khu vực', 'Bắt đầu', 'Kết thúc', 'Phụ trách', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{filtered.map((plan) => (
                  <tr key={plan.name} className="hover:bg-blue-50/40">
                    <td className="px-5 py-4 font-mono text-sm font-black text-blue-700">{plan.ma_ke_hoach}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{plan.ten_ke_hoach}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.loai_ke_hoach}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(plan.muc_uu_tien)}`}>{plan.muc_uu_tien}</span></td>
                    <td className="px-5 py-4 text-sm"><p className="font-mono font-bold">{plan.ma_tai_san || '—'}</p><p className="text-xs text-slate-400">{plan.ten_tai_san}</p></td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.tuyen_duong || '—'}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.ten_khu_vuc || plan.khu_vuc || '—'}</td>
                    <td className="px-5 py-4 text-sm">{formatDate(plan.ngay_bat_dau)}</td>
                    <td className="px-5 py-4 text-sm">{formatDate(plan.ngay_ket_thuc)}</td>
                    <td className="px-5 py-4 text-sm font-semibold">{plan.nguoi_phu_trach || '—'}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(plan.trang_thai)}`}>{plan.trang_thai}</span></td>
                    <td className="px-5 py-4"><div className="flex gap-2">{['Đang thực hiện', 'Hoàn thành', 'Hủy'].map((s) => <button key={s} disabled={updating === plan.name || plan.trang_thai === s} onClick={() => changeStatus(plan, s)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40">{s}</button>)}</div></td>
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
            <div className="flex justify-between border-b border-slate-100 px-6 py-5"><h2 className="text-2xl font-black">Tạo kế hoạch bảo trì</h2><button onClick={() => setOpen(false)}>✕</button></div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <input value={form.ten_ke_hoach} onChange={(e) => setForm({...form, ten_ke_hoach: e.target.value})} placeholder="Tên kế hoạch" className={inputClass} />
              <select value={form.thiet_bi} onChange={(e) => setForm({...form, thiet_bi: e.target.value})} className={inputClass}><option value="">Chọn thiết bị</option>{lights.map((l) => <option key={l.name} value={l.name}>{l.ma_tai_san} - {l.ten_tai_san}</option>)}</select>
              <select value={form.loai_ke_hoach} onChange={(e) => setForm({...form, loai_ke_hoach: e.target.value})} className={inputClass}>{PLAN_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              <select value={form.muc_uu_tien} onChange={(e) => setForm({...form, muc_uu_tien: e.target.value})} className={inputClass}>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select>
              <input type="date" value={form.ngay_bat_dau} onChange={(e) => setForm({...form, ngay_bat_dau: e.target.value})} className={inputClass} />
              <input type="date" value={form.ngay_ket_thuc} onChange={(e) => setForm({...form, ngay_ket_thuc: e.target.value})} className={inputClass} />
              <input value={form.nguoi_phu_trach} onChange={(e) => setForm({...form, nguoi_phu_trach: e.target.value})} placeholder="Người phụ trách" className={inputClass} />
              {selectedLight ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{selectedLight.ma_tai_san} · {selectedLight.route_name || 'Chưa có tuyến'} · {selectedLight.ten_khu_vuc || selectedLight.khu_vuc}</div> : null}
              <textarea value={form.noi_dung} onChange={(e) => setForm({...form, noi_dung: e.target.value})} placeholder="Nội dung" rows={4} className={`${inputClass} md:col-span-2`} />
            </div>
            <div className="flex gap-3 border-t px-6 py-5"><button onClick={() => setOpen(false)} className="flex-1 rounded-xl border px-4 py-2.5 font-bold">Hủy</button><button onClick={savePlan} disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StreetLightMaintenancePlans;
