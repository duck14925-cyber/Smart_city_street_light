import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteStreetLight,
  getStreetLightDataHistory,
  getStreetLights,
  updateStreetLightStatus,
  type StreetLightDataHistoryItem,
  type StreetLightRecord,
} from '../api/streetLightApi';

const STATUS_OPTIONS = ['Hoạt động', 'Hỏng', 'Bảo trì'];

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
          ['Khu vực', light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'],
          ['Trạng thái', light.trang_thai || 'Không rõ'],
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

const HistoryPanel = ({
  history,
  loading,
  onRefresh,
}: {
  history: StreetLightDataHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
}) => (
  <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/80">
    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-950">Lịch sử thêm/sửa/xóa dữ liệu</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Theo dõi tạo tuyến, tạo đèn, tạo chuỗi đèn, cập nhật trạng thái và xóa đèn.
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [detailLight, setDetailLight] = useState<StreetLightRecord | null>(null);
  const [statusLight, setStatusLight] = useState<StreetLightRecord | null>(null);
  const [deleteLight, setDeleteLight] = useState<StreetLightRecord | null>(null);
  const [history, setHistory] = useState<StreetLightDataHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(STATUS_OPTIONS[0]);
  const [savingStatus, setSavingStatus] = useState(false);
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

  useEffect(() => {
    loadLights();
    loadHistory();
  }, [loadHistory, loadLights]);

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

  const filteredLights = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');

    return lights.filter((light) => {
      const searchableText = [
        light.ma_tai_san,
        light.ten_tai_san,
        light.ten_khu_vuc,
        light.khu_vuc,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi-VN');
      const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;
      const matchesStatus = statusFilter ? light.trang_thai === statusFilter : true;
      const matchesArea = areaFilter ? light.khu_vuc === areaFilter : true;

      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [areaFilter, lights, searchTerm, statusFilter]);

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

            <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
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
                  <table className="w-full min-w-[1180px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-4">Mã thiết bị</th>
                        <th className="px-5 py-4">Tên thiết bị</th>
                        <th className="px-5 py-4">Khu vực</th>
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
                            {light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'}
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
        <HistoryPanel history={history} loading={loadingHistory} onRefresh={loadHistory} />
      </div>

      {detailLight ? <DetailModal light={detailLight} onClose={() => setDetailLight(null)} /> : null}
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
