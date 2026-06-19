import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getStreetLightIncidents,
  updateIncidentStatus,
  type StreetLightIncident,
} from '../api/streetLightApi';

const STATUS_OPTIONS = ['Mới', 'Đang xử lý', 'Đã giải quyết', 'Đã đóng'];
const PRIORITY_OPTIONS = ['Thấp', 'Trung bình', 'Cao', 'Rất cấp tính'];

const statusClasses: Record<string, string> = {
  Mới: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Đang xử lý': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Đã giải quyết': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Đã đóng': 'bg-slate-100 text-slate-700 ring-slate-200',
};

const priorityClasses: Record<string, string> = {
  Thấp: 'bg-slate-100 text-slate-600 ring-slate-200',
  'Trung bình': 'bg-blue-50 text-blue-700 ring-blue-200',
  Cao: 'bg-orange-50 text-orange-700 ring-orange-200',
  'Rất cấp tính': 'bg-red-50 text-red-700 ring-red-200',
};

const badgeClass = (value?: string, map?: Record<string, string>) =>
  map?.[value || ''] || 'bg-slate-100 text-slate-600 ring-slate-200';

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const formatCoordinate = (value: number | null) =>
  typeof value === 'number' ? value.toFixed(6) : 'N/A';

const uniqueValues = (items: StreetLightIncident[], getter: (item: StreetLightIncident) => string | null | undefined) =>
  Array.from(new Set(items.map(getter).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, 'vi-VN')
  );

const IncidentDetailModal = ({
  incident,
  onClose,
}: {
  incident: StreetLightIncident;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-red-50 to-orange-50 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-600">Chi tiết sự cố</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{incident.tieu_de}</h2>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700">
          ✕
        </button>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
        {[
          ['Mã đèn', incident.ma_tai_san || 'Chưa xác định'],
          ['Tuyến đường', incident.route_name || 'Chưa xác định'],
          ['Khu vực', incident.ten_khu_vuc || incident.khu_vuc || 'Chưa xác định'],
          ['Trạng thái', incident.trang_thai || 'Không rõ'],
          ['Mức ưu tiên', incident.muc_do_uu_tien || 'Không rõ'],
          ['Người báo cáo', incident.nguoi_bao_cao || 'Chưa có'],
          ['SĐT liên hệ', incident.sdt_lien_he || 'Chưa có'],
          ['Tạo lúc', formatDateTime(incident.creation)],
          ['Latitude', formatCoordinate(incident.latitude)],
          ['Longitude', formatCoordinate(incident.longitude)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mô tả chi tiết</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
            {incident.mo_ta_chi_tiet || 'Chưa có mô tả.'}
          </p>
        </div>

        {incident.related_lights && incident.related_lights.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Danh sách đèn liên quan ({incident.related_lights.length} thiết bị)
            </p>
            <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2">Mã đèn</th>
                    <th className="px-3 py-2">Tuyến đường</th>
                    <th className="px-3 py-2">Khu vực</th>
                    <th className="px-3 py-2">Tọa độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {incident.related_lights.map((light: any) => (
                    <tr key={light.name || light.ma_tai_san} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-bold text-slate-900">{light.ma_tai_san}</td>
                      <td className="px-3 py-2">{light.route_name || '—'}</td>
                      <td className="px-3 py-2">{light.ten_khu_vuc || light.khu_vuc || '—'}</td>
                      <td className="px-3 py-2">
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

const StreetLightIncidents = () => {
  const location = useLocation();
  const [incidents, setIncidents] = useState<StreetLightIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState((location.state as any)?.notice || '');
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<StreetLightIncident | null>(null);
  const [updatingName, setUpdatingName] = useState('');

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStreetLightIncidents({ limit: 500 });
      setIncidents(data);
    } catch {
      setError('Không thể tải danh sách sự cố đèn đường.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const routeOptions = useMemo(() => uniqueValues(incidents, (item) => item.route_name), [incidents]);
  const areaOptions = useMemo(
    () => uniqueValues(incidents, (item) => item.ten_khu_vuc || item.khu_vuc),
    [incidents]
  );

  const filteredIncidents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      const searchable = [
        incident.tieu_de,
        incident.ma_tai_san,
        incident.route_name,
        incident.ten_khu_vuc,
        incident.mo_ta_chi_tiet,
        incident.nguoi_bao_cao,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!keyword || searchable.includes(keyword)) &&
        (!routeFilter || incident.route_name === routeFilter) &&
        (!areaFilter || incident.ten_khu_vuc === areaFilter || incident.khu_vuc === areaFilter) &&
        (!statusFilter || incident.trang_thai === statusFilter) &&
        (!priorityFilter || incident.muc_do_uu_tien === priorityFilter)
      );
    });
  }, [areaFilter, incidents, priorityFilter, routeFilter, search, statusFilter]);

  const handleUpdateStatus = async (incident: StreetLightIncident, status: string) => {
    setUpdatingName(incident.name);
    setNotice('');
    try {
      await updateIncidentStatus(incident.name, status);
      setNotice(`Đã cập nhật sự cố ${incident.name} thành ${status}.`);
      await loadIncidents();
    } catch {
      setError('Không thể cập nhật trạng thái sự cố.');
    } finally {
      setUpdatingName('');
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-red-50 to-orange-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-red-50 to-orange-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">
                Sự cố & phản ánh
              </div>
              <h1 className="text-3xl font-black text-slate-950">Danh sách sự cố đèn đường</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Theo dõi, phân loại và xử lý phản ánh hỏng hóc hệ thống chiếu sáng đô thị
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/street-lights/incidents/new"
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700"
              >
                + Báo cáo sự cố mới
              </Link>
              <button onClick={loadIncidents} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                ↻ Làm mới
              </button>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div> : null}
            <div className="grid gap-4 lg:grid-cols-[1fr_190px_190px_190px_190px]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tiêu đề, mã đèn, tuyến, người báo..." className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
              <select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="">Tất cả tuyến</option>{routeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="">Tất cả khu vực</option>{areaOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="">Tất cả trạng thái</option>{STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="">Tất cả ưu tiên</option>{PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </div>
            <p className="text-sm font-bold text-slate-500">Hiển thị {filteredIncidents.length} / {incidents.length} sự cố</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm">
          {error ? <div className="m-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div> : null}
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-slate-500">Không có sự cố phù hợp với bộ lọc hiện tại.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Sự cố</th>
                    <th className="px-5 py-4">Đèn/Tuyến</th>
                    <th className="px-5 py-4">Khu vực</th>
                    <th className="px-5 py-4">Ưu tiên</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Người báo</th>
                    <th className="px-5 py-4">Tạo lúc</th>
                    <th className="px-5 py-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.name} className="hover:bg-red-50/30">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{incident.tieu_de}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-400">{incident.name}</span>
                          {incident.related_lights_count && incident.related_lights_count > 1 ? (
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-800">
                              {incident.related_lights_count} đèn ảnh hưởng
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600"><p>{incident.ma_tai_san || 'Chưa xác định'}</p><p className="mt-1 text-xs text-slate-400">{incident.route_name || 'Chưa có tuyến'}</p></td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">{incident.ten_khu_vuc || incident.khu_vuc || 'Chưa xác định'}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(incident.muc_do_uu_tien, priorityClasses)}`}>{incident.muc_do_uu_tien || 'Không rõ'}</span></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(incident.trang_thai, statusClasses)}`}>{incident.trang_thai || 'Không rõ'}</span></td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-600"><p>{incident.nguoi_bao_cao || 'Chưa có'}</p><p className="text-xs text-slate-400">{incident.sdt_lien_he || ''}</p></td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">{formatDateTime(incident.creation)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedIncident(incident)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Chi tiết</button>
                          {['Đang xử lý', 'Đã giải quyết', 'Đã đóng'].map((status) => (
                            <button key={status} disabled={updatingName === incident.name || incident.trang_thai === status} onClick={() => handleUpdateStatus(incident, status)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40">{status}</button>
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
      {selectedIncident ? <IncidentDetailModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} /> : null}
    </div>
  );
};

export default StreetLightIncidents;
