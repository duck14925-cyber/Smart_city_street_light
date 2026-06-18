import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteStreetLight,
  getStreetLightDataHistory,
  getStreetLightDeviceTypes,
  getStreetLights,
  updateStreetLight,
  updateStreetLightStatus,
  type StreetLightDataHistoryItem,
  type StreetLightDeviceType,
  type StreetLightRecord,
} from '../api/streetLightApi';

const STATUS_OPTIONS = ['Hoạt động', 'Hỏng', 'Bảo trì'];

interface EditLightForm {
  name: string;
  ma_tai_san: string;
  ten_tai_san: string;
  route_name: string;
  khu_vuc: string;
  latitude: string;
  longitude: string;
  trang_thai: string;
  device_type_code: string;
  ngay_lap_dat: string;
  chi_phi_bao_duong: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const statusBadgeClasses: Record<string, string> = {
  'Hoạt động': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Hỏng': 'bg-red-50 text-red-700 ring-red-200',
  'Bảo trì': 'bg-amber-50 text-amber-700 ring-amber-200',
};

const getStatusBadgeClass = (status: string) =>
  statusBadgeClasses[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200';

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('vi-VN');
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return 'Chưa có';
  return currencyFormatter.format(value);
};

const formatCoordinate = (value: number | null) => {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(6);
};

const formatNumber = (value?: number | null, suffix = '') => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'Chưa có';
  return `${Number(value).toLocaleString('vi-VN')}${suffix}`;
};

const toEditForm = (light: StreetLightRecord): EditLightForm => ({
  name: light.name,
  ma_tai_san: light.ma_tai_san,
  ten_tai_san: light.ten_tai_san || '',
  route_name: light.route_name || '',
  khu_vuc: light.khu_vuc || '',
  latitude: light.latitude === null ? '' : String(light.latitude),
  longitude: light.longitude === null ? '' : String(light.longitude),
  trang_thai: light.trang_thai || STATUS_OPTIONS[0],
  device_type_code: light.device_type_code || '',
  ngay_lap_dat: light.ngay_lap_dat || '',
  chi_phi_bao_duong:
    light.chi_phi_bao_duong === undefined || light.chi_phi_bao_duong === null
      ? ''
      : String(light.chi_phi_bao_duong),
});

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data?.message === 'string') return data.message;

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

const TableSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3, 4, 5].map((item) => (
      <div key={item} className="grid grid-cols-8 gap-4 rounded-xl bg-slate-50 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-4 rounded bg-slate-200 animate-pulse" />
        ))}
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="p-10 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
      💡
    </div>
    <p className="text-sm font-semibold text-slate-600">{message}</p>
  </div>
);

interface DetailModalProps {
  light: StreetLightRecord;
  onClose: () => void;
}

const DetailModal = ({ light, onClose }: DetailModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="font-mono text-sm font-bold text-blue-700">{light.ma_tai_san}</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">{light.ten_tai_san}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {[
          ['Tuyến đường', light.route_name || 'Chưa xác định'],
          ['Khu vực', light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'],
          ['Trạng thái', light.trang_thai || 'Không rõ'],
          ['Mã loại thiết bị', light.device_type_code || 'Chưa cấu hình'],
          ['Tên loại thiết bị', light.device_type_name || 'Chưa cấu hình'],
          ['Loại bóng', light.lamp_type || 'Chưa cấu hình'],
          ['Công suất', formatNumber(light.power_w, ' W')],
          ['Chiều cao cột', formatNumber(light.pole_height_m, ' m')],
          ['Ngày lắp đặt', formatDate(light.ngay_lap_dat)],
          ['Chi phí bảo dưỡng', formatCurrency(light.chi_phi_bao_duong)],
          ['Latitude', formatCoordinate(light.latitude)],
          ['Longitude', formatCoordinate(light.longitude)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Icon 2D</p>
          {light.icon_2d_url ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                <img src={light.icon_2d_url} alt={light.device_type_name || light.ma_tai_san} className="h-full w-full object-contain" />
              </div>
              <p className="max-w-[220px] truncate text-xs font-semibold text-slate-500">{light.icon_2d_url}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">Fallback icon theo trạng thái</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Model 3D</p>
          <p className="mt-2 text-sm font-bold text-slate-800">
            {light.model_3d_url ? 'Có model 3D' : 'Fallback cột 3D'}
          </p>
          {light.model_3d_url ? (
            <p className="mt-1 max-w-[280px] truncate text-xs font-semibold text-slate-500">{light.model_3d_url}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
        <Link
          to="/street-lights/map"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Xem trên bản đồ
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
);

interface StatusModalProps {
  light: StreetLightRecord;
  saving: boolean;
  error: string;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const StatusModal = ({
  light,
  saving,
  error,
  selectedStatus,
  onStatusChange,
  onClose,
  onSave,
}: StatusModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <p className="font-mono text-sm font-bold text-blue-700">{light.ma_tai_san}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Cập nhật trạng thái</h2>
        <p className="mt-2 text-sm text-slate-500">{light.ten_tai_san}</p>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Trạng thái mới
          </label>
          <select
            value={selectedStatus}
            onChange={(event) => onStatusChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

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
          disabled={saving}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  </div>
);

interface DeleteModalProps {
  light: StreetLightRecord;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteModal = ({ light, deleting, error, onClose, onDelete }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="border-b border-red-100 bg-gradient-to-r from-white via-red-50 to-orange-50 px-6 py-5">
        <p className="font-mono text-sm font-bold text-red-700">{light.ma_tai_san}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Xóa đèn đường?</h2>
        <p className="mt-2 text-sm text-slate-500">{light.ten_tai_san}</p>
      </div>
      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Thao tác này sẽ xóa thiết bị khỏi dữ liệu đèn đường và ghi lại lịch sử xóa.
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>
      <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? 'Đang xóa...' : 'Xóa đèn'}
        </button>
      </div>
    </div>
  </div>
);

interface EditLightModalProps {
  form: EditLightForm;
  areas: Array<{ value: string; label: string }>;
  deviceTypes: StreetLightDeviceType[];
  saving: boolean;
  error: string;
  onChange: (field: keyof EditLightForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

const EditLightModal = ({
  form,
  areas,
  deviceTypes,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: EditLightModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
        <div>
          <p className="font-mono text-sm font-bold text-blue-700">{form.ma_tai_san}</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">Sửa thiết bị chiếu sáng</h2>
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
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Mã thiết bị
            </span>
            <input value={form.ma_tai_san} disabled className={inputClass} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Tên thiết bị
            </span>
            <input
              value={form.ten_tai_san}
              onChange={(event) => onChange('ten_tai_san', event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Tuyến đường
            </span>
            <input
              value={form.route_name}
              onChange={(event) => onChange('route_name', event.target.value)}
              placeholder="VD: Đường Hùng Vương"
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Khu vực
            </span>
            <select
              value={form.khu_vuc}
              onChange={(event) => onChange('khu_vuc', event.target.value)}
              className={inputClass}
            >
              <option value="">Chưa chọn</option>
              {areas.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Latitude
            </span>
            <input
              type="number"
              value={form.latitude}
              onChange={(event) => onChange('latitude', event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Longitude
            </span>
            <input
              type="number"
              value={form.longitude}
              onChange={(event) => onChange('longitude', event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Trạng thái
            </span>
            <select
              value={form.trang_thai}
              onChange={(event) => onChange('trang_thai', event.target.value)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Loại thiết bị
            </span>
            <select
              value={form.device_type_code}
              onChange={(event) => onChange('device_type_code', event.target.value)}
              className={inputClass}
            >
              <option value="">Mặc định hệ thống</option>
              {deviceTypes.map((deviceType) => (
                <option key={deviceType.ma_loai} value={deviceType.ma_loai}>
                  {deviceType.ma_loai} - {deviceType.ten_loai}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Ngày lắp đặt
            </span>
            <input
              type="date"
              value={form.ngay_lap_dat}
              onChange={(event) => onChange('ngay_lap_dat', event.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Chi phí bảo dưỡng
            </span>
            <input
              type="number"
              value={form.chi_phi_bao_duong}
              onChange={(event) => onChange('chi_phi_bao_duong', event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  </div>
);

const HistoryPanel = ({
  history,
  loading,
  activeCode,
  onRefresh,
}: {
  history: StreetLightDataHistoryItem[];
  loading: boolean;
  activeCode?: string;
  onRefresh: () => void;
}) => (
  <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/80">
    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-950">Lịch sử thêm/sửa/xóa dữ liệu</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {activeCode
            ? `Đang xem lịch sử riêng của thiết bị ${activeCode}.`
            : 'Theo dõi tạo tuyến, tạo đèn, tạo chuỗi đèn, cập nhật trạng thái và xóa đèn.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? 'Đang tải...' : 'Làm mới'}
      </button>
    </div>
    <div className="divide-y divide-slate-100">
      {history.length === 0 ? (
        <EmptyState message="Chưa có lịch sử thao tác dữ liệu." />
      ) : (
        history.map((item) => (
          <div key={item.name} className="grid gap-3 px-6 py-4 md:grid-cols-[160px_1fr_180px]">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                {item.hanh_dong}
              </span>
              <p className="mt-2 text-xs font-semibold text-slate-400">{formatDateTime(item.creation)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {item.noi_dung || item.ten_doi_tuong || item.ma_doi_tuong || item.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.ma_doi_tuong ? `Mã: ${item.ma_doi_tuong}` : 'Không có mã'} ·{' '}
                {item.tuyen_duong ? `Tuyến: ${item.tuyen_duong}` : 'Không có tuyến'}
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-400 md:text-right">
              {item.owner || 'Administrator'}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const StreetLightAssets = () => {
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<StreetLightDeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
  const [detailLight, setDetailLight] = useState<StreetLightRecord | null>(null);
  const [editLight, setEditLight] = useState<StreetLightRecord | null>(null);
  const [editForm, setEditForm] = useState<EditLightForm | null>(null);
  const [statusLight, setStatusLight] = useState<StreetLightRecord | null>(null);
  const [deleteLight, setDeleteLight] = useState<StreetLightRecord | null>(null);
  const [history, setHistory] = useState<StreetLightDataHistoryItem[]>([]);
  const [historyFilterCode, setHistoryFilterCode] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(STATUS_OPTIONS[0]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editError, setEditError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [deletingLight, setDeletingLight] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadLights = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await getStreetLights({ limit: 500 });
      setLights(data);
    } catch {
      setError('Không thể tải danh sách thiết bị đèn đường. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getStreetLightDataHistory(50);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadDeviceTypes = useCallback(async () => {
    try {
      const data = await getStreetLightDeviceTypes();
      setDeviceTypes(data);
    } catch {
      setDeviceTypes([]);
    }
  }, []);

  useEffect(() => {
    loadLights();
    loadHistory();
    loadDeviceTypes();
  }, [loadDeviceTypes, loadHistory, loadLights]);

  const areaOptions = useMemo(() => {
    const areaMap = new Map<string, string>();

    lights.forEach((light) => {
      if (!light.khu_vuc) return;
      areaMap.set(light.khu_vuc, light.ten_khu_vuc || light.khu_vuc);
    });

    return Array.from(areaMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'vi-VN'));
  }, [lights]);

  const routeOptions = useMemo(() => {
    return Array.from(new Set(lights.map((light) => light.route_name).filter(Boolean) as string[]))
      .sort((left, right) => left.localeCompare(right, 'vi-VN'));
  }, [lights]);

  const filteredLights = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');

    return lights.filter((light) => {
      const searchableText = [
        light.ma_tai_san,
        light.ten_tai_san,
        light.route_name,
        light.ten_khu_vuc,
        light.khu_vuc,
        light.device_type_code,
        light.device_type_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi-VN');
      const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;
      const matchesStatus = statusFilter ? light.trang_thai === statusFilter : true;
      const matchesArea = areaFilter ? light.khu_vuc === areaFilter : true;
      const matchesRoute = routeFilter ? light.route_name === routeFilter : true;
      const matchesDeviceType = deviceTypeFilter
        ? light.device_type_code === deviceTypeFilter
        : true;

      return matchesSearch && matchesStatus && matchesArea && matchesRoute && matchesDeviceType;
    });
  }, [areaFilter, deviceTypeFilter, lights, routeFilter, searchTerm, statusFilter]);

  const visibleHistory = useMemo(() => {
    if (!historyFilterCode) return history;
    return history.filter((item) => item.ma_doi_tuong === historyFilterCode);
  }, [history, historyFilterCode]);

  const openEditModal = (light: StreetLightRecord) => {
    setEditLight(light);
    setEditForm(toEditForm(light));
    setEditError('');
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditLight(null);
    setEditForm(null);
    setEditError('');
  };

  const handleEditFormChange = (field: keyof EditLightForm, value: string) => {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveEdit = async () => {
    if (!editLight || !editForm) return;
    const latitude = Number(editForm.latitude);
    const longitude = Number(editForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setEditError('Latitude/Longitude không hợp lệ.');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    setNotice('');

    try {
      await updateStreetLight({
        name: editForm.name,
        ma_tai_san: editForm.ma_tai_san,
        ten_tai_san: editForm.ten_tai_san,
        route_name: editForm.route_name,
        khu_vuc: editForm.khu_vuc,
        latitude,
        longitude,
        trang_thai: editForm.trang_thai,
        device_type_code: editForm.device_type_code || undefined,
        ngay_lap_dat: editForm.ngay_lap_dat,
        chi_phi_bao_duong: editForm.chi_phi_bao_duong
          ? Number(editForm.chi_phi_bao_duong)
          : 0,
      });
      await loadLights(true);
      await loadHistory();
      setNotice(`Đã cập nhật thiết bị ${editForm.ma_tai_san}.`);
      setEditLight(null);
      setEditForm(null);
    } catch (saveError) {
      setEditError(getApiErrorMessage(saveError, 'Không thể cập nhật thiết bị. Vui lòng thử lại.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const openStatusModal = (light: StreetLightRecord) => {
    setStatusLight(light);
    setSelectedStatus(light.trang_thai || STATUS_OPTIONS[0]);
    setStatusError('');
  };

  const closeStatusModal = () => {
    if (savingStatus) return;
    setStatusLight(null);
    setStatusError('');
  };

  const handleSaveStatus = async () => {
    if (!statusLight) return;

    setSavingStatus(true);
    setStatusError('');
    setNotice('');

    try {
      await updateStreetLightStatus(statusLight.name, selectedStatus);
      await loadLights(true);
      await loadHistory();
      setNotice(`Đã cập nhật trạng thái ${statusLight.ma_tai_san} thành ${selectedStatus}.`);
      setStatusLight(null);
    } catch {
      setStatusError('Không thể cập nhật trạng thái thiết bị. Vui lòng thử lại.');
    } finally {
      setSavingStatus(false);
    }
  };

  const openDeleteModal = (light: StreetLightRecord) => {
    setDeleteLight(light);
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    if (deletingLight) return;
    setDeleteLight(null);
    setDeleteError('');
  };

  const handleDeleteLight = async () => {
    if (!deleteLight) return;

    setDeletingLight(true);
    setDeleteError('');
    setNotice('');

    try {
      await deleteStreetLight(deleteLight.name);
      await loadLights(true);
      await loadHistory();
      setNotice(`Đã xóa đèn ${deleteLight.ma_tai_san}.`);
      setDeleteLight(null);
    } catch {
      setDeleteError('Không thể xóa thiết bị. Vui lòng thử lại.');
    } finally {
      setDeletingLight(false);
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/80">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                Tài sản điện & chiếu sáng
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Danh sách thiết bị chiếu sáng
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Quản lý tài sản đèn đường, trạng thái vận hành và thông tin bảo trì
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadLights(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              Làm mới
            </button>
          </div>

          <div className="space-y-4 border-b border-slate-100 p-6">
            {notice ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {notice}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1fr_190px_190px_190px_220px_auto]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm theo mã hoặc tên đèn..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-10 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Trạng thái
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Tất cả</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tuyến đường
                </label>
                <select
                  value={routeFilter}
                  onChange={(event) => setRouteFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Tất cả</option>
                  {routeOptions.map((routeName) => (
                    <option key={routeName} value={routeName}>
                      {routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Khu vực
                </label>
                <select
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Tất cả</option>
                  {areaOptions.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Loại thiết bị
                </label>
                <select
                  value={deviceTypeFilter}
                  onChange={(event) => setDeviceTypeFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Tất cả</option>
                  {deviceTypes.map((deviceType) => (
                    <option key={deviceType.ma_loai} value={deviceType.ma_loai}>
                      {deviceType.ma_loai} - {deviceType.ten_loai}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600">
                  Hiển thị {filteredLights.length} / {lights.length} thiết bị
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-red-600 shadow-sm">
                  !
                </div>
                <h2 className="text-lg font-bold text-red-900">Không tải được thiết bị</h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => loadLights()}
                  className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              {loading ? (
                <TableSkeleton />
              ) : filteredLights.length === 0 ? (
                <EmptyState message="Không có thiết bị phù hợp với bộ lọc hiện tại." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1420px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-4">Mã thiết bị</th>
                        <th className="px-5 py-4">Tên thiết bị</th>
                        <th className="px-5 py-4">Tuyến đường</th>
                        <th className="px-5 py-4">Khu vực</th>
                        <th className="px-5 py-4">Loại thiết bị</th>
                        <th className="px-5 py-4">Công suất</th>
                        <th className="px-5 py-4">Chiều cao</th>
                        <th className="px-5 py-4">Trạng thái</th>
                        <th className="px-5 py-4">Ngày lắp đặt</th>
                        <th className="px-5 py-4">Chi phí bảo dưỡng</th>
                        <th className="px-5 py-4">Tọa độ</th>
                        <th className="px-5 py-4 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLights.map((light) => (
                        <tr key={light.name} className="transition hover:bg-blue-50/40">
                          <td className="px-5 py-4 font-mono text-sm font-bold text-blue-700">
                            {light.ma_tai_san}
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">
                              {light.ten_tai_san}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-400">{light.name}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {light.route_name || 'Chưa xác định'}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-mono text-xs font-bold text-blue-700">
                              {light.device_type_code || 'Mặc định'}
                            </p>
                            <p className="mt-1 max-w-[180px] truncate text-xs font-semibold text-slate-500">
                              {light.device_type_name || 'Đèn LED cao áp 9m'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {formatNumber(light.power_w, ' W')}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-700">
                            {formatNumber(light.pole_height_m, ' m')}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getStatusBadgeClass(light.trang_thai)}`}>
                              {light.trang_thai || 'Không rõ'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {formatDate(light.ngay_lap_dat)}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {formatCurrency(light.chi_phi_bao_duong)}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500">
                            {formatCoordinate(light.latitude)}, {formatCoordinate(light.longitude)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailLight(light)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                              >
                                Chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(light)}
                                className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryFilterCode(light.ma_tai_san);
                                  requestAnimationFrame(() =>
                                    document.getElementById('street-light-history')?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    })
                                  );
                                }}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                              >
                                Lịch sử
                              </button>
                              <button
                                type="button"
                                onClick={() => openStatusModal(light)}
                                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                              >
                                Cập nhật
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(light)}
                                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
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
              )}
            </div>
          )}
        </div>
        <div id="street-light-history">
          {historyFilterCode ? (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              <span>Đang lọc lịch sử theo thiết bị {historyFilterCode}</span>
              <button
                type="button"
                onClick={() => setHistoryFilterCode('')}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm"
              >
                Xem tất cả
              </button>
            </div>
          ) : null}
          <HistoryPanel
            history={visibleHistory}
            loading={loadingHistory}
            activeCode={historyFilterCode}
            onRefresh={loadHistory}
          />
        </div>
      </div>

      {detailLight ? <DetailModal light={detailLight} onClose={() => setDetailLight(null)} /> : null}
      {editLight && editForm ? (
        <EditLightModal
          form={editForm}
          areas={areaOptions}
          deviceTypes={deviceTypes}
          saving={savingEdit}
          error={editError}
          onChange={handleEditFormChange}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
        />
      ) : null}
      {statusLight ? (
        <StatusModal
          light={statusLight}
          saving={savingStatus}
          error={statusError}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onClose={closeStatusModal}
          onSave={handleSaveStatus}
        />
      ) : null}
      {deleteLight ? (
        <DeleteModal
          light={deleteLight}
          deleting={deletingLight}
          error={deleteError}
          onClose={closeDeleteModal}
          onDelete={handleDeleteLight}
        />
      ) : null}
    </div>
  );
};

export default StreetLightAssets;
