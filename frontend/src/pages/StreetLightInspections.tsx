import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createStreetLightInspection,
  getStreetLightInspections,
  getStreetLights,
  updateStreetLightInspectionStatus,
  type StreetLightInspection,
  type StreetLightRecord,
} from '../api/streetLightApi';

const ELECTRICAL_OPTIONS = ['Bình thường', 'Chập chờn', 'Mất điện', 'Quá tải', 'Khác'];
const POLE_OPTIONS = ['Tốt', 'Nghiêng', 'Gỉ sét', 'Nứt gãy', 'Cần thay thế'];
const WIRE_OPTIONS = ['Tốt', 'Chùng dây', 'Đứt dây', 'Hở dây', 'Cần thay thế'];
const SAFETY_OPTIONS = ['An toàn', 'Cần theo dõi', 'Nguy hiểm', 'Rất nguy hiểm'];
const RESULT_OPTIONS = ['Đạt', 'Cần bảo trì', 'Cần sửa chữa', 'Cần thay thế'];
const STATUS_OPTIONS = ['Nháp', 'Hoàn thành', 'Đã tạo kế hoạch'];

const safetyClasses: Record<string, string> = {
  'An toàn': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Cần theo dõi': 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'Nguy hiểm': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Rất nguy hiểm': 'bg-red-50 text-red-700 ring-red-200',
};

const resultClasses: Record<string, string> = {
  'Đạt': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Cần bảo trì': 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  'Cần sửa chữa': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Cần thay thế': 'bg-red-50 text-red-700 ring-red-200',
};

const statusClasses: Record<string, string> = {
  'Nháp': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Hoàn thành': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Đã tạo kế hoạch': 'bg-violet-50 text-violet-700 ring-violet-200',
};

const badgeClass = (value?: string, map?: Record<string, string>) =>
  map?.[value || ''] || 'bg-slate-100 text-slate-600 ring-slate-200';

const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  thiet_bi: string;
  ma_tai_san: string;
  ten_tai_san: string;
  tuyen_duong: string;
  khu_vuc: string;
  ngay_kiem_tra: string;
  tinh_trang_dien: string;
  tinh_trang_cot: string;
  tinh_trang_day: string;
  muc_an_toan: string;
  ket_luan: string;
  mo_ta: string;
  nguoi_kiem_tra: string;
}

const emptyForm: FormState = {
  thiet_bi: '',
  ma_tai_san: '',
  ten_tai_san: '',
  tuyen_duong: '',
  khu_vuc: '',
  ngay_kiem_tra: today(),
  tinh_trang_dien: 'Bình thường',
  tinh_trang_cot: 'Tốt',
  tinh_trang_day: 'Tốt',
  muc_an_toan: 'An toàn',
  ket_luan: 'Đạt',
  mo_ta: '',
  nguoi_kiem_tra: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const uniqueValues = (items: StreetLightInspection[], getter: (item: StreetLightInspection) => string | undefined) =>
  Array.from(new Set(items.map(getter).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, 'vi-VN')
  );

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

const CreateInspectionModal = ({
  form,
  lights,
  saving,
  error,
  onChange,
  onSelectLight,
  onClose,
  onSave,
}: {
  form: FormState;
  lights: StreetLightRecord[];
  saving: boolean;
  error: string;
  onChange: (field: keyof FormState, value: string) => void;
  onSelectLight: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Kiểm tra kỹ thuật</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Tạo phiếu kiểm tra</h2>
        </div>
        <button onClick={onClose} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700">✕</button>
      </div>
      <div className="max-h-[calc(92vh-154px)] overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="lg:col-span-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Chọn thiết bị</span>
            <select value={form.thiet_bi} onChange={(event) => onSelectLight(event.target.value)} className={inputClass}>
              <option value="">Chọn đèn đường cần kiểm tra</option>
              {lights.map((light) => (
                <option key={light.name} value={light.name}>{light.ma_tai_san} - {light.ten_tai_san}</option>
              ))}
            </select>
          </label>
          {[
            ['ma_tai_san', 'Mã đèn'],
            ['ten_tai_san', 'Tên đèn'],
            ['tuyen_duong', 'Tuyến đường'],
            ['khu_vuc', 'Khu vực'],
          ].map(([field, label]) => (
            <label key={field}>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
              <input value={form[field as keyof FormState]} readOnly className={`${inputClass} bg-slate-50`} />
            </label>
          ))}
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Ngày kiểm tra</span>
            <input type="date" value={form.ngay_kiem_tra} onChange={(event) => onChange('ngay_kiem_tra', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Tình trạng điện</span>
            <select value={form.tinh_trang_dien} onChange={(event) => onChange('tinh_trang_dien', event.target.value)} className={inputClass}>{ELECTRICAL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Tình trạng cột</span>
            <select value={form.tinh_trang_cot} onChange={(event) => onChange('tinh_trang_cot', event.target.value)} className={inputClass}>{POLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Tình trạng dây</span>
            <select value={form.tinh_trang_day} onChange={(event) => onChange('tinh_trang_day', event.target.value)} className={inputClass}>{WIRE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Mức an toàn</span>
            <select value={form.muc_an_toan} onChange={(event) => onChange('muc_an_toan', event.target.value)} className={inputClass}>{SAFETY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Kết luận</span>
            <select value={form.ket_luan} onChange={(event) => onChange('ket_luan', event.target.value)} className={inputClass}>{RESULT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Người kiểm tra</span>
            <input value={form.nguoi_kiem_tra} onChange={(event) => onChange('nguoi_kiem_tra', event.target.value)} className={inputClass} />
          </label>
          <label className="lg:col-span-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Mô tả</span>
            <textarea value={form.mo_ta} onChange={(event) => onChange('mo_ta', event.target.value)} rows={4} className={inputClass} />
          </label>
        </div>
        {error ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
        <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
        <button onClick={onSave} disabled={saving} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu phiếu'}</button>
      </div>
    </div>
  </div>
);

const StreetLightInspections = () => {
  const [inspections, setInspections] = useState<StreetLightInspection[]>([]);
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [safetyFilter, setSafetyFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inspectionData, lightData] = await Promise.all([
        getStreetLightInspections({ limit: 500 }),
        getStreetLights({ limit: 500 }),
      ]);
      setInspections(inspectionData);
      setLights(lightData);
    } catch {
      setError('Không thể tải dữ liệu kiểm tra kỹ thuật.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const areaOptions = useMemo(() => uniqueValues(inspections, (item) => item.ten_khu_vuc || item.khu_vuc), [inspections]);
  const routeOptions = useMemo(() => uniqueValues(inspections, (item) => item.tuyen_duong), [inspections]);

  const filteredInspections = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return inspections.filter((item) => {
      const searchable = [item.ma_phieu, item.ma_tai_san, item.ten_tai_san, item.tuyen_duong, item.nguoi_kiem_tra].filter(Boolean).join(' ').toLowerCase();
      return (
        (!keyword || searchable.includes(keyword)) &&
        (!areaFilter || item.ten_khu_vuc === areaFilter || item.khu_vuc === areaFilter) &&
        (!routeFilter || item.tuyen_duong === routeFilter) &&
        (!safetyFilter || item.muc_an_toan === safetyFilter) &&
        (!resultFilter || item.ket_luan === resultFilter) &&
        (!statusFilter || item.trang_thai === statusFilter)
      );
    });
  }, [areaFilter, inspections, resultFilter, routeFilter, safetyFilter, search, statusFilter]);

  const handleSelectLight = (name: string) => {
    const light = lights.find((item) => item.name === name);
    if (!light) {
      setForm((current) => ({ ...current, thiet_bi: name }));
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

  const handleSave = async () => {
    if (!form.thiet_bi) {
      setFormError('Vui lòng chọn thiết bị cần kiểm tra.');
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      await createStreetLightInspection({
        thiet_bi: form.thiet_bi,
        ngay_kiem_tra: form.ngay_kiem_tra,
        tinh_trang_dien: form.tinh_trang_dien,
        tinh_trang_cot: form.tinh_trang_cot,
        tinh_trang_day: form.tinh_trang_day,
        muc_an_toan: form.muc_an_toan,
        ket_luan: form.ket_luan,
        mo_ta: form.mo_ta,
        nguoi_kiem_tra: form.nguoi_kiem_tra,
        trang_thai: 'Hoàn thành',
      });
      setNotice('Đã tạo phiếu kiểm tra kỹ thuật.');
      setIsModalOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch {
      setFormError('Không thể tạo phiếu kiểm tra. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (inspection: StreetLightInspection, status: string) => {
    setUpdatingStatus(inspection.name);
    try {
      await updateStreetLightInspectionStatus(inspection.name, status);
      setNotice(`Đã cập nhật phiếu ${inspection.ma_phieu} thành ${status}.`);
      await loadData();
    } catch {
      setError('Không thể cập nhật trạng thái phiếu kiểm tra.');
    } finally {
      setUpdatingStatus('');
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">Kiểm tra kỹ thuật</div>
              <h1 className="text-3xl font-black text-slate-950">Phiếu kiểm tra kỹ thuật</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Lập phiếu kiểm tra điện, cột, dây và mức an toàn cho từng đèn đường.</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700">+ Tạo phiếu kiểm tra</button>
          </div>
          <div className="space-y-4 p-6">
            {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_180px_180px_180px]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phiếu, mã đèn, tên đèn..." className={inputClass} />
              <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className={inputClass}><option value="">Tất cả khu vực</option>{areaOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} className={inputClass}><option value="">Tất cả tuyến</option>{routeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={safetyFilter} onChange={(event) => setSafetyFilter(event.target.value)} className={inputClass}><option value="">Mức an toàn</option>{SAFETY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} className={inputClass}><option value="">Kết luận</option>{RESULT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="">Trạng thái</option>{STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </div>
            <p className="text-sm font-bold text-slate-500">Hiển thị {filteredInspections.length} / {inspections.length} phiếu</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          {error ? <div className="m-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : filteredInspections.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-slate-500">Chưa có phiếu kiểm tra phù hợp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1650px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    {['Mã phiếu', 'Ngày kiểm tra', 'Mã đèn', 'Tên đèn', 'Tuyến đường', 'Khu vực', 'Điện', 'Cột', 'Dây', 'Mức an toàn', 'Kết luận', 'Trạng thái', 'Người kiểm tra', 'Hành động'].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInspections.map((item) => (
                    <tr key={item.name} className="hover:bg-blue-50/40">
                      <td className="px-5 py-4 font-mono text-sm font-black text-blue-700">{item.ma_phieu}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{formatDate(item.ngay_kiem_tra)}</td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-slate-700">{item.ma_tai_san}</td>
                      <td className="px-5 py-4 max-w-[220px] truncate text-sm font-bold text-slate-900">{item.ten_tai_san}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.tuyen_duong || 'Chưa có'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.ten_khu_vuc || item.khu_vuc || 'Chưa có'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.tinh_trang_dien}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.tinh_trang_cot}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.tinh_trang_day}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(item.muc_an_toan, safetyClasses)}`}>{item.muc_an_toan}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(item.ket_luan, resultClasses)}`}>{item.ket_luan}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(item.trang_thai, statusClasses)}`}>{item.trang_thai}</span></td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{item.nguoi_kiem_tra || 'Chưa có'}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          {STATUS_OPTIONS.filter((status) => status !== item.trang_thai).map((status) => (
                            <button key={status} onClick={() => handleUpdateStatus(item, status)} disabled={updatingStatus === item.name} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{status}</button>
                          ))}
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
      {isModalOpen ? (
        <CreateInspectionModal
          form={form}
          lights={lights}
          saving={saving}
          error={formError}
          onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
          onSelectLight={handleSelectLight}
          onClose={() => !saving && setIsModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
};

export default StreetLightInspections;
