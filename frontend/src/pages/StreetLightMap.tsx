import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createStreetLight,
  createStreetLightRoute,
  generateStreetLightsForRoute,
  getStreetLightDataHistory,
  getStreetLightMap,
  getStreetLightAreas,
  getStreetLightRoutes,
  getStreetLights,
  type StreetLightAreaOption,
  type StreetLightDataHistoryItem,
} from '../api/streetLightApi';
import StreetLightMapSidebar from '../components/street-light-map/StreetLightMapSidebar';
import StreetLightMapViewLayout from '../components/street-light-map/StreetLightMapViewLayout';
import StreetLightTreeMap from '../components/street-light-map/StreetLightTreeMap';
import type {
  BaseMapType,
  MapMode,
  StreetLight,
  StreetLightMapFilters,
  StreetLightRoute,
} from '../components/street-light-map/streetLightTypes';
import {
  filterLights,
  buildAreaOptions,
  buildRouteOptions,
  getStatusColor,
  hasCoordinates,
} from '../components/street-light-map/streetLightMapUtils';

const baseLayerLabels: Record<BaseMapType, string> = {
  street: 'Bản đồ',
  satellite: 'Vệ tinh',
};

interface MapToolbarProps {
  mapMode: MapMode;
  baseLayer: BaseMapType;
  onMapModeChange: (mode: MapMode) => void;
  onBaseLayerChange: (layer: BaseMapType) => void;
  onFit: () => void;
}

const MapToolbar = ({
  mapMode,
  baseLayer,
  onMapModeChange,
  onBaseLayerChange,
  onFit,
}: MapToolbarProps) => {
  return (
    <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-xl backdrop-blur sm:flex-row">
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['street', 'satellite'] as BaseMapType[]).map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => onBaseLayerChange(layer)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              baseLayer === layer ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            {baseLayerLabels[layer]}
          </button>
        ))}
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['2d', '3d'] as MapMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onMapModeChange(mode)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              mapMode === mode ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onFit}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Fit
      </button>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
      💡
    </div>
    <p className="text-sm font-semibold text-slate-700">{message}</p>
  </div>
);

const formatDateTime = (value?: string) => {
  if (!value) return 'Chưa có';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('vi-VN');
};

const STATUS_OPTIONS = ['Hoạt động', 'Hỏng', 'Bảo trì'];

interface AddLightForm {
  ma_tai_san: string;
  route_name: string;
  khu_vuc: string;
  latitude: string;
  longitude: string;
  trang_thai: string;
}

interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface RouteForm {
  ma_tuyen: string;
  ten_tuyen: string;
  khu_vuc: string;
  ghi_chu: string;
}

interface GenerateForm {
  route: string;
  ma_prefix: string;
  count: string;
  start_index: string;
  both_sides: boolean;
  offset: string;
}

const StreetLightMap = () => {
  const [lights, setLights] = useState<StreetLight[]>([]);
  const [routes, setRoutes] = useState<StreetLightRoute[]>([]);
  const [areas, setAreas] = useState<StreetLightAreaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<StreetLightMapFilters>({
    khu_vuc: '',
    route_name: '',
    trang_thai: '',
    search: '',
  });
  const [selectedLight, setSelectedLight] = useState<StreetLight | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('2d');
  const [baseLayer, setBaseLayer] = useState<BaseMapType>('street');
  const [fitSignal, setFitSignal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingLight, setSavingLight] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [drawingRoutePoints, setDrawingRoutePoints] = useState<PickedLocation[]>([]);
  const [history, setHistory] = useState<StreetLightDataHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [savingRoute, setSavingRoute] = useState(false);
  const [generatingLights, setGeneratingLights] = useState(false);
  const [addForm, setAddForm] = useState<AddLightForm>({
    ma_tai_san: '',
    route_name: '',
    khu_vuc: '',
    latitude: '',
    longitude: '',
    trang_thai: 'Hoạt động',
  });
  const [routeForm, setRouteForm] = useState<RouteForm>({
    ma_tuyen: '',
    ten_tuyen: '',
    khu_vuc: '',
    ghi_chu: '',
  });
  const [generateForm, setGenerateForm] = useState<GenerateForm>({
    route: '',
    ma_prefix: 'DEN',
    count: '20',
    start_index: '1',
    both_sides: true,
    offset: '0.000035',
  });

  const loadLights = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [lightList, mapLights] = await Promise.all([
        getStreetLights({ limit: 500 }),
        getStreetLightMap(),
      ]);
      const mapByName = new Map(mapLights.map((light) => [light.name, light]));
      const sourceLights = lightList.length > 0 ? lightList : mapLights;
      const mergedLights = sourceLights.map((light) => {
        const mapLight = mapByName.get(light.name);
        return {
          ...light,
          latitude: light.latitude ?? mapLight?.latitude ?? null,
          longitude: light.longitude ?? mapLight?.longitude ?? null,
          ten_khu_vuc: light.ten_khu_vuc ?? mapLight?.ten_khu_vuc,
          route_name: light.route_name ?? mapLight?.route_name,
        };
      });

      setLights(mergedLights);
      setSelectedLight((current) => {
        if (current && mergedLights.some((light) => light.name === current.name)) {
          return mergedLights.find((light) => light.name === current.name) ?? current;
        }

        return null;
      });
    } catch {
      setError('Không thể tải dữ liệu bản đồ đèn đường. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      const routeList = await getStreetLightRoutes();
      setRoutes(routeList);
      setGenerateForm((form) => ({
        ...form,
        route: form.route || routeList[0]?.name || '',
      }));
    } catch {
      setRoutes([]);
    }
  }, []);

  const loadAreas = useCallback(async () => {
    try {
      const areaList = await getStreetLightAreas();
      setAreas(areaList);
    } catch {
      setAreas([]);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getStreetLightDataHistory(30);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadLights();
    loadRoutes();
    loadAreas();
    loadHistory();
  }, [loadAreas, loadHistory, loadLights, loadRoutes]);

  const lightsWithCoordinates = useMemo(() => lights.filter(hasCoordinates), [lights]);

  const filteredLights = useMemo(
    () => filterLights(lightsWithCoordinates, filters),
    [filters, lightsWithCoordinates]
  );
  const areaOptions = useMemo(() => {
    const optionsFromLights = buildAreaOptions(lightsWithCoordinates);
    return optionsFromLights.length > 0 ? optionsFromLights : areas;
  }, [areas, lightsWithCoordinates]);
  const routeOptions = useMemo(() => buildRouteOptions(lightsWithCoordinates), [lightsWithCoordinates]);

  useEffect(() => {
    if (!selectedLight) return;

    const selectedStillVisible = filteredLights.some((light) => light.name === selectedLight.name);
    if (!selectedStillVisible) {
      setSelectedLight(null);
    }
  }, [filteredLights, selectedLight]);

  const handleChangeFilters = (nextFilters: Partial<StreetLightMapFilters>) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }));
  };

  const handleFitMap = () => {
    setFitSignal((value) => value + 1);
  };

  const startPickingLocation = () => {
    setAddError('');
    setShowAddModal(false);
    setSelectedLight(null);
    setMapMode('2d');
    setIsPickingLocation(true);
  };

  const openRouteModal = () => {
    setRouteError('');
    setRouteForm((form) => ({
      ...form,
      khu_vuc: filters.khu_vuc || form.khu_vuc || areaOptions[0]?.value || '',
    }));
    setShowRouteModal(true);
  };

  const startDrawingRoute = () => {
    setRouteError('');
    setShowRouteModal(false);
    setMapMode('2d');
    setIsDrawingRoute(true);
    setIsPickingLocation(false);
  };

  const cancelDrawingRoute = () => {
    setIsDrawingRoute(false);
  };

  const handleAddRoutePoint = (point: PickedLocation) => {
    setDrawingRoutePoints((points) => [...points, point]);
  };

  const undoRoutePoint = () => {
    setDrawingRoutePoints((points) => points.slice(0, -1));
  };

  const finishDrawingRoute = () => {
    setIsDrawingRoute(false);
    setShowRouteModal(true);
  };

  const handleSaveRoute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRouteError('');
    if (drawingRoutePoints.length < 2) {
      setRouteError('Cần vẽ ít nhất 2 điểm trên bản đồ để lưu tuyến.');
      return;
    }

    setSavingRoute(true);
    try {
      await createStreetLightRoute({
        ma_tuyen: routeForm.ma_tuyen.trim(),
        ten_tuyen: routeForm.ten_tuyen.trim(),
        khu_vuc: routeForm.khu_vuc,
        polyline: drawingRoutePoints,
        ghi_chu: routeForm.ghi_chu,
      });
      setShowRouteModal(false);
      setIsDrawingRoute(false);
      setDrawingRoutePoints([]);
      setRouteForm({ ma_tuyen: '', ten_tuyen: '', khu_vuc: routeForm.khu_vuc, ghi_chu: '' });
      await loadRoutes();
      await loadHistory();
    } catch {
      setRouteError('Không thể lưu tuyến. Kiểm tra mã tuyến và dữ liệu vẽ.');
    } finally {
      setSavingRoute(false);
    }
  };

  const handleGenerateLights = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRouteError('');
    setGeneratingLights(true);
    try {
      await generateStreetLightsForRoute({
        route: generateForm.route,
        ma_prefix: generateForm.ma_prefix.trim(),
        count: Number(generateForm.count),
        start_index: Number(generateForm.start_index),
        both_sides: generateForm.both_sides,
        offset: Number(generateForm.offset),
        trang_thai: 'Hoạt động',
      });
      setShowGenerateModal(false);
      await loadLights(true);
      await loadHistory();
    } catch {
      setRouteError('Không thể tạo chuỗi đèn. Kiểm tra tuyến, mã prefix và số lượng.');
    } finally {
      setGeneratingLights(false);
    }
  };

  const cancelPickingLocation = () => {
    setIsPickingLocation(false);
  };

  const handlePickLocation = (location: PickedLocation) => {
    setPickedLocation(location);
    setAddForm((form) => ({
      ...form,
      latitude: location.latitude.toFixed(6),
      longitude: location.longitude.toFixed(6),
    }));
    setIsPickingLocation(false);
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setAddError('');
    setAddForm((current) => ({
      ...current,
      route_name: filters.route_name || current.route_name || routeOptions[0]?.value || '',
      khu_vuc: filters.khu_vuc || current.khu_vuc || areaOptions[0]?.value || '',
      latitude: selectedLight?.latitude ? String(selectedLight.latitude) : current.latitude,
      longitude: selectedLight?.longitude ? String(selectedLight.longitude) : current.longitude,
    }));
    setShowAddModal(true);
  };

  const handleCreateLight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError('');

    const latitude = Number(addForm.latitude);
    const longitude = Number(addForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setAddError('Tọa độ latitude/longitude không hợp lệ.');
      return;
    }

    setSavingLight(true);
    try {
      await createStreetLight({
        ma_tai_san: addForm.ma_tai_san.trim(),
        route_name: addForm.route_name.trim(),
        khu_vuc: addForm.khu_vuc,
        latitude,
        longitude,
        trang_thai: addForm.trang_thai,
      });
      setShowAddModal(false);
      setAddForm({
        ma_tai_san: '',
        route_name: addForm.route_name,
        khu_vuc: addForm.khu_vuc,
        latitude: '',
        longitude: '',
        trang_thai: 'Hoạt động',
      });
      setPickedLocation(null);
      await loadLights(true);
      await loadHistory();
    } catch {
      setAddError('Không thể tạo đèn. Kiểm tra mã đèn, khu vực và tọa độ.');
    } finally {
      setSavingLight(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={openAddModal}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        ＋ Thêm đèn
      </button>
      <button
        type="button"
        onClick={openRouteModal}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
      >
        ✎ Vẽ tuyến
      </button>
      <button
        type="button"
        onClick={() => {
          setRouteError('');
          setGenerateForm((form) => ({ ...form, route: form.route || routes[0]?.name || '' }));
          setShowGenerateModal(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
      >
        ⛓ Tạo chuỗi đèn
      </button>
      <button
        type="button"
        onClick={() => {
          setShowHistoryModal(true);
          loadHistory();
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
      >
        📜 Lịch sử
      </button>
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
  );

  const sidebar = (
    <StreetLightMapSidebar
      lights={filteredLights}
      allLights={lightsWithCoordinates}
      selectedLight={selectedLight}
      filters={filters}
      mapMode={mapMode}
      loading={loading}
      onChangeFilters={handleChangeFilters}
      onSelectLight={setSelectedLight}
    />
  );

  const mapContent = error ? (
    <div className="flex h-full min-h-[720px] items-center justify-center bg-slate-100 p-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-red-600 shadow-sm">
          !
        </div>
        <h2 className="text-lg font-bold text-red-900">Không tải được bản đồ</h2>
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
  ) : loading ? (
    <div className="flex h-full min-h-[720px] items-center justify-center bg-slate-100">
      <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
        Đang tải bản đồ GIS...
      </div>
    </div>
  ) : (
    <>
      <StreetLightTreeMap
        lights={filteredLights}
        selectedLight={selectedLight}
        mapMode={mapMode}
        basemap={baseLayer}
        fitSignal={fitSignal}
        isPickingLocation={isPickingLocation}
        pickedLocation={pickedLocation}
        savedRoutes={routes}
        isDrawingRoute={isDrawingRoute}
        drawingRoutePoints={drawingRoutePoints}
        onSelectLight={setSelectedLight}
        onPickLocation={handlePickLocation}
        onCancelPickLocation={cancelPickingLocation}
        onAddRoutePoint={handleAddRoutePoint}
        onUndoRoutePoint={undoRoutePoint}
        onFinishDrawRoute={finishDrawingRoute}
        onCancelDrawRoute={cancelDrawingRoute}
      />

      {lightsWithCoordinates.length === 0 && routes.length === 0 ? (
        <div className="absolute bottom-4 left-4 z-[500] rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur">
          Chưa có đèn/tuyến. Bạn vẫn có thể bấm “✎ Vẽ tuyến” để tạo tuyến đầu tiên.
        </div>
      ) : null}

      <div className="absolute bottom-4 right-4 z-[500] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Chú giải</p>
        <div className="space-y-2">
          {['Hoạt động', 'Hỏng', 'Bảo trì'].map((status) => (
            <div key={status} className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span
                className="h-3 w-3 rounded-full ring-2 ring-white"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              {status}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const toolbar = !error && !loading ? (
    <MapToolbar
      mapMode={mapMode}
      baseLayer={baseLayer}
      onMapModeChange={setMapMode}
      onBaseLayerChange={setBaseLayer}
      onFit={handleFitMap}
    />
  ) : null;

  return (
    <>
      <StreetLightMapViewLayout
        headerTitle="Bản đồ GIS"
        headerSubtitle="Hiển thị tài sản đèn đường trên bản đồ"
        sidebar={sidebar}
        map={mapContent}
        toolbar={toolbar}
        headerActions={headerActions}
      />

      {showAddModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateLight}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Nhập dữ liệu thủ công
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Thêm đèn đường</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nhập tọa độ đúng theo tuyến thực tế để hệ thống hiển thị chính xác trên map.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            {addError ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {addError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Mã đèn
                <input
                  required
                  value={addForm.ma_tai_san}
                  onChange={(event) => setAddForm((form) => ({ ...form, ma_tai_san: event.target.value }))}
                  placeholder="VD: DEN-MANUAL-001"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Tuyến đường
                <input
                  required
                  list="street-light-routes"
                  value={addForm.route_name}
                  onChange={(event) => setAddForm((form) => ({ ...form, route_name: event.target.value }))}
                  placeholder="VD: Đường Hùng Vương"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <datalist id="street-light-routes">
                  {routeOptions.map((route) => (
                    <option key={route.value} value={route.value} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Khu vực
                <select
                  required
                  value={addForm.khu_vuc}
                  onChange={(event) => setAddForm((form) => ({ ...form, khu_vuc: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn khu vực</option>
                  {areaOptions.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Trạng thái
                <select
                  value={addForm.trang_thai}
                  onChange={(event) => setAddForm((form) => ({ ...form, trang_thai: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Latitude
                <input
                  required
                  type="number"
                  step="0.000001"
                  value={addForm.latitude}
                  onChange={(event) => setAddForm((form) => ({ ...form, latitude: event.target.value }))}
                  placeholder="16.054800"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Longitude
                <input
                  required
                  type="number"
                  step="0.000001"
                  value={addForm.longitude}
                  onChange={(event) => setAddForm((form) => ({ ...form, longitude: event.target.value }))}
                  placeholder="108.202200"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-900">Chọn tọa độ từ bản đồ</p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    Modal sẽ tạm đóng, bấm lên bản đồ để tự điền latitude/longitude.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startPickingLocation}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Chọn vị trí trên bản đồ
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingLight}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLight ? 'Đang lưu...' : 'Lưu đèn'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showRouteModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveRoute} className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Tuyến đường</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Vẽ và lưu tuyến đường</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bấm “Bắt đầu vẽ”, chọn nhiều điểm trên bản đồ rồi quay lại lưu tuyến.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            {routeError ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {routeError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Mã tuyến
                <input
                  required
                  value={routeForm.ma_tuyen}
                  onChange={(event) => setRouteForm((form) => ({ ...form, ma_tuyen: event.target.value }))}
                  placeholder="VD: ROUTE-HUNG-VUONG"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Tên tuyến
                <input
                  required
                  value={routeForm.ten_tuyen}
                  onChange={(event) => setRouteForm((form) => ({ ...form, ten_tuyen: event.target.value }))}
                  placeholder="VD: Đường Hùng Vương"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Khu vực
                <select
                  required
                  value={routeForm.khu_vuc}
                  onChange={(event) => setRouteForm((form) => ({ ...form, khu_vuc: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">Chọn khu vực</option>
                  {areaOptions.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Ghi chú
                <input
                  value={routeForm.ghi_chu}
                  onChange={(event) => setRouteForm((form) => ({ ...form, ghi_chu: event.target.value }))}
                  placeholder="Ghi chú tuyến"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-orange-900">Điểm tuyến đã vẽ: {drawingRoutePoints.length}</p>
                  <p className="mt-1 text-xs font-semibold text-orange-700">Cần ít nhất 2 điểm để lưu tuyến.</p>
                </div>
                <button
                  type="button"
                  onClick={startDrawingRoute}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
                >
                  Bắt đầu vẽ tuyến
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingRoute}
                className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRoute ? 'Đang lưu...' : 'Lưu tuyến'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showGenerateModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleGenerateLights} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Chuỗi đèn</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Tạo chuỗi đèn theo tuyến</h2>
                <p className="mt-1 text-sm text-slate-500">Rải nhiều đèn theo polyline tuyến đã vẽ.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            {routeError ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {routeError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Tuyến đường
                <select
                  required
                  value={generateForm.route}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, route: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn tuyến</option>
                  {routes.map((route) => (
                    <option key={route.name} value={route.name}>
                      {route.ten_tuyen}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Mã prefix
                <input
                  required
                  value={generateForm.ma_prefix}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, ma_prefix: event.target.value }))}
                  placeholder="DEN-HV"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Số lượng
                <input
                  required
                  type="number"
                  min="1"
                  value={generateForm.count}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, count: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Số bắt đầu
                <input
                  type="number"
                  min="1"
                  value={generateForm.start_index}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, start_index: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Offset hai bên
                <input
                  type="number"
                  step="0.000001"
                  value={generateForm.offset}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, offset: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={generateForm.both_sides}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, both_sides: event.target.checked }))}
                />
                Rải đèn hai bên tuyến đường
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={generatingLights}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingLights ? 'Đang tạo...' : 'Tạo chuỗi đèn'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showHistoryModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Dữ liệu đèn đường</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Lịch sử thêm/sửa/xóa dữ liệu</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ghi lại thao tác tạo tuyến, thêm đèn, tạo chuỗi đèn và xóa/cập nhật thiết bị.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
            <div className="max-h-[58vh] divide-y divide-slate-100 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-sm font-bold text-slate-500">Đang tải lịch sử...</div>
              ) : history.length === 0 ? (
                <EmptyState message="Chưa có lịch sử thao tác dữ liệu." />
              ) : (
                history.map((item) => (
                  <div key={item.name} className="grid gap-3 px-6 py-4 md:grid-cols-[150px_1fr_160px]">
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
            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingHistory ? 'Đang tải...' : 'Làm mới lịch sử'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default StreetLightMap;
