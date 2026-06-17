import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOrUpdateStreetLightDeviceType,
  deleteStreetLightDeviceType,
  getStreetLightDeviceTypes,
  type StreetLightDeviceType,
} from '../api/streetLightApi';

const CATEGORY_OPTIONS = [
  'Đèn chiếu sáng',
  'Tủ điều khiển',
  'Cột đèn',
  'Đèn trang trí',
  'Thiết bị khác',
];

const LAMP_TYPE_OPTIONS = ['LED', 'Sodium', 'Halogen', 'Solar LED', 'Khác'];

const STATUS_OPTIONS = ['Hoạt động', 'Ngừng sử dụng'];

interface DeviceTypeForm {
  ma_loai: string;
  ten_loai: string;
  danh_muc: string;
  loai_bong_den: string;
  cong_suat_w: string;
  chieu_cao_cot_m: string;
  quang_thong_lumen: string;
  nhiet_do_mau_k: string;
  tuoi_tho_gio: string;
  trang_thai: string;
  icon_2d_url: string;
  model_3d_url: string;
  model_scale: string;
  model_bearing: string;
  model_height: string;
  ghi_chu: string;
}

const emptyForm: DeviceTypeForm = {
  ma_loai: '',
  ten_loai: '',
  danh_muc: 'Đèn chiếu sáng',
  loai_bong_den: 'LED',
  cong_suat_w: '',
  chieu_cao_cot_m: '',
  quang_thong_lumen: '',
  nhiet_do_mau_k: '',
  tuoi_tho_gio: '',
  trang_thai: 'Hoạt động',
  icon_2d_url: '',
  model_3d_url: '',
  model_scale: '1',
  model_bearing: '0',
  model_height: '0',
  ghi_chu: '',
};

const categoryBadgeClasses: Record<string, string> = {
  'Đèn chiếu sáng': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Tủ điều khiển': 'bg-violet-50 text-violet-700 ring-violet-200',
  'Cột đèn': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Đèn trang trí': 'bg-pink-50 text-pink-700 ring-pink-200',
  'Thiết bị khác': 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

const statusBadgeClasses: Record<string, string> = {
  'Hoạt động': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Ngừng sử dụng': 'bg-slate-100 text-slate-600 ring-slate-200',
};

const getBadgeClass = (value?: string, map?: Record<string, string>) =>
  value && map?.[value] ? map[value] : 'bg-slate-100 text-slate-600 ring-slate-200';

const formatNumber = (value?: number | null, suffix = '') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('vi-VN')}${suffix}`;
};

const uniqueOptions = (items: StreetLightDeviceType[], key: keyof StreetLightDeviceType) =>
  Array.from(
    new Set(
      items
        .map((item) => item[key])
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    )
  ).sort((first, second) => first.localeCompare(second, 'vi'));

const toFormValue = (value?: string | number | null) =>
  value === undefined || value === null ? '' : String(value);

const toNumberOrUndefined = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const deviceTypeToForm = (deviceType: StreetLightDeviceType): DeviceTypeForm => ({
  ma_loai: deviceType.ma_loai || '',
  ten_loai: deviceType.ten_loai || '',
  danh_muc: deviceType.danh_muc || 'Đèn chiếu sáng',
  loai_bong_den: deviceType.loai_bong_den || 'LED',
  cong_suat_w: toFormValue(deviceType.cong_suat_w),
  chieu_cao_cot_m: toFormValue(deviceType.chieu_cao_cot_m),
  quang_thong_lumen: toFormValue(deviceType.quang_thong_lumen),
  nhiet_do_mau_k: toFormValue(deviceType.nhiet_do_mau_k),
  tuoi_tho_gio: toFormValue(deviceType.tuoi_tho_gio),
  trang_thai: deviceType.trang_thai || 'Hoạt động',
  icon_2d_url: deviceType.icon_2d_url || '',
  model_3d_url: deviceType.model_3d_url || '',
  model_scale: toFormValue(deviceType.model_scale) || '1',
  model_bearing: toFormValue(deviceType.model_bearing) || '0',
  model_height: toFormValue(deviceType.model_height) || '0',
  ghi_chu: deviceType.ghi_chu || '',
});

const formToPayload = (form: DeviceTypeForm): StreetLightDeviceType => ({
  ma_loai: form.ma_loai.trim(),
  ten_loai: form.ten_loai.trim(),
  danh_muc: form.danh_muc,
  loai_bong_den: form.loai_bong_den,
  cong_suat_w: toNumberOrUndefined(form.cong_suat_w),
  chieu_cao_cot_m: toNumberOrUndefined(form.chieu_cao_cot_m),
  quang_thong_lumen: toNumberOrUndefined(form.quang_thong_lumen),
  nhiet_do_mau_k: toNumberOrUndefined(form.nhiet_do_mau_k),
  tuoi_tho_gio: toNumberOrUndefined(form.tuoi_tho_gio),
  trang_thai: form.trang_thai,
  icon_2d_url: form.icon_2d_url.trim(),
  model_3d_url: form.model_3d_url.trim(),
  model_scale: toNumberOrUndefined(form.model_scale),
  model_bearing: toNumberOrUndefined(form.model_bearing),
  model_height: toNumberOrUndefined(form.model_height),
  ghi_chu: form.ghi_chu.trim(),
});

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.exception === 'string') return data.exception;

  if (typeof data?._server_messages === 'string') {
    try {
      const messages = JSON.parse(data._server_messages);
      const firstMessage = messages?.[0] ? JSON.parse(messages[0]) : null;
      if (firstMessage?.message) return firstMessage.message;
    } catch {
      return fallback;
    }
  }

  return error?.message || fallback;
};

const LoadingState = () => (
  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
      🏷️
    </div>
    <p className="text-sm font-semibold text-slate-600">{message}</p>
  </div>
);

interface DeviceTypeModalProps {
  form: DeviceTypeForm;
  editing: boolean;
  saving: boolean;
  error: string;
  onChange: (field: keyof DeviceTypeForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const fieldInputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

const DeviceTypeModal = ({
  form,
  editing,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: DeviceTypeModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            {editing ? 'Chỉnh sửa cấu hình' : 'Tạo cấu hình mới'}
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {editing ? 'Sửa loại thiết bị chiếu sáng' : 'Thêm loại thiết bị chiếu sáng'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-60"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[calc(92vh-154px)] overflow-y-auto p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Mã loại *
            </span>
            <input
              value={form.ma_loai}
              onChange={(event) => onChange('ma_loai', event.target.value)}
              disabled={editing}
              placeholder="VD: DEN-LED-9M"
              className={fieldInputClass}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Tên loại *
            </span>
            <input
              value={form.ten_loai}
              onChange={(event) => onChange('ten_loai', event.target.value)}
              placeholder="VD: Đèn LED cao áp 9m"
              className={fieldInputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Danh mục
            </span>
            <select
              value={form.danh_muc}
              onChange={(event) => onChange('danh_muc', event.target.value)}
              className={fieldInputClass}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Loại bóng đèn
            </span>
            <select
              value={form.loai_bong_den}
              onChange={(event) => onChange('loai_bong_den', event.target.value)}
              className={fieldInputClass}
            >
              {LAMP_TYPE_OPTIONS.map((lampType) => (
                <option key={lampType} value={lampType}>
                  {lampType}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Trạng thái
            </span>
            <select
              value={form.trang_thai}
              onChange={(event) => onChange('trang_thai', event.target.value)}
              className={fieldInputClass}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          {[
            ['cong_suat_w', 'Công suất W'],
            ['chieu_cao_cot_m', 'Chiều cao cột m'],
            ['quang_thong_lumen', 'Quang thông lumen'],
            ['nhiet_do_mau_k', 'Nhiệt độ màu K'],
            ['tuoi_tho_gio', 'Tuổi thọ giờ'],
            ['model_scale', 'Model scale'],
            ['model_bearing', 'Model bearing'],
            ['model_height', 'Model height'],
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
              </span>
              <input
                type="number"
                value={form[field as keyof DeviceTypeForm]}
                onChange={(event) => onChange(field as keyof DeviceTypeForm, event.target.value)}
                className={fieldInputClass}
              />
            </label>
          ))}

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Icon 2D URL
            </span>
            <input
              value={form.icon_2d_url}
              onChange={(event) => onChange('icon_2d_url', event.target.value)}
              placeholder="/assets/icons/street-light.svg hoặc https://..."
              className={fieldInputClass}
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Preview icon
            </p>
            {form.icon_2d_url ? (
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-sm">
                <img src={form.icon_2d_url} alt="Icon 2D preview" className="h-full w-full object-contain" />
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">Chưa có icon, map dùng fallback.</p>
            )}
          </div>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Model 3D URL
            </span>
            <input
              value={form.model_3d_url}
              onChange={(event) => onChange('model_3d_url', event.target.value)}
              placeholder="/models/street-light.glb hoặc https://..."
              className={fieldInputClass}
            />
          </label>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">Model 3D</p>
            <p className="mt-2 text-sm font-bold text-indigo-800">
              {form.model_3d_url ? 'Sẽ dùng model 3D trên bản đồ' : 'Fallback cột 3D'}
            </p>
          </div>

          <label className="block lg:col-span-3">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Ghi chú
            </span>
            <textarea
              value={form.ghi_chu}
              onChange={(event) => onChange('ghi_chu', event.target.value)}
              rows={3}
              className={fieldInputClass}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu loại thiết bị'}
        </button>
      </div>
    </div>
  </div>
);

interface DeleteConfirmModalProps {
  deviceType: StreetLightDeviceType;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteConfirmModal = ({
  deviceType,
  deleting,
  error,
  onClose,
  onDelete,
}: DeleteConfirmModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="border-b border-red-100 bg-gradient-to-r from-white via-red-50 to-orange-50 px-6 py-5">
        <p className="font-mono text-sm font-black text-red-700">{deviceType.ma_loai}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Xóa loại thiết bị?</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">{deviceType.ten_loai}</p>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm font-medium leading-6 text-slate-600">
          Backend sẽ chặn xóa nếu loại này đang được gán cho thiết bị đèn đường.
        </p>
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  </div>
);

const StreetLightDeviceTypes = () => {
  const [deviceTypes, setDeviceTypes] = useState<StreetLightDeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<DeviceTypeForm>(emptyForm);
  const [editingDeviceType, setEditingDeviceType] = useState<StreetLightDeviceType | null>(null);
  const [deletingDeviceType, setDeletingDeviceType] = useState<StreetLightDeviceType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDeviceTypes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getStreetLightDeviceTypes();
      setDeviceTypes(data);
    } catch (loadError) {
      console.error('[StreetLightDeviceTypes] load failed:', loadError);
      setError('Không tải được danh sách loại thiết bị chiếu sáng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeviceTypes();
  }, [loadDeviceTypes]);

  const categoryOptions = useMemo(
    () => uniqueOptions(deviceTypes, 'danh_muc'),
    [deviceTypes]
  );
  const statusOptions = useMemo(
    () => uniqueOptions(deviceTypes, 'trang_thai'),
    [deviceTypes]
  );

  const filteredDeviceTypes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return deviceTypes.filter((deviceType) => {
      const matchesSearch = keyword
        ? [
            deviceType.ma_loai,
            deviceType.ten_loai,
            deviceType.danh_muc,
            deviceType.loai_bong_den,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        : true;
      const matchesCategory = categoryFilter
        ? deviceType.danh_muc === categoryFilter
        : true;
      const matchesStatus = statusFilter ? deviceType.trang_thai === statusFilter : true;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, deviceTypes, search, statusFilter]);

  const openCreateModal = () => {
    setEditingDeviceType(null);
    setForm(emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (deviceType: StreetLightDeviceType) => {
    setEditingDeviceType(deviceType);
    setForm(deviceTypeToForm(deviceType));
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setIsFormOpen(false);
    setEditingDeviceType(null);
    setForm(emptyForm);
    setFormError('');
  };

  const handleFormChange = (field: keyof DeviceTypeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveDeviceType = async () => {
    if (!form.ma_loai.trim()) {
      setFormError('Mã loại là bắt buộc.');
      return;
    }
    if (!form.ten_loai.trim()) {
      setFormError('Tên loại là bắt buộc.');
      return;
    }

    setSaving(true);
    setFormError('');
    setNotice('');

    try {
      await createOrUpdateStreetLightDeviceType(formToPayload(form));
      setNotice(
        editingDeviceType
          ? 'Đã cập nhật loại thiết bị chiếu sáng.'
          : 'Đã tạo loại thiết bị chiếu sáng.'
      );
      setIsFormOpen(false);
      setEditingDeviceType(null);
      setForm(emptyForm);
      await loadDeviceTypes();
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, 'Không thể lưu loại thiết bị chiếu sáng.'));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (deviceType: StreetLightDeviceType) => {
    setDeletingDeviceType(deviceType);
    setDeleteError('');
    setNotice('');
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingDeviceType(null);
    setDeleteError('');
  };

  const handleDeleteDeviceType = async () => {
    if (!deletingDeviceType) return;

    setDeleting(true);
    setDeleteError('');
    setNotice('');

    try {
      await deleteStreetLightDeviceType(deletingDeviceType.ma_loai);
      setNotice('Đã xóa loại thiết bị chiếu sáng.');
      setDeletingDeviceType(null);
      await loadDeviceTypes();
    } catch (deleteErrorValue) {
      setDeleteError(
        getApiErrorMessage(deleteErrorValue, 'Không thể xóa loại thiết bị chiếu sáng.')
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 shadow-sm">
        <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-blue-700">
              🏷️ Cấu hình thiết bị
            </div>
            <h1 className="text-3xl font-black text-slate-950">Loại thiết bị chiếu sáng</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
              Quản lý cấu hình icon 2D, model 3D và thông số kỹ thuật của thiết bị đèn đường
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              + Thêm loại thiết bị
            </button>
            <button
              type="button"
              onClick={loadDeviceTypes}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ↻ Làm mới
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-sm">
          {notice}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Tìm kiếm
            </span>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="mr-3 text-lg">🔎</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mã loại, tên loại, danh mục, loại bóng..."
                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Danh mục
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Trạng thái
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="font-bold text-slate-500">
            Hiển thị{' '}
            <span className="text-blue-700">{filteredDeviceTypes.length}</span> /{' '}
            <span>{deviceTypes.length}</span> loại thiết bị
          </p>
          {(search || categoryFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setStatusFilter('');
              }}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-red-600 shadow-sm">
            !
          </div>
          <h3 className="text-lg font-black text-red-800">Không tải được dữ liệu</h3>
          <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          <button
            type="button"
            onClick={loadDeviceTypes}
            className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!loading && !error && filteredDeviceTypes.length === 0 ? (
        <EmptyState
          message={
            deviceTypes.length === 0
              ? 'Chưa có loại thiết bị chiếu sáng nào.'
              : 'Không có loại thiết bị phù hợp với bộ lọc hiện tại.'
          }
        />
      ) : null}

      {!loading && !error && filteredDeviceTypes.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-200">
                <tr>
                  <th className="px-5 py-4">Mã loại</th>
                  <th className="px-5 py-4">Tên loại</th>
                  <th className="px-5 py-4">Danh mục</th>
                  <th className="px-5 py-4">Loại bóng</th>
                  <th className="px-5 py-4">Công suất</th>
                  <th className="px-5 py-4">Chiều cao</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Icon 2D</th>
                  <th className="px-5 py-4">Model 3D</th>
                  <th className="px-5 py-4">Scale</th>
                  <th className="px-5 py-4">Bearing</th>
                  <th className="px-5 py-4">Height</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeviceTypes.map((deviceType) => (
                  <tr key={deviceType.ma_loai} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-black text-blue-700">
                        {deviceType.ma_loai}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-slate-950">{deviceType.ten_loai}</p>
                        {deviceType.icon_2d_url || deviceType.model_3d_url ? (
                          <p className="mt-1 max-w-[240px] truncate text-xs font-medium text-slate-400">
                            {deviceType.icon_2d_url || deviceType.model_3d_url}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getBadgeClass(
                          deviceType.danh_muc,
                          categoryBadgeClasses
                        )}`}
                      >
                        {deviceType.danh_muc || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {deviceType.loai_bong_den || '—'}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {formatNumber(deviceType.cong_suat_w, ' W')}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {formatNumber(deviceType.chieu_cao_cot_m, ' m')}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getBadgeClass(
                          deviceType.trang_thai,
                          statusBadgeClasses
                        )}`}
                      >
                        {deviceType.trang_thai || 'Chưa rõ'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {deviceType.icon_2d_url ? (
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
                          <img
                            src={deviceType.icon_2d_url}
                            alt={deviceType.ten_loai}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Fallback icon</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {deviceType.model_3d_url ? (
                        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                          Có model 3D
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          Fallback cột 3D
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                      {formatNumber(deviceType.model_scale)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                      {formatNumber(deviceType.model_bearing, '°')}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                      {formatNumber(deviceType.model_height, ' m')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(deviceType)}
                          className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(deviceType)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isFormOpen ? (
        <DeviceTypeModal
          form={form}
          editing={Boolean(editingDeviceType)}
          saving={saving}
          error={formError}
          onChange={handleFormChange}
          onClose={closeFormModal}
          onSave={handleSaveDeviceType}
        />
      ) : null}

      {deletingDeviceType ? (
        <DeleteConfirmModal
          deviceType={deletingDeviceType}
          deleting={deleting}
          error={deleteError}
          onClose={closeDeleteModal}
          onDelete={handleDeleteDeviceType}
        />
      ) : null}
    </div>
  );
};

export default StreetLightDeviceTypes;
