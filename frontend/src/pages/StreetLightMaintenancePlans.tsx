import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createMaintenancePlan,
  getMaintenancePlans,
  getStreetLights,
  updateMaintenancePlanStatus,
  type MaintenancePlan,
  type StreetLightRecord,
} from '../api/streetLightApi';
import StreetLightMultiPicker from '../components/street-light/StreetLightMultiPicker';

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

interface PlanFormState {
  scope_type: 'Một đèn' | 'Nhiều đèn';
  ten_ke_hoach: string;
  loai_ke_hoach: string;
  muc_uu_tien: string;
  thiet_bi: string;
  ma_tai_san: string;
  ten_tai_san: string;
  tuyen_duong: string;
  khu_vuc: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  noi_dung: string;
  nguoi_phu_trach: string;
  related_lights: StreetLightRecord[];
}

const emptyForm: PlanFormState = {
  scope_type: 'Một đèn',
  ten_ke_hoach: '',
  loai_ke_hoach: PLAN_TYPES[0],
  muc_uu_tien: 'Trung bình',
  thiet_bi: '',
  ma_tai_san: '',
  ten_tai_san: '',
  tuyen_duong: '',
  khu_vuc: '',
  ngay_bat_dau: today(),
  ngay_ket_thuc: '',
  noi_dung: '',
  nguoi_phu_trach: '',
  related_lights: [],
};

const unique = (items: MaintenancePlan[], getter: (item: MaintenancePlan) => string | undefined) =>
  Array.from(new Set(items.map(getter).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, 'vi-VN')
  );

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const PlanDetailModal = ({
  plan,
  onClose,
}: {
  plan: MaintenancePlan;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Chi tiết kế hoạch bảo trì</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{plan.ma_ke_hoach}</h2>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700">
          ✕
        </button>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
        {[
          ['Tên kế hoạch', plan.ten_ke_hoach || 'Chưa xác định'],
          ['Loại kế hoạch', plan.loai_ke_hoach || 'Chưa xác định'],
          ['Mức ưu tiên', plan.muc_uu_tien || 'Chưa xác định'],
          ['Trạng thái', plan.trang_thai || 'Chưa xác định'],
          ['Mã tài sản', plan.ma_tai_san || 'Chưa xác định'],
          ['Tên tài sản', plan.ten_tai_san || 'Chưa xác định'],
          ['Tuyến đường', plan.tuyen_duong || 'Chưa xác định'],
          ['Khu vực', plan.ten_khu_vuc || plan.khu_vuc || 'Chưa xác định'],
          ['Ngày bắt đầu', formatDate(plan.ngay_bat_dau)],
          ['Ngày kết thúc', formatDate(plan.ngay_ket_thuc)],
          ['Người phụ trách', plan.nguoi_phu_trach || 'Chưa có'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nội dung bảo trì</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
            {plan.noi_dung || 'Chưa có nội dung.'}
          </p>
        </div>

        {plan.related_lights && plan.related_lights.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Danh sách đèn trong kế hoạch ({plan.related_lights.length} thiết bị)
            </p>
            <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2">Mã đèn</th>
                    <th className="px-3 py-2">Tên đèn</th>
                    <th className="px-3 py-2">Tuyến đường</th>
                    <th className="px-3 py-2">Khu vực</th>
                    <th className="px-3 py-2">Tọa độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {plan.related_lights.map((light: any) => (
                    <tr key={light.name || light.ma_tai_san} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-bold text-slate-900">{light.ma_tai_san}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{light.ten_tai_san || '—'}</td>
                      <td className="px-3 py-2">{light.route_name || light.tuyen_duong || '—'}</td>
                      <td className="px-3 py-2">{light.ten_khu_vuc || light.khu_vuc || '—'}</td>
                      <td className="px-3 py-2 font-mono">
                        {light.latitude !== null && light.longitude !== null && light.latitude !== undefined && light.longitude !== undefined
                          ? `${Number(light.latitude).toFixed(6)}, ${Number(light.longitude).toFixed(6)}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-100 px-6 py-5">
        <button onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">
          Đóng
        </button>
      </div>
    </div>
  </div>
);

const CreatePlanModal = ({
  form,
  lights,
  saving,
  error,
  onChange,
  onSelectLight,
  onRelatedLightsChange,
  onClose,
  onSave,
}: {
  form: PlanFormState;
  lights: StreetLightRecord[];
  saving: boolean;
  error: string;
  onChange: (field: keyof PlanFormState, value: any) => void;
  onSelectLight: (name: string) => void;
  onRelatedLightsChange: (selected: StreetLightRecord[]) => void;
  onClose: () => void;
  onSave: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Kế hoạch bảo trì</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Tạo kế hoạch bảo trì</h2>
        </div>
        <button onClick={onClose} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700">✕</button>
      </div>
      <div className="max-h-[calc(92vh-154px)] overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                onChange('scope_type', 'Một đèn');
              }}
              className={`pb-2 px-4 text-sm font-bold transition-all ${
                form.scope_type === 'Một đèn'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📍 Bảo trì 1 đèn
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('scope_type', 'Nhiều đèn');
              }}
              className={`pb-2 px-4 text-sm font-bold transition-all ${
                form.scope_type === 'Nhiều đèn'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📦 Bảo trì nhiều đèn
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="lg:col-span-3">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Tên kế hoạch</span>
              <input value={form.ten_ke_hoach} onChange={(event) => onChange('ten_ke_hoach', event.target.value)} placeholder="Tên kế hoạch bảo trì..." className={inputClass} />
            </label>

            {form.scope_type === 'Một đèn' ? (
              <>
                <div className="lg:col-span-3">
                  <StreetLightMultiPicker
                    lights={lights}
                    selectedLights={form.thiet_bi ? [lights.find(l => l.name === form.thiet_bi)].filter(Boolean) as any[] : []}
                    onChange={(selected) => {
                      if (selected.length > 0) {
                        onSelectLight(selected[0].name);
                      } else {
                        onSelectLight('');
                      }
                    }}
                    multiple={false}
                    label="Chọn thiết bị đèn đường cần bảo trì"
                    placeholder="Nhập mã đèn, tên đèn, tuyến đường hoặc khu vực..."
                  />
                </div>
                {[
                  ['ma_tai_san', 'Mã đèn'],
                  ['ten_tai_san', 'Tên đèn'],
                  ['tuyen_duong', 'Tuyến đường'],
                  ['khu_vuc', 'Khu vực'],
                ].map(([field, label]) => (
                  <label key={field}>
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
                    <input value={form[field as keyof PlanFormState] as string} readOnly className={`${inputClass} bg-slate-50`} />
                  </label>
                ))}
              </>
            ) : (
              <>
                <div className="lg:col-span-3">
                  <StreetLightMultiPicker
                    lights={lights}
                    selectedLights={form.related_lights}
                    onChange={onRelatedLightsChange}
                    multiple={true}
                    label="Chọn các đèn đường cần bảo trì"
                    placeholder="Nhập mã đèn, tên đèn, tuyến đường hoặc khu vực..."
                  />
                </div>
                
                {form.related_lights.length > 0 && (
                  <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                      Danh sách đèn trong kế hoạch bảo trì ({form.related_lights.length} thiết bị)
                    </p>
                    <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2">Mã đèn</th>
                            <th className="px-3 py-2">Tên đèn</th>
                            <th className="px-3 py-2">Tuyến đường</th>
                            <th className="px-3 py-2">Khu vực</th>
                            <th className="px-3 py-2 text-center">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                          {form.related_lights.map((light: any) => (
                            <tr key={light.name || light.ma_tai_san} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold text-slate-900">{light.ma_tai_san}</td>
                              <td className="px-3 py-2 font-bold text-slate-700">{light.ten_tai_san || '—'}</td>
                              <td className="px-3 py-2">{light.route_name || light.tuyen_duong || '—'}</td>
                              <td className="px-3 py-2">{light.ten_khu_vuc || light.khu_vuc || '—'}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRelatedLightsChange(form.related_lights.filter(l => l.name !== light.name));
                                  }}
                                  className="rounded px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-800 transition"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Loại kế hoạch</span>
              <select value={form.loai_ke_hoach} onChange={(event) => onChange('loai_ke_hoach', event.target.value)} className={inputClass}>
                {PLAN_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Mức ưu tiên</span>
              <select value={form.muc_uu_tien} onChange={(event) => onChange('muc_uu_tien', event.target.value)} className={inputClass}>
                {PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Ngày bắt đầu</span>
              <input type="date" value={form.ngay_bat_dau} onChange={(event) => onChange('ngay_bat_dau', event.target.value)} className={inputClass} />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Ngày kết thúc</span>
              <input type="date" value={form.ngay_ket_thuc} onChange={(event) => onChange('ngay_ket_thuc', event.target.value)} className={inputClass} />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Người phụ trách</span>
              <input value={form.nguoi_phu_trach} onChange={(event) => onChange('nguoi_phu_trach', event.target.value)} placeholder="Người phụ trách" className={inputClass} />
            </label>
            <label className="lg:col-span-3">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Nội dung</span>
              <textarea value={form.noi_dung} onChange={(event) => onChange('noi_dung', event.target.value)} placeholder="Nội dung chi tiết..." rows={4} className={inputClass} />
            </label>
          </div>
        </div>
        {error ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
        <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
        <button onClick={onSave} disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </div>
  </div>
);

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
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);

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

  const areaOptions = useMemo(() => unique(plans, (i) => i.ten_khu_vuc || i.khu_vuc), [plans]);
  const routeOptions = useMemo(() => unique(plans, (i) => i.tuyen_duong), [plans]);
  
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

  const handleSelectLight = (name: string) => {
    const light = lights.find((item) => item.name === name);
    if (!light) {
      setForm((current) => ({
        ...current,
        thiet_bi: name,
        ma_tai_san: '',
        ten_tai_san: '',
        tuyen_duong: '',
        khu_vuc: '',
      }));
      return;
    }
    setForm((current) => ({
      ...current,
      thiet_bi: light.name,
      ma_tai_san: light.ma_tai_san,
      ten_tai_san: light.ten_tai_san,
      tuyen_duong: light.route_name || '',
      khu_vuc: light.ten_khu_vuc || light.khu_vuc || '',
    }));
  };

  const handleRelatedLightsChange = (selected: StreetLightRecord[]) => {
    setForm((current) => ({
      ...current,
      related_lights: selected,
    }));
  };

  const savePlan = async () => {
    if (!form.ten_ke_hoach.trim()) {
      setFormError('Vui lòng nhập tên kế hoạch.');
      return;
    }
    if (form.scope_type === 'Một đèn' && !form.thiet_bi) {
      setFormError('Vui lòng chọn thiết bị cần bảo trì.');
      return;
    }
    if (form.scope_type === 'Nhiều đèn' && form.related_lights.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 đèn cần bảo trì.');
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      await createMaintenancePlan({
        ten_ke_hoach: form.ten_ke_hoach,
        loai_ke_hoach: form.loai_ke_hoach,
        muc_uu_tien: form.muc_uu_tien,
        thiet_bi: form.scope_type === 'Một đèn' ? form.thiet_bi : undefined,
        related_lights: form.scope_type === 'Nhiều đèn' ? form.related_lights : undefined,
        ngay_bat_dau: form.ngay_bat_dau,
        ngay_ket_thuc: form.ngay_ket_thuc,
        noi_dung: form.noi_dung,
        nguoi_phu_trach: form.nguoi_phu_trach,
        trang_thai: 'Lập kế hoạch',
      });
      setNotice('Đã tạo kế hoạch bảo trì.');
      setOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setFormError('Không thể tạo kế hoạch bảo trì. Vui lòng thử lại.');
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
                <tbody className="divide-y divide-slate-100">{filtered.map((plan) => {
                  const isMulti = plan.related_lights_count && plan.related_lights_count > 1;
                  return (
                    <tr key={plan.name} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className="font-mono text-sm font-black text-blue-700 hover:text-blue-900 hover:underline text-left"
                        >
                          {plan.ma_ke_hoach}
                        </button>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">{plan.ten_ke_hoach}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.loai_ke_hoach}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(plan.muc_uu_tien)}`}>{plan.muc_uu_tien}</span></td>
                      <td className="px-5 py-4 text-sm">
                        {isMulti ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                            {plan.related_lights_count} đèn trong kế hoạch
                          </span>
                        ) : (
                          <>
                            <p className="font-mono font-bold">{plan.ma_tai_san || '—'}</p>
                            <p className="text-xs text-slate-400">{plan.ten_tai_san}</p>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.tuyen_duong || '—'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{plan.ten_khu_vuc || plan.khu_vuc || '—'}</td>
                      <td className="px-5 py-4 text-sm">{formatDate(plan.ngay_bat_dau)}</td>
                      <td className="px-5 py-4 text-sm">{formatDate(plan.ngay_ket_thuc)}</td>
                      <td className="px-5 py-4 text-sm font-semibold">{plan.nguoi_phu_trach || '—'}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badge(plan.trang_thai)}`}>{plan.trang_thai}</span></td>
                      <td className="px-5 py-4"><div className="flex gap-2">{['Đang thực hiện', 'Hoàn thành', 'Hủy'].map((s) => <button key={s} disabled={updating === plan.name || plan.trang_thai === s} onClick={() => changeStatus(plan, s)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40">{s}</button>)}</div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {open ? (
        <CreatePlanModal
          form={form}
          lights={lights}
          saving={saving}
          error={formError}
          onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onSelectLight={handleSelectLight}
          onRelatedLightsChange={handleRelatedLightsChange}
          onClose={() => !saving && setOpen(false)}
          onSave={savePlan}
        />
      ) : null}
      {selectedPlan ? (
        <PlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      ) : null}
    </div>
  );
};

export default StreetLightMaintenancePlans;
