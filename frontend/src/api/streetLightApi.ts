import api from './axios';

export interface StreetLightChartItem {
  label: string;
  value: number;
  khu_vuc?: string;
}

export interface StreetLightDashboardData {
  total_lights: number;
  active_lights: number;
  broken_lights: number;
  maintenance_lights: number;
  open_incidents: number;
  resolved_incidents: number;
  charts: {
    lights_by_status: StreetLightChartItem[];
    incidents_by_status: StreetLightChartItem[];
    lights_by_area: StreetLightChartItem[];
    incidents_by_priority: StreetLightChartItem[];
  };
}

export interface StreetLightQueryParams {
  khu_vuc?: string;
  trang_thai?: string;
  limit?: number;
}

export interface StreetLightRecord {
  name: string;
  ma_tai_san: string;
  ten_tai_san: string;
  route_name?: string | null;
  khu_vuc: string;
  ten_khu_vuc?: string;
  toa_do_gps?: string;
  latitude: number | null;
  longitude: number | null;
  trang_thai: string;
  chi_phi_bao_duong?: number;
  ngay_lap_dat?: string;
}

export interface CreateStreetLightPayload {
  ma_tai_san: string;
  ten_tai_san?: string;
  route_name: string;
  khu_vuc: string;
  latitude: number;
  longitude: number;
  trang_thai?: string;
  chi_phi_bao_duong?: number;
  ngay_lap_dat?: string;
}

export interface StreetLightRouteRecord {
  name: string;
  ma_tuyen: string;
  ten_tuyen: string;
  khu_vuc: string;
  ten_khu_vuc?: string;
  polyline: Array<{ latitude: number; longitude: number }>;
  so_diem?: number;
  ghi_chu?: string;
}

export interface CreateStreetLightRoutePayload {
  ma_tuyen: string;
  ten_tuyen: string;
  khu_vuc: string;
  polyline: Array<{ latitude: number; longitude: number }>;
  ghi_chu?: string;
}

export interface GenerateStreetLightsPayload {
  route: string;
  ma_prefix: string;
  count: number;
  start_index?: number;
  both_sides?: boolean;
  offset?: number;
  trang_thai?: string;
}

export interface StreetLightAreaOption {
  name: string;
  value: string;
  label: string;
}

export interface StreetLightDataHistoryItem {
  name: string;
  creation: string;
  owner?: string;
  hanh_dong: string;
  doi_tuong?: string;
  ten_doi_tuong?: string;
  ma_doi_tuong?: string;
  tuyen_duong?: string;
  noi_dung?: string;
}

const DASHBOARD_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_dashboard';
const MAP_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_map';
const LIGHTS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_lights';
const UPDATE_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_street_light_status';
const CREATE_LIGHT_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_street_light';
const ROUTES_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_routes';
const CREATE_ROUTE_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_street_light_route';
const GENERATE_LIGHTS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.generate_street_lights_for_route';
const AREAS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_areas';
const DELETE_LIGHT_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.delete_street_light';
const DATA_HISTORY_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_data_history';

const emptyCharts = {
  lights_by_status: [],
  incidents_by_status: [],
  lights_by_area: [],
  incidents_by_priority: [],
};

const normalizeDashboard = (data: Partial<StreetLightDashboardData>): StreetLightDashboardData => ({
  total_lights: Number(data.total_lights ?? 0),
  active_lights: Number(data.active_lights ?? 0),
  broken_lights: Number(data.broken_lights ?? 0),
  maintenance_lights: Number(data.maintenance_lights ?? 0),
  open_incidents: Number(data.open_incidents ?? 0),
  resolved_incidents: Number(data.resolved_incidents ?? 0),
  charts: {
    ...emptyCharts,
    ...(data.charts ?? {}),
  },
});

const getFrappePayload = (data: any) => data?.message ?? data;

const buildParams = (params?: StreetLightQueryParams) => {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  );
};

export const getStreetLightDashboard = async (): Promise<StreetLightDashboardData> => {
  try {
    const response = await api.get(DASHBOARD_ENDPOINT);
    const payload = getFrappePayload(response.data);

    if (!payload || typeof payload !== 'object') {
      throw new Error('Dữ liệu dashboard đèn đường không hợp lệ.');
    }

    return normalizeDashboard(payload);
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightDashboard failed:', error);
    throw error;
  }
};

export const getStreetLightMap = async (
  params?: StreetLightQueryParams
): Promise<StreetLightRecord[]> => {
  try {
    const response = await api.get(MAP_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightMap failed:', error);
    throw error;
  }
};

export const getStreetLights = async (
  params?: StreetLightQueryParams
): Promise<StreetLightRecord[]> => {
  try {
    const response = await api.get(LIGHTS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLights failed:', error);
    throw error;
  }
};

export const updateStreetLightStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_STATUS_ENDPOINT, undefined, {
      params: {
        name,
        trang_thai: trangThai,
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateStreetLightStatus failed:', error);
    throw error;
  }
};

export const createStreetLight = async (payload: CreateStreetLightPayload) => {
  try {
    const response = await api.post(CREATE_LIGHT_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createStreetLight failed:', error);
    throw error;
  }
};

export const deleteStreetLight = async (name: string) => {
  try {
    const response = await api.post(DELETE_LIGHT_ENDPOINT, undefined, {
      params: { name },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] deleteStreetLight failed:', error);
    throw error;
  }
};

export const getStreetLightRoutes = async (): Promise<StreetLightRouteRecord[]> => {
  try {
    const response = await api.get(ROUTES_ENDPOINT);
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightRoutes failed:', error);
    throw error;
  }
};

export const createStreetLightRoute = async (payload: CreateStreetLightRoutePayload) => {
  try {
    const response = await api.post(CREATE_ROUTE_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createStreetLightRoute failed:', error);
    throw error;
  }
};

export const generateStreetLightsForRoute = async (payload: GenerateStreetLightsPayload) => {
  try {
    const response = await api.post(GENERATE_LIGHTS_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] generateStreetLightsForRoute failed:', error);
    throw error;
  }
};

export const getStreetLightAreas = async (): Promise<StreetLightAreaOption[]> => {
  try {
    const response = await api.get(AREAS_ENDPOINT);
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightAreas failed:', error);
    throw error;
  }
};

export const getStreetLightDataHistory = async (
  limit = 50
): Promise<StreetLightDataHistoryItem[]> => {
  try {
    const response = await api.get(DATA_HISTORY_ENDPOINT, { params: { limit } });
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightDataHistory failed:', error);
    throw error;
  }
};
