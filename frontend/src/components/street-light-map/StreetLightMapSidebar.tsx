import type { MapMode, StreetLight, StreetLightMapFilters } from './streetLightTypes';
import {
  buildAreaOptions,
  buildRouteOptions,
  formatCoordinate,
  getStatusBadgeClass,
  normalizeRouteName,
} from './streetLightMapUtils';

const STATUS_OPTIONS = ['', 'Hoạt động', 'Hỏng', 'Bảo trì'];

interface StreetLightMapSidebarProps {
  lights: StreetLight[];
  allLights: StreetLight[];
  selectedLight: StreetLight | null;
  filters: StreetLightMapFilters;
  mapMode: MapMode;
  loading?: boolean;
  onChangeFilters: (filters: Partial<StreetLightMapFilters>) => void;
  onSelectLight: (light: StreetLight) => void;
}

const LightListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mb-4 h-5 w-52 animate-pulse rounded bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
      💡
    </div>
    <p className="text-sm font-semibold text-slate-700">{message}</p>
  </div>
);

const StreetLightMapSidebar = ({
  lights,
  allLights,
  selectedLight,
  filters,
  mapMode,
  loading = false,
  onChangeFilters,
  onSelectLight,
}: StreetLightMapSidebarProps) => {
  const areaOptions = buildAreaOptions(allLights);
  const routeOptions = buildRouteOptions(allLights);

  return (
    <aside className="border-r border-slate-100 bg-slate-50/90">
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bộ lọc</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300">Khu vực</label>
            <select
              value={filters.khu_vuc}
              onChange={(event) => onChangeFilters({ khu_vuc: event.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
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
            <label className="mb-2 block text-xs font-semibold text-slate-300">Trạng thái</label>
            <select
              value={filters.trang_thai}
              onChange={(event) => onChangeFilters({ trang_thai: event.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status || 'Tất cả'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300">Tuyến đường</label>
            <select
              value={filters.route_name}
              onChange={(event) => onChangeFilters({ route_name: event.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">Tất cả</option>
              {routeOptions.map((route) => (
                <option key={route.value} value={route.value}>
                  {route.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-300">Tìm kiếm</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                value={filters.search}
                onChange={(event) => onChangeFilters({ search: event.target.value })}
                placeholder="Mã hoặc tên đèn..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 pl-10 text-sm font-semibold text-white outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Danh sách đèn</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {lights.length} / {allLights.length} đèn
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            {mapMode.toUpperCase()}
          </span>
        </div>

        <div className="max-h-[480px] overflow-y-auto pr-1 lg:max-h-[520px]">
          {loading ? (
            <LightListSkeleton />
          ) : lights.length === 0 ? (
            <EmptyState message="Không có đèn phù hợp với bộ lọc hiện tại." />
          ) : (
            <div className="space-y-3">
              {lights.map((light) => {
                const isSelected = selectedLight?.name === light.name;
                const routeName = normalizeRouteName(light);

                return (
                  <button
                    key={light.name}
                    type="button"
                    onClick={() => onSelectLight(light)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-blue-700">
                          {light.ma_tai_san}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
                          {light.ten_tai_san}
                        </h3>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                          👁
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${getStatusBadgeClass(light.trang_thai)}`}>
                          {light.trang_thai || 'Không rõ'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-medium text-slate-500">
                      <p>🛣️ {routeName || 'Chưa xác định tuyến'}</p>
                      <p>📍 {light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'}</p>
                      <p>{formatCoordinate(light.latitude, light.longitude)}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        Xem trên bản đồ
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        {mapMode.toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default StreetLightMapSidebar;
