import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createStreetLight,
  createStreetLightRoute,
  createBatchStreetLights,
  generateStreetLightsForRoute,
  getStreetLightDataHistory,
  getStreetLightDeviceTypes,
  getStreetLightMap,
  getStreetLightAreas,
  getStreetLightRoutes,
  getStreetLights,
  type StreetLightAreaOption,
  type StreetLightDataHistoryItem,
  type StreetLightDeviceType,
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
  normalizeRouteName,
  normalizeRouteTitle,
} from '../components/street-light-map/streetLightMapUtils';

const BASEMAP_OPTIONS: Array<{ value: BaseMapType; label: string; note?: string }> = [
  { value: 'standard', label: 'Chuẩn' },
  { value: 'light', label: 'Sáng chuẩn' },
  { value: 'dark', label: 'Tối chuẩn' },
  { value: 'satellite', label: 'Vệ tinh chuẩn' },
  { value: 'outdoors', label: 'Ngoài trời' },
  { value: 'osm', label: 'OSM' },
  { value: 'google', label: 'Google', note: 'fallback OSM' },
  { value: 'google_satellite', label: 'Google vệ tinh', note: 'fallback Esri' },
  { value: 'arcgis', label: 'ArcGIS' },
  { value: 'arcgis_satellite', label: 'ArcGIS vệ tinh' },
];

const getBaseMapLabel = (baseLayer: BaseMapType) =>
  BASEMAP_OPTIONS.find((option) => option.value === baseLayer)?.label || 'Chuẩn';

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
  const [isBasemapOpen, setIsBasemapOpen] = useState(false);

  return (
    <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-xl backdrop-blur sm:flex-row">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsBasemapOpen((value) => !value)}
          className="flex min-w-[138px] items-center justify-between gap-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <span>{getBaseMapLabel(baseLayer)}</span>
          <span className={isBasemapOpen ? 'rotate-180 transition' : 'transition'}>⌄</span>
        </button>
        {isBasemapOpen ? (
          <div className="absolute right-0 top-12 z-[550] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            {BASEMAP_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onBaseLayerChange(option.value);
                  setIsBasemapOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                  baseLayer === option.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>
                  {option.label}
                  {option.note ? (
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">
                      ({option.note})
                    </span>
                  ) : null}
                </span>
                {baseLayer === option.value ? <span>✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}
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
const DEFAULT_DEVICE_TYPE_CODE = 'DEN-LED-9M';

interface AddLightForm {
  ma_tai_san: string;
  route_name: string;
  khu_vuc: string;
  latitude: string;
  longitude: string;
  trang_thai: string;
  device_type_code: string;
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
  route_id: string;
  ma_prefix: string;
  count: string;
  start_index: string;
  both_sides: boolean;
  offset: string;
  device_type_code: string;
  placement_mode: 'single_side' | 'both_sides';
  side: 'left' | 'right';
  offset_m: string;
  start_margin_m: string;
  end_margin_m: string;
  operation_mode: 'append' | 'replace';
}

const getRouteId = (route?: StreetLightRoute | null) =>
  (route as (StreetLightRoute & { route_id?: string }) | undefined)?.route_id || route?.name || '';

const calculatePolylineLengthM = (points: Array<{ latitude: number; longitude: number }>) => {
  if (!points || points.length < 2) return 0;
  let dist = 0;
  const R = 6371000; // Earth radius in meters
  for (let i = 0; i < points.length - 1; i++) {
    const lat1 = (points[i].latitude * Math.PI) / 180;
    const lon1 = (points[i].longitude * Math.PI) / 180;
    const lat2 = (points[i+1].latitude * Math.PI) / 180;
    const lon2 = (points[i+1].longitude * Math.PI) / 180;
    
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;
    const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    dist += R * c;
  }
  return dist;
};

const parseRouteInput = (inputText: string): Array<{ latitude: number; longitude: number }> => {
  const text = inputText.trim();
  if (!text) {
    throw new Error('Dữ liệu trống.');
  }

  // Attempt to parse JSON
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);

      // A. GeoJSON LineString
      if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
        return parsed.coordinates.map((coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return { latitude: Number(coord[1]), longitude: Number(coord[0]) };
          }
          throw new Error('Định dạng coordinates GeoJSON không hợp lệ.');
        });
      }

      // B. GeoJSON Feature
      if (
        parsed.type === 'Feature' &&
        parsed.geometry &&
        parsed.geometry.type === 'LineString' &&
        Array.isArray(parsed.geometry.coordinates)
      ) {
        return parsed.geometry.coordinates.map((coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return { latitude: Number(coord[1]), longitude: Number(coord[0]) };
          }
          throw new Error('Định dạng coordinates GeoJSON không hợp lệ.');
        });
      }

      // C. JSON Array
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            const val0 = Number(item[0]);
            const val1 = Number(item[1]);
            if (val0 > 100 && val1 < 30) {
              return { latitude: val1, longitude: val0 };
            } else {
              return { latitude: val0, longitude: val1 };
            }
          } else if (item && typeof item === 'object') {
            const lat = item.latitude ?? item.lat;
            const lng = item.longitude ?? item.lng;
            if (lat !== undefined && lng !== undefined) {
              return { latitude: Number(lat), longitude: Number(lng) };
            }
          }
          throw new Error('Mỗi phần tử trong mảng JSON phải là [lat, lng] hoặc {lat, lng}.');
        });
      }
    } catch (err: any) {
      if ((err.message && err.message.includes('Mỗi phần tử')) || err.message.includes('coordinates')) {
        throw err;
      }
    }
  }

  // D. Text line by line
  const lines = text.split('\n');
  const points: Array<{ latitude: number; longitude: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/[,\s;\t]+/).map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (parts[0] > 100 && parts[1] < 30) {
        points.push({ latitude: parts[1], longitude: parts[0] });
      } else {
        points.push({ latitude: parts[0], longitude: parts[1] });
      }
    } else {
      throw new Error(`Dòng thứ ${i + 1} không đúng định dạng "lat,lng": "${line}"`);
    }
  }

  if (points.length < 2) {
    throw new Error('Tuyến đường phải có ít nhất 2 điểm.');
  }

  return points;
};

const getDefaultDeviceTypeCode = (deviceTypes: StreetLightDeviceType[]) =>
  deviceTypes.find((deviceType) => deviceType.ma_loai === DEFAULT_DEVICE_TYPE_CODE)?.ma_loai ||
  deviceTypes[0]?.ma_loai ||
  DEFAULT_DEVICE_TYPE_CODE;

const formatDeviceTypeSummary = (deviceType?: StreetLightDeviceType) => {
  if (!deviceType) return 'Chưa tải được thông tin loại thiết bị.';

  const details = [
    deviceType.cong_suat_w ? `Công suất ${deviceType.cong_suat_w}W` : '',
    deviceType.chieu_cao_cot_m ? `Cột ${deviceType.chieu_cao_cot_m}m` : '',
    deviceType.loai_bong_den ? `Bóng ${deviceType.loai_bong_den}` : '',
  ].filter(Boolean);

  return details.length > 0 ? details.join(' · ') : 'Chưa có thông số kỹ thuật.';
};

const StreetLightMap = () => {
  const [lights, setLights] = useState<StreetLight[]>([]);
  const [routes, setRoutes] = useState<StreetLightRoute[]>([]);
  const [areas, setAreas] = useState<StreetLightAreaOption[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<StreetLightDeviceType[]>([]);
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
  const [baseLayer, setBaseLayer] = useState<BaseMapType>('standard');
  const [fitSignal, setFitSignal] = useState(0);
  const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
  const [showChainChoiceModal, setShowChainChoiceModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');
  const [batchCoordsText, setBatchCoordsText] = useState('');
  const [batchPoints, setBatchPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [quickCoord, setQuickCoord] = useState('');
  const [savingLight, setSavingLight] = useState(false);
  const [addError, setAddError] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeInputMode, setRouteInputMode] = useState<'draw' | 'import'>('draw');
  const [routeTextData, setRouteTextData] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [openGenerateAfterRouteSave, setOpenGenerateAfterRouteSave] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [detailLight, setDetailLight] = useState<StreetLight | null>(null);
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
    device_type_code: DEFAULT_DEVICE_TYPE_CODE,
  });
  const [routeForm, setRouteForm] = useState<RouteForm>({
    ma_tuyen: '',
    ten_tuyen: '',
    khu_vuc: '',
    ghi_chu: '',
  });
  const [generateForm, setGenerateForm] = useState<GenerateForm>({
    route_id: '',
    ma_prefix: 'DEN',
    count: '20',
    start_index: '1',
    both_sides: true,
    offset: '0.000035',
    device_type_code: DEFAULT_DEVICE_TYPE_CODE,
    placement_mode: 'both_sides',
    side: 'left',
    offset_m: '6',
    start_margin_m: '0',
    end_margin_m: '0',
    operation_mode: 'append',
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
        getStreetLights({ limit: 5000 }),
        getStreetLightMap(),
      ]);
      const mapByName = new Map(mapLights.map((light) => [light.name, light]));
      const lightByName = new Map(lightList.map((light) => [light.name, light]));
      const sourceLights = Array.from(
        new Map([...mapLights, ...lightList].map((light) => [light.name, light])).values()
      );
      const mergedLights = sourceLights.map((light) => {
        const mapLight = mapByName.get(light.name);
        const detailLight = lightByName.get(light.name);
        const mergedLight = {
          ...mapLight,
          ...detailLight,
          ...light,
          latitude: light.latitude ?? detailLight?.latitude ?? mapLight?.latitude ?? null,
          longitude: light.longitude ?? detailLight?.longitude ?? mapLight?.longitude ?? null,
          ten_khu_vuc: light.ten_khu_vuc ?? detailLight?.ten_khu_vuc ?? mapLight?.ten_khu_vuc,
          route_name: light.route_name ?? detailLight?.route_name ?? mapLight?.route_name,
        };

        return {
          ...mergedLight,
          route_name: normalizeRouteName(mergedLight) || mergedLight.route_name,
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
        route_id: form.route_id || getRouteId(routeList[0]) || '',
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

  const loadDeviceTypes = useCallback(async () => {
    try {
      const deviceTypeList = await getStreetLightDeviceTypes();
      const defaultCode = getDefaultDeviceTypeCode(deviceTypeList);
      setDeviceTypes(deviceTypeList);
      setAddForm((form) => ({
        ...form,
        device_type_code: form.device_type_code || defaultCode,
      }));
      setGenerateForm((form) => ({
        ...form,
        device_type_code: form.device_type_code || defaultCode,
      }));
    } catch {
      setDeviceTypes([]);
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
    loadDeviceTypes();
    loadHistory();
  }, [loadAreas, loadDeviceTypes, loadHistory, loadLights, loadRoutes]);

  const lightsWithCoordinates = useMemo(() => lights.filter(hasCoordinates), [lights]);

  const filteredLights = useMemo(
    () => filterLights(lightsWithCoordinates, filters),
    [filters, lightsWithCoordinates]
  );
  const areaOptions = useMemo(() => {
    const optionsFromLights = buildAreaOptions(lightsWithCoordinates);
    const merged = new Map<string, string>();

    areas.forEach((area) => {
      if (area.value) {
        merged.set(area.value, area.label || area.value);
      }
    });

    optionsFromLights.forEach((area) => {
      if (area.value && !merged.has(area.value)) {
        merged.set(area.value, area.label || area.value);
      }
    });

    return Array.from(merged.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'vi-VN'));
  }, [areas, lightsWithCoordinates]);
  const routeOptions = useMemo(() => buildRouteOptions(lightsWithCoordinates), [lightsWithCoordinates]);
  const addLightRouteOptions = useMemo(() => {
    const names = new Set<string>();
    routes.forEach((r) => {
      if (r.ten_tuyen?.trim()) {
        names.add(r.ten_tuyen.trim());
      }
    });
    routeOptions.forEach((o) => {
      if (o.value?.trim()) {
        names.add(o.value.trim());
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi-VN'));
  }, [routes, routeOptions]);
  const selectedAddDeviceType = useMemo(
    () => deviceTypes.find((deviceType) => deviceType.ma_loai === addForm.device_type_code),
    [addForm.device_type_code, deviceTypes]
  );
  const selectedGenerateDeviceType = useMemo(
    () => deviceTypes.find((deviceType) => deviceType.ma_loai === generateForm.device_type_code),
    [deviceTypes, generateForm.device_type_code]
  );
  const visibleRoutes = useMemo(() => {
    return routes.filter((route) => {
      const matchesArea = filters.khu_vuc ? route.khu_vuc === filters.khu_vuc : true;
      const matchesRoute = filters.route_name ? normalizeRouteTitle(route.ten_tuyen) === normalizeRouteTitle(filters.route_name) : true;

      return matchesArea && matchesRoute;
    });
  }, [filters.khu_vuc, filters.route_name, routes]);

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
      ma_tuyen: '',
      ten_tuyen: '',
      ghi_chu: '',
    }));
    setRouteInputMode('draw');
    setRouteTextData('');
    if (!isDrawingRoute) {
      setDrawingRoutePoints([]);
    }
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
    setOpenGenerateAfterRouteSave(false);
  };

  const handleRouteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRouteTextData(val);
    setRouteError('');
    if (!val.trim()) {
      setDrawingRoutePoints([]);
      return;
    }
    try {
      const parsedPoints = parseRouteInput(val);
      setDrawingRoutePoints(parsedPoints);
      setFitSignal((v) => v + 1);
    } catch (err: any) {
      setRouteError(`Không đọc được dữ liệu tuyến. Hãy dùng GeoJSON LineString hoặc mỗi dòng lat,lng. Chi tiết: ${err.message}`);
      setDrawingRoutePoints([]);
    }
  };

  const handleQuickCoordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuickCoord(val);
    if (!val.trim()) return;
    try {
      if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
        const parsed = JSON.parse(val.trim());
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const val0 = Number(parsed[0]);
          const val1 = Number(parsed[1]);
          if (val0 > 100 && val1 < 30) {
            setAddForm((form) => ({ ...form, latitude: val1.toFixed(6), longitude: val0.toFixed(6) }));
          } else {
            setAddForm((form) => ({ ...form, latitude: val0.toFixed(6), longitude: val1.toFixed(6) }));
          }
          return;
        } else if (parsed && typeof parsed === 'object') {
          const lat = parsed.latitude ?? parsed.lat;
          const lng = parsed.longitude ?? parsed.lng;
          if (lat !== undefined && lng !== undefined) {
            setAddForm((form) => ({ ...form, latitude: Number(lat).toFixed(6), longitude: Number(lng).toFixed(6) }));
            return;
          }
        }
      }
      
      const parts = val.split(/[,\s;\t]+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        if (parts[0] > 100 && parts[1] < 30) {
          setAddForm((form) => ({ ...form, latitude: parts[1].toFixed(6), longitude: parts[0].toFixed(6) }));
        } else {
          setAddForm((form) => ({ ...form, latitude: parts[0].toFixed(6), longitude: parts[1].toFixed(6) }));
        }
      }
    } catch {
      // Ignore parsing errors for quick coordinate pasting
    }
  };

  const handleBatchCoordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBatchCoordsText(val);
    setAddError('');
    if (!val.trim()) {
      setBatchPoints([]);
      return;
    }
    try {
      const parsed = parseRouteInput(val);
      setBatchPoints(parsed);
    } catch (err: any) {
      setAddError(`Không đọc được dữ liệu tọa độ. Định dạng lat,lng hoặc JSON. Chi tiết: ${err.message}`);
      setBatchPoints([]);
    }
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
      const res = await createStreetLightRoute({
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

      if (res && res.name) {
        setGenerateForm((form) => ({
          ...form,
          route_id: res.route_id || res.name,
        }));
        setFilters((prev) => ({
          ...prev,
          route_name: res.ten_tuyen,
          khu_vuc: res.khu_vuc || prev.khu_vuc,
        }));
        setFitSignal((v) => v + 1);
        if (openGenerateAfterRouteSave) {
          setShowGenerateModal(true);
          setOpenGenerateAfterRouteSave(false);
        }
      }
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
      const payload = {
        route_id: generateForm.route_id,
        count_positions: Number(generateForm.count),
        placement_mode: generateForm.placement_mode,
        side: generateForm.side,
        offset_m: Number(generateForm.offset_m),
        start_margin_m: Number(generateForm.start_margin_m),
        end_margin_m: Number(generateForm.end_margin_m),
        prefix: generateForm.ma_prefix.trim(),
        device_type_code: generateForm.device_type_code || getDefaultDeviceTypeCode(deviceTypes),
        start_index: Number(generateForm.start_index),
        trang_thai: 'Hoạt động',
        replace_existing: generateForm.operation_mode === 'replace',
      };
      console.log('GENERATE_ROUTE_PAYLOAD', payload);
      const res = await generateStreetLightsForRoute(payload);
      if (!res?.total_created) {
        const skippedCount = Array.isArray(res?.skipped) ? res.skipped.length : 0;
        setRouteError(
          skippedCount > 0
            ? `Không tạo thêm đèn mới vì ${skippedCount} mã đã tồn tại. Hãy đổi prefix hoặc số bắt đầu.`
            : 'Không tạo thêm đèn mới. Kiểm tra tuyến, số lượng và khoảng chừa đầu/cuối.'
        );
        return;
      }
      setShowGenerateModal(false);
      await loadLights(true);
      await loadRoutes();
      await loadHistory();
      
      if (res && res.route_name) {
        const selectedRouteDoc = routes.find((route) => getRouteId(route) === (res.route_id || generateForm.route_id));
        setFilters((prev) => ({
          ...prev,
          route_name: res.route_name,
          khu_vuc: selectedRouteDoc?.khu_vuc || prev.khu_vuc,
        }));
        setFitSignal((v) => v + 1);
      }
      
      alert(`Đã tạo ${res.total_created || 0} đèn trên toàn bộ tuyến ${res.route_name || ''}.`);
    } catch (err: any) {
      setRouteError(err?.message || 'Không thể tạo chuỗi đèn. Kiểm tra tuyến, mã prefix và số lượng.');
    } finally {
      setGeneratingLights(false);
    }
  };

  const cancelPickingLocation = () => {
    setIsPickingLocation(false);
    setShowAddModal(true);
  };

  const handlePickLocation = (location: PickedLocation) => {
    if (addMode === 'single') {
      setPickedLocation(location);
      setAddForm((form) => ({
        ...form,
        latitude: location.latitude.toFixed(6),
        longitude: location.longitude.toFixed(6),
      }));
      setIsPickingLocation(false);
      setShowAddModal(true);
    } else {
      setBatchPoints((prevPoints) => {
        const updated = [...prevPoints, location];
        const textLines = updated
          .map((pt) => `${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)}`)
          .join('\n');
        setBatchCoordsText(textLines);
        return updated;
      });
    }
  };

  const handleFinishPickLocation = () => {
    setIsPickingLocation(false);
    setShowAddModal(true);
  };

  const handleUndoPickLocation = () => {
    setBatchPoints((prevPoints) => {
      const updated = prevPoints.slice(0, -1);
      const textLines = updated
        .map((pt) => `${pt.latitude.toFixed(6)}, ${pt.longitude.toFixed(6)}`)
        .join('\n');
      setBatchCoordsText(textLines);
      return updated;
    });
  };

  const openAddModal = (mode: 'single' | 'batch' = 'single') => {
    setAddError('');
    setQuickCoord('');
    setBatchCoordsText('');
    setBatchPoints([]);
    setAddMode(mode);
    setShowAddChoiceModal(false);
    const defaultDeviceTypeCode = getDefaultDeviceTypeCode(deviceTypes);
    setAddForm((current) => ({
      ...current,
      route_name: filters.route_name || current.route_name || routes[0]?.ten_tuyen || routeOptions[0]?.value || '',
      khu_vuc: filters.khu_vuc || current.khu_vuc || areaOptions[0]?.value || '',
      latitude: selectedLight?.latitude ? String(selectedLight.latitude) : current.latitude,
      longitude: selectedLight?.longitude ? String(selectedLight.longitude) : current.longitude,
      device_type_code: current.device_type_code || defaultDeviceTypeCode,
    }));
    setShowAddModal(true);
  };

  const openChainChoiceModal = () => {
    setShowAddChoiceModal(false);
    setRouteError('');
    setShowChainChoiceModal(true);
  };

  const openGenerateWithExistingRoute = () => {
    setRouteError('');
    const matchedRoute = routes.find((route) => normalizeRouteTitle(route.ten_tuyen) === normalizeRouteTitle(filters.route_name));
    setGenerateForm((form) => ({
      ...form,
      route_id: getRouteId(matchedRoute) || form.route_id || getRouteId(routes[0]) || '',
      device_type_code: form.device_type_code || getDefaultDeviceTypeCode(deviceTypes),
    }));
    setShowChainChoiceModal(false);
    setShowGenerateModal(true);
  };

  const openChainDrawFlow = () => {
    setShowChainChoiceModal(false);
    setOpenGenerateAfterRouteSave(true);
    openRouteModal();
  };

  const handleCreateLight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError('');
    setSavingLight(true);

    try {
      if (addMode === 'single') {
        const latitude = Number(addForm.latitude);
        const longitude = Number(addForm.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setAddError('Tọa độ latitude/longitude không hợp lệ.');
          setSavingLight(false);
          return;
        }

        await createStreetLight({
          ma_tai_san: addForm.ma_tai_san.trim(),
          route_name: addForm.route_name.trim(),
          khu_vuc: addForm.khu_vuc,
          latitude,
          longitude,
          trang_thai: addForm.trang_thai,
          device_type_code: addForm.device_type_code || getDefaultDeviceTypeCode(deviceTypes),
        });
        alert(`Đã tạo đèn ${addForm.ma_tai_san} thành công.`);
      } else {
        if (batchPoints.length === 0) {
          setAddError('Cần nhập ít nhất 1 tọa độ đèn.');
          setSavingLight(false);
          return;
        }

        const res = await createBatchStreetLights({
          coordinates: batchPoints,
          ma_prefix: addForm.ma_tai_san.trim() || 'DEN-HL',
          khu_vuc: addForm.khu_vuc,
          route_name: addForm.route_name.trim() || 'Đường tự do',
          device_type_code: addForm.device_type_code || getDefaultDeviceTypeCode(deviceTypes),
          trang_thai: addForm.trang_thai,
        });

        alert(`Đã tạo thành công ${res.total_created || 0} đèn hàng loạt.`);
      }

      setShowAddModal(false);
      setAddForm({
        ma_tai_san: '',
        route_name: addForm.route_name,
        khu_vuc: addForm.khu_vuc,
        latitude: '',
        longitude: '',
        trang_thai: 'Hoạt động',
        device_type_code: addForm.device_type_code || getDefaultDeviceTypeCode(deviceTypes),
      });
      setPickedLocation(null);
      await loadLights(true);
      await loadHistory();

      if (addForm.route_name) {
        setFilters((prev) => ({
          ...prev,
          route_name: addForm.route_name.trim(),
          khu_vuc: addForm.khu_vuc || prev.khu_vuc,
        }));
        setFitSignal((v) => v + 1);
      }
    } catch (err: any) {
      setAddError(err?.message || 'Không thể tạo đèn. Kiểm tra mã đèn, khu vực và tọa độ.');
    } finally {
      setSavingLight(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setShowAddChoiceModal(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        ＋ Thêm đèn
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
      areaOptions={areaOptions}
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
        pickedLocations={batchPoints}
        addMode={addMode}
        savedRoutes={visibleRoutes}
        isDrawingRoute={isDrawingRoute}
        drawingRoutePoints={drawingRoutePoints}
        onSelectLight={setSelectedLight}
        onPickLocation={handlePickLocation}
        onCancelPickLocation={cancelPickingLocation}
        onFinishPickLocation={handleFinishPickLocation}
        onUndoPickLocation={handleUndoPickLocation}
        onAddRoutePoint={handleAddRoutePoint}
        onUndoRoutePoint={undoRoutePoint}
        onFinishDrawRoute={finishDrawingRoute}
        onCancelDrawRoute={cancelDrawingRoute}
        onViewLightDetail={setDetailLight}
      />

      {lightsWithCoordinates.length === 0 && visibleRoutes.length === 0 ? (
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

      {showAddChoiceModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Thêm dữ liệu đèn</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Chọn cách thêm đèn đường</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn từng đèn, dán dữ liệu có sẵn hoặc vẽ tuyến đèn rồi sinh chuỗi theo mật độ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChoiceModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => openAddModal('single')}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">📍</span>
                <h3 className="mt-3 text-base font-black text-slate-900">Thêm từng đèn</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Chọn vị trí trên bản đồ hoặc nhập tọa độ thủ công cho một thiết bị.
                </p>
              </button>
              <button
                type="button"
                onClick={openChainChoiceModal}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">⛓</span>
                <h3 className="mt-3 text-base font-black text-slate-900">Tạo chuỗi đèn</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Chọn tuyến đèn đã vẽ sẵn hoặc vẽ tuyến mới rồi nhập số vị trí, đối xứng và khoảng lệch.
                </p>
              </button>
              <button
                type="button"
                onClick={() => openAddModal('batch')}
                className="rounded-2xl border border-purple-100 bg-purple-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">📋</span>
                <h3 className="mt-3 text-base font-black text-slate-900">Dán dữ liệu có sẵn</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Dán danh sách tọa độ lat,lng hoặc JSON để tạo hàng loạt đèn.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showChainChoiceModal ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Tuyến đèn đường</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Tạo chuỗi đèn theo tuyến</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dùng tuyến đã vẽ sẵn hoặc vẽ tuyến mới ngay trên bản đồ trước khi tạo chuỗi đèn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChainChoiceModal(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={openGenerateWithExistingRoute}
                disabled={routes.length === 0}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-2xl">🛣️</span>
                <h3 className="mt-3 text-base font-black text-slate-900">Chọn tuyến đã vẽ sẵn</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Mở form tạo chuỗi và chọn một tuyến đèn đã lưu trong danh sách.
                </p>
                <p className="mt-3 text-xs font-bold text-blue-700">
                  Hiện có {routes.length} tuyến đèn đã lưu.
                </p>
              </button>
              <button
                type="button"
                onClick={openChainDrawFlow}
                className="rounded-2xl border border-orange-100 bg-orange-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">✎</span>
                <h3 className="mt-3 text-base font-black text-slate-900">Vẽ tuyến mới</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Vẽ tuyến đèn trên bản đồ, lưu tuyến, rồi hệ thống tự mở bước tạo chuỗi.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

            <div className="mb-4 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAddMode('single');
                  setAddError('');
                }}
                className={`pb-2 px-4 text-sm font-bold ${
                  addMode === 'single'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📍 Thêm 1 đèn
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('batch');
                  setAddError('');
                }}
                className={`pb-2 px-4 text-sm font-bold ${
                  addMode === 'batch'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📦 Thêm hàng loạt (1000+ đèn)
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                {addMode === 'single' ? 'Mã đèn' : 'Mã prefix cho loạt đèn'}
                <input
                  required
                  value={addForm.ma_tai_san}
                  onChange={(event) => setAddForm((form) => ({ ...form, ma_tai_san: event.target.value }))}
                  placeholder={addMode === 'single' ? 'VD: DEN-MANUAL-001' : 'VD: DEN-HL'}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Tuyến đèn đường
                <input
                  required
                  list="street-light-routes"
                  value={addForm.route_name}
                  onChange={(event) => setAddForm((form) => ({ ...form, route_name: event.target.value }))}
                  placeholder="VD: Tuyến đèn Hùng Vương"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <datalist id="street-light-routes">
                  {addLightRouteOptions.map((routeName) => (
                    <option key={routeName} value={routeName} />
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
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Loại thiết bị
                <select
                  value={addForm.device_type_code}
                  onChange={(event) => setAddForm((form) => ({ ...form, device_type_code: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {deviceTypes.length === 0 ? (
                    <option value={DEFAULT_DEVICE_TYPE_CODE}>DEN-LED-9M - Đèn LED cao áp 9m</option>
                  ) : (
                    deviceTypes.map((deviceType) => (
                      <option key={deviceType.ma_loai} value={deviceType.ma_loai}>
                        {deviceType.ma_loai} - {deviceType.ten_loai}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {formatDeviceTypeSummary(selectedAddDeviceType)}
                </p>
              </label>

              {addMode === 'single' ? (
                <>
                  <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <label className="text-xs font-bold text-slate-600 block mb-2">
                      Dán nhanh tọa độ (Ví dụ: "16.0548, 108.2022" hoặc "[108.2022, 16.0548]")
                    </label>
                    <input
                      value={quickCoord}
                      onChange={handleQuickCoordChange}
                      placeholder="Dán tọa độ vào đây để tự tách Lat/Lng..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>

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
                </>
              ) : (
                <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Dán danh sách tọa độ (Mỗi dòng một tọa độ lat,lng hoặc JSON)
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`Mỗi dòng: lat,lng (VD: 16.0548, 108.2022)\nHoặc mảng JSON: [[16.054, 108.20], ...]\nHệ thống hỗ trợ lên tới 1000+ đèn.`}
                    value={batchCoordsText}
                    onChange={handleBatchCoordsChange}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                  />
                  <p className="mt-2 text-xs font-semibold text-blue-700">
                    {batchPoints.length > 0 ? `Đã nhận thành công ${batchPoints.length} tọa độ đèn.` : 'Chưa có tọa độ nào được nhận.'}
                  </p>
                </div>
              )}
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
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Tuyến đèn đường</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Vẽ và lưu tuyến đèn đường</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bấm “Bắt đầu vẽ”, chọn nhiều điểm trên bản đồ rồi quay lại lưu tuyến đèn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRouteModal(false);
                  setOpenGenerateAfterRouteSave(false);
                }}
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
                Mã tuyến đèn
                <input
                  required
                  value={routeForm.ma_tuyen}
                  onChange={(event) => setRouteForm((form) => ({ ...form, ma_tuyen: event.target.value }))}
                  placeholder="VD: ROUTE-HUNG-VUONG"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Tên tuyến đèn
                <input
                  required
                  value={routeForm.ten_tuyen}
                  onChange={(event) => setRouteForm((form) => ({ ...form, ten_tuyen: event.target.value }))}
                  placeholder="VD: Hùng Vương - đoạn cầu"
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
                  placeholder="Ghi chú tuyến đèn"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </div>

            <div className="mb-4 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRouteInputMode('draw');
                  setRouteError('');
                }}
                className={`pb-2 px-4 text-sm font-bold ${
                  routeInputMode === 'draw'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🖱 Vẽ trên bản đồ
              </button>
              <button
                type="button"
                onClick={() => {
                  setRouteInputMode('import');
                  setRouteError('');
                }}
                className={`pb-2 px-4 text-sm font-bold ${
                  routeInputMode === 'import'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📋 Nhập dữ liệu tuyến
              </button>
            </div>

            {routeInputMode === 'draw' ? (
              <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-orange-900">Điểm tuyến đèn đã vẽ: {drawingRoutePoints.length}</p>
                    <p className="mt-1 text-xs font-semibold text-orange-700">Cần ít nhất 2 điểm để lưu tuyến đèn.</p>
                  </div>
                  <button
                    type="button"
                    onClick={startDrawingRoute}
                    className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
                  >
                    Bắt đầu vẽ tuyến đèn
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <label className="block text-sm font-bold text-orange-900 mb-2">
                  Dán dữ liệu tuyến đèn (GeoJSON, JSON Array hoặc dòng Lat,Lng)
                </label>
                <textarea
                  rows={4}
                  placeholder={`Mỗi dòng: lat,lng (VD: 16.047,108.178)\nHoặc GeoJSON LineString / Feature\nHoặc mảng JSON: [[16.047, 108.178], ...]`}
                  value={routeTextData}
                  onChange={handleRouteTextChange}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-orange-700">
                    {drawingRoutePoints.length > 0 ? `Đã nhập thành công ${drawingRoutePoints.length} điểm.` : 'Chưa có điểm nào được nhập.'}
                  </p>
                  {drawingRoutePoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFitSignal((v) => v + 1);
                      }}
                      className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-orange-700"
                    >
                      🔍 Phóng tới tuyến đèn
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRouteModal(false);
                  setOpenGenerateAfterRouteSave(false);
                }}
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
                <h2 className="mt-1 text-xl font-black text-slate-900">Tạo chuỗi đèn theo tuyến đèn</h2>
                <p className="mt-1 text-sm text-slate-500">Rải nhiều đèn theo polyline tuyến đèn vừa vẽ hoặc đã lưu.</p>
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
                Tuyến đèn đường
                <select
                  required
                  value={generateForm.route_id}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, route_id: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn tuyến</option>
                  {routes.map((route) => (
                    <option key={getRouteId(route)} value={getRouteId(route)}>
                      {route.ten_tuyen}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Cách xử lý dữ liệu đã có trên tuyến
                <select
                  value={generateForm.operation_mode}
                  onChange={(event) =>
                    setGenerateForm((form) => ({
                      ...form,
                      operation_mode: event.target.value as 'append' | 'replace',
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="append">Bổ sung thêm đèn vào tuyến đèn này</option>
                  <option value="replace">Thay thế toàn bộ đèn cũ của tuyến đèn này</option>
                </select>
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Chọn “Thay thế” khi tuyến đã có đèn nhưng sai số liệu. Hệ thống chỉ xóa đèn đang thuộc tuyến đèn đã chọn.
                </p>
              </label>
              <label className="text-sm font-bold text-slate-700 md:col-span-2">
                Loại thiết bị áp dụng cho chuỗi
                <select
                  value={generateForm.device_type_code}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, device_type_code: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {deviceTypes.length === 0 ? (
                    <option value={DEFAULT_DEVICE_TYPE_CODE}>DEN-LED-9M - Đèn LED cao áp 9m</option>
                  ) : (
                    deviceTypes.map((deviceType) => (
                      <option key={deviceType.ma_loai} value={deviceType.ma_loai}>
                        {deviceType.ma_loai} - {deviceType.ten_loai}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  {formatDeviceTypeSummary(selectedGenerateDeviceType)}
                </p>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Mã prefix mã đèn
                <input
                  required
                  value={generateForm.ma_prefix}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, ma_prefix: event.target.value }))}
                  placeholder="DEN-HV"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Số vị trí dọc tuyến
                <input
                  required
                  type="number"
                  min="1"
                  value={generateForm.count}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, count: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Một bên: tạo đúng N đèn. Hai bên: tạo N cặp = 2×N đèn.
                </p>
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
                Kiểu bố trí
                <select
                  value={generateForm.placement_mode}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, placement_mode: event.target.value as 'single_side' | 'both_sides' }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="single_side">Một bên đường</option>
                  <option value="both_sides">Đối xứng hai bên</option>
                </select>
              </label>

              {generateForm.placement_mode === 'single_side' ? (
                <label className="text-sm font-bold text-slate-700">
                  Chọn bên đường
                  <select
                    value={generateForm.side}
                    onChange={(event) => setGenerateForm((form) => ({ ...form, side: event.target.value as 'left' | 'right' }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="left">Bên trái</option>
                    <option value="right">Bên phải</option>
                  </select>
                </label>
              ) : null}

              <label className="text-sm font-bold text-slate-700">
                Khoảng lệch tim đường (m)
                <input
                  type="number"
                  min="0"
                  value={generateForm.offset_m}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, offset_m: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Chừa đầu tuyến (m)
                <input
                  type="number"
                  min="0"
                  value={generateForm.start_margin_m}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, start_margin_m: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
                Chừa cuối tuyến (m)
                <input
                  type="number"
                  min="0"
                  value={generateForm.end_margin_m}
                  onChange={(event) => setGenerateForm((form) => ({ ...form, end_margin_m: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {(() => {
                const selectedRouteObj = routes.find((r) => getRouteId(r) === generateForm.route_id);
                const routeLengthM = selectedRouteObj ? calculatePolylineLengthM(selectedRouteObj.polyline) : 0;
                const countVal = Number(generateForm.count) || 0;
                const startMargin = Number(generateForm.start_margin_m) || 0;
                const endMargin = Number(generateForm.end_margin_m) || 0;
                const usableLength = routeLengthM - startMargin - endMargin;
                const estimatedSpacing = countVal > 1 && usableLength > 0 ? (usableLength / (countVal - 1)).toFixed(1) : '0';
                const totalLightsToCreate = generateForm.placement_mode === 'both_sides' ? countVal * 2 : countVal;

                if (!selectedRouteObj) return null;

                return (
                  <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs font-semibold text-blue-900 space-y-1 md:col-span-2">
                    <p>📍 Chiều dài tuyến: <span className="font-bold">{routeLengthM.toFixed(1)}m</span></p>
                    <p>📏 Chiều dài khả dụng (trừ chừa đầu/cuối): <span className="font-bold">{Math.max(0, usableLength).toFixed(1)}m</span></p>
                    <p>
                      💡 Dự kiến: <span className="font-bold">
                        {generateForm.placement_mode === 'both_sides'
                          ? `Tạo ${countVal} cặp = ${totalLightsToCreate} đèn`
                          : `Tạo ${totalLightsToCreate} đèn`}
                      </span>
                      {countVal > 1 && usableLength > 0 ? ` (Khoảng cách giữa các đèn ~${estimatedSpacing}m)` : ''}
                    </p>
                  </div>
                );
              })()}
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

      {detailLight ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-5">
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-wide text-blue-600">
                  {detailLight.ma_tai_san}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{detailLight.ten_tai_san}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Chi tiết thiết bị chiếu sáng trên tuyến đèn đường
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLight(null)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {[
                ['Tuyến đèn đường', normalizeRouteName(detailLight) || 'Chưa xác định'],
                ['Khu vực', detailLight.ten_khu_vuc || detailLight.khu_vuc || 'Chưa xác định'],
                ['Trạng thái', detailLight.trang_thai || 'Không rõ'],
                ['Loại thiết bị', detailLight.device_type_name || detailLight.device_type_code || 'Chưa cấu hình'],
                ['Công suất', detailLight.power_w ? `${detailLight.power_w}W` : 'Chưa cấu hình'],
                ['Chiều cao cột', detailLight.pole_height_m ? `${detailLight.pole_height_m}m` : 'Chưa cấu hình'],
                ['Latitude', detailLight.latitude ?? 'Chưa có'],
                ['Longitude', detailLight.longitude ?? 'Chưa có'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedLight(detailLight);
                  setDetailLight(null);
                  setFitSignal((v) => v + 1);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Xem trên bản đồ
              </button>
              <button
                type="button"
                onClick={() => setDetailLight(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default StreetLightMap;
