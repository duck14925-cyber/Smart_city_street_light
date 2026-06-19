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
  total_routes?: number;
  total_incidents?: number;
  total_inspections?: number;
  total_plans?: number;
  total_work_orders?: number;
  total_work_logs?: number;
  total_acceptance_records?: number;
  charts: {
    lights_by_status: StreetLightChartItem[];
    incidents_by_status: StreetLightChartItem[];
    lights_by_area: StreetLightChartItem[];
    incidents_by_priority: StreetLightChartItem[];
    work_orders_by_status?: StreetLightChartItem[];
    inspections_by_result?: StreetLightChartItem[];
    plans_by_status?: StreetLightChartItem[];
    acceptance_by_result?: StreetLightChartItem[];
  };
}

export interface StreetLightQueryParams {
  khu_vuc?: string;
  trang_thai?: string;
  muc_do_uu_tien?: string;
  route_name?: string;
  light?: string;
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
  device_type_code?: string | null;
  device_type_name?: string | null;
  device_category?: string | null;
  lamp_type?: string | null;
  power_w?: number | null;
  pole_height_m?: number | null;
  icon_2d_url?: string | null;
  model_3d_url?: string | null;
  model_scale?: number | null;
  model_bearing?: number | null;
  model_height?: number | null;
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
  device_type_code?: string;
}

export interface CreateBatchStreetLightsPayload {
  coordinates: Array<{ latitude: number; longitude: number }>;
  ma_prefix: string;
  khu_vuc: string;
  route_name?: string;
  device_type_code?: string;
  start_index?: number;
  trang_thai?: string;
  chi_phi_bao_duong?: number;
  ngay_lap_dat?: string;
}

export interface UpdateStreetLightPayload {
  name?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  route_name?: string;
  khu_vuc?: string;
  latitude?: number;
  longitude?: number;
  trang_thai?: string;
  device_type_code?: string;
  loai_thiet_bi_chieu_sang?: string;
  ngay_lap_dat?: string;
  chi_phi_bao_duong?: number;
}

export interface StreetLightRouteRecord {
  route_id: string;
  name: string;
  ma_tuyen: string;
  ten_tuyen: string;
  khu_vuc: string;
  ten_khu_vuc?: string;
  polyline_json?: string;
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
  route_id: string;
  ma_prefix?: string;
  count?: number;
  start_index?: number;
  both_sides?: boolean;
  offset?: number;
  trang_thai?: string;
  device_type_code?: string;
  count_positions?: number;
  placement_mode?: 'single_side' | 'both_sides';
  side?: 'left' | 'right';
  offset_m?: number;
  start_margin_m?: number;
  end_margin_m?: number;
  prefix?: string;
  replace_existing?: boolean;
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

export interface StreetLightDeviceType {
  ma_loai: string;
  ten_loai: string;
  danh_muc?: string;
  loai_bong_den?: string;
  cong_suat_w?: number;
  chieu_cao_cot_m?: number;
  quang_thong_lumen?: number;
  nhiet_do_mau_k?: number;
  tuoi_tho_gio?: number;
  icon_2d_url?: string;
  model_3d_url?: string;
  model_scale?: number;
  model_bearing?: number;
  model_height?: number;
  trang_thai?: string;
  ghi_chu?: string;
}

export interface StreetLightIncident {
  name: string;
  tieu_de: string;
  loai_van_de: string;
  khu_vuc: string;
  ten_khu_vuc?: string;
  route_name?: string | null;
  ma_tai_san?: string | null;
  latitude: number | null;
  longitude: number | null;
  mo_ta_chi_tiet?: string;
  muc_do_uu_tien?: string;
  trang_thai?: string;
  nguoi_bao_cao?: string;
  sdt_lien_he?: string;
  hinh_anh_minh_hoa?: string;
  creation?: string;
  modified?: string;
  scope_type?: string;
  related_lights_count?: number;
  related_lights?: any[];
}

export interface CreateStreetLightIncidentPayload {
  tieu_de: string;
  ma_tai_san?: string;
  street_light?: string;
  route_name?: string;
  khu_vuc: string;
  latitude?: number;
  longitude?: number;
  mo_ta_chi_tiet: string;
  muc_do_uu_tien?: string;
  nguoi_bao_cao: string;
  sdt_lien_he?: string;
  hinh_anh_minh_hoa?: string;
  trang_thai?: string;
  affected_lights?: any[];
}

export interface StreetLightInspection {
  name: string;
  ma_phieu: string;
  ngay_kiem_tra?: string;
  thiet_bi?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  ten_khu_vuc?: string;
  tinh_trang_dien?: string;
  tinh_trang_cot?: string;
  tinh_trang_day?: string;
  muc_an_toan?: string;
  ket_luan?: string;
  mo_ta?: string;
  nguoi_kiem_tra?: string;
  trang_thai?: string;
  hinh_anh?: string;
  creation?: string;
  modified?: string;
  scope_type?: string;
  related_lights_count?: number;
  related_lights?: any[];
  affected_lights?: any[];
}

export interface CreateStreetLightInspectionPayload {
  thiet_bi?: string;
  ma_tai_san?: string;
  ngay_kiem_tra?: string;
  tinh_trang_dien?: string;
  tinh_trang_cot?: string;
  tinh_trang_day?: string;
  muc_an_toan?: string;
  ket_luan?: string;
  mo_ta?: string;
  nguoi_kiem_tra?: string;
  trang_thai?: string;
  hinh_anh?: string;
  scope_type?: string;
  related_lights?: any[];
  affected_lights?: any[];
}

export interface MaintenancePlan {
  name: string;
  ma_ke_hoach: string;
  ten_ke_hoach: string;
  loai_ke_hoach?: string;
  muc_uu_tien?: string;
  thiet_bi?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  ten_khu_vuc?: string;
  ngay_bat_dau?: string;
  ngay_ket_thuc?: string;
  noi_dung?: string;
  nguoi_phu_trach?: string;
  trang_thai?: string;
}

export interface CreateMaintenancePlanPayload {
  ten_ke_hoach: string;
  loai_ke_hoach?: string;
  muc_uu_tien?: string;
  thiet_bi?: string;
  ngay_bat_dau?: string;
  ngay_ket_thuc?: string;
  noi_dung?: string;
  nguoi_phu_trach?: string;
}

export interface WorkOrder {
  name: string;
  ma_phieu: string;
  tieu_de: string;
  ke_hoach?: string;
  thiet_bi?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  ten_khu_vuc?: string;
  loai_cong_viec?: string;
  muc_uu_tien?: string;
  ngay_thuc_hien?: string;
  nhan_vien_thuc_hien?: string;
  mo_ta_cong_viec?: string;
  ket_qua?: string;
  trang_thai?: string;
}

export interface CreateWorkOrderPayload {
  tieu_de: string;
  ke_hoach?: string;
  thiet_bi?: string;
  loai_cong_viec?: string;
  muc_uu_tien?: string;
  ngay_thuc_hien?: string;
  nhan_vien_thuc_hien?: string;
  mo_ta_cong_viec?: string;
}

export interface WorkLog {
  name: string;
  ma_nhat_ky: string;
  phieu_cong_viec?: string;
  thiet_bi?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  ten_khu_vuc?: string;
  ngay_thi_cong?: string;
  loai_hanh_dong?: string;
  noi_dung_thuc_hien?: string;
  vat_tu_su_dung?: string;
  nhan_su_thuc_hien?: string;
  thoi_gian_bat_dau?: string;
  thoi_gian_ket_thuc?: string;
  ket_qua?: string;
  ghi_chu?: string;
  hinh_anh?: string;
}

export interface CreateWorkLogPayload {
  phieu_cong_viec?: string;
  thiet_bi?: string;
  ngay_thi_cong?: string;
  loai_hanh_dong?: string;
  noi_dung_thuc_hien?: string;
  vat_tu_su_dung?: string;
  nhan_su_thuc_hien?: string;
  thoi_gian_bat_dau?: string;
  thoi_gian_ket_thuc?: string;
  ket_qua?: string;
  ghi_chu?: string;
}

export interface AcceptanceRecord {
  name: string;
  ma_bien_ban: string;
  phieu_cong_viec?: string;
  ke_hoach?: string;
  thiet_bi?: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  ten_khu_vuc?: string;
  ngay_nghiem_thu?: string;
  nguoi_nghiem_thu?: string;
  don_vi_thuc_hien?: string;
  ket_qua_nghiem_thu?: string;
  noi_dung_nghiem_thu?: string;
  kien_nghi?: string;
  trang_thai?: string;
  hinh_anh?: string;
}

export interface CreateAcceptanceRecordPayload {
  phieu_cong_viec?: string;
  ke_hoach?: string;
  thiet_bi?: string;
  ngay_nghiem_thu?: string;
  nguoi_nghiem_thu?: string;
  don_vi_thuc_hien?: string;
  ket_qua_nghiem_thu?: string;
  noi_dung_nghiem_thu?: string;
  kien_nghi?: string;
  trang_thai?: string;
}

export interface ReportByAreaItem {
  khu_vuc: string;
  ten_khu_vuc: string;
  total_lights: number;
  active_lights: number;
  broken_lights: number;
  maintenance_lights: number;
  total_incidents: number;
  open_incidents: number;
  total_work_orders: number;
  completed_work_orders: number;
}

export interface ReportIncidentsData {
  total_incidents: number;
  by_status: StreetLightChartItem[];
  by_priority: StreetLightChartItem[];
  by_area: StreetLightChartItem[];
  recent_incidents: StreetLightIncident[];
}

export interface ReportWorkOrdersData {
  total_work_orders: number;
  by_status: StreetLightChartItem[];
  by_priority: StreetLightChartItem[];
  by_type: StreetLightChartItem[];
  recent_work_orders: WorkOrder[];
}

export interface UnitPerformanceItem {
  unit_or_staff: string;
  assigned_work_orders: number;
  completed_work_orders: number;
  pending_work_orders: number;
  completion_rate: number;
}

const DASHBOARD_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_dashboard';
const OVERVIEW_REPORT_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_overview_report';
const MAP_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_map';
const LIGHTS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_lights';
const UPDATE_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_street_light_status';
const UPDATE_LIGHT_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_street_light';
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
const DEVICE_TYPES_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_device_types';
const SAVE_DEVICE_TYPE_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_or_update_street_light_device_type';
const DELETE_DEVICE_TYPE_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.delete_street_light_device_type';
const INCIDENTS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_incidents';
const CREATE_INCIDENT_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_street_light_incident';
const UPDATE_INCIDENT_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_incident_status';
const INSPECTIONS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_inspections';
const CREATE_INSPECTION_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_street_light_inspection';
const UPDATE_INSPECTION_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_street_light_inspection_status';
const MAINTENANCE_PLANS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_maintenance_plans';
const CREATE_MAINTENANCE_PLAN_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_maintenance_plan';
const UPDATE_MAINTENANCE_PLAN_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_maintenance_plan_status';
const WORK_ORDERS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_work_orders';
const CREATE_WORK_ORDER_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_work_order';
const UPDATE_WORK_ORDER_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_work_order_status';
const WORK_LOGS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_work_logs';
const CREATE_WORK_LOG_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_work_log';
const ACCEPTANCE_RECORDS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_acceptance_records';
const CREATE_ACCEPTANCE_RECORD_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.create_acceptance_record';
const UPDATE_ACCEPTANCE_STATUS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.update_acceptance_status';
const REPORT_BY_AREA_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_report_by_area';
const REPORT_INCIDENTS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_report_incidents';
const REPORT_WORK_ORDERS_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_report_work_orders';
const REPORT_UNIT_PERFORMANCE_ENDPOINT =
  '/api/method/smart_city.smart_city.services.street_light_service.get_report_unit_performance';

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
  total_routes: Number(data.total_routes ?? 0),
  total_incidents: Number(data.total_incidents ?? 0),
  total_inspections: Number(data.total_inspections ?? 0),
  total_plans: Number(data.total_plans ?? 0),
  total_work_orders: Number(data.total_work_orders ?? 0),
  total_work_logs: Number(data.total_work_logs ?? 0),
  total_acceptance_records: Number(data.total_acceptance_records ?? 0),
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

export const getStreetLightOverviewReport = async (): Promise<StreetLightDashboardData> => {
  try {
    const response = await api.get(OVERVIEW_REPORT_ENDPOINT);
    const payload = getFrappePayload(response.data);

    if (!payload || typeof payload !== 'object') {
      throw new Error('Dữ liệu báo cáo tổng quan không hợp lệ.');
    }

    return normalizeDashboard(payload);
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightOverviewReport failed:', error);
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

export const updateStreetLight = async (payload: UpdateStreetLightPayload) => {
  try {
    const response = await api.post(UPDATE_LIGHT_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateStreetLight failed:', error);
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

export const createBatchStreetLights = async (payload: CreateBatchStreetLightsPayload) => {
  try {
    const response = await api.post('/api/method/smart_city.smart_city.services.street_light_service.create_batch_street_lights', undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createBatchStreetLights failed:', error);
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

export const getStreetLightDeviceTypes = async (): Promise<StreetLightDeviceType[]> => {
  try {
    const response = await api.get(DEVICE_TYPES_ENDPOINT);
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightDeviceTypes failed:', error);
    throw error;
  }
};

export const createOrUpdateStreetLightDeviceType = async (
  payload: StreetLightDeviceType
): Promise<StreetLightDeviceType> => {
  try {
    const response = await api.post(SAVE_DEVICE_TYPE_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });
    const data = getFrappePayload(response.data);

    return data;
  } catch (error) {
    console.error('[StreetLightAPI] createOrUpdateStreetLightDeviceType failed:', error);
    throw error;
  }
};

export const deleteStreetLightDeviceType = async (maLoai: string) => {
  try {
    const response = await api.post(DELETE_DEVICE_TYPE_ENDPOINT, undefined, {
      params: {
        ma_loai: maLoai,
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] deleteStreetLightDeviceType failed:', error);
    throw error;
  }
};

export const getStreetLightIncidents = async (
  params?: StreetLightQueryParams
): Promise<StreetLightIncident[]> => {
  try {
    const response = await api.get(INCIDENTS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightIncidents failed:', error);
    throw error;
  }
};

export const createStreetLightIncident = async (payload: CreateStreetLightIncidentPayload) => {
  try {
    const response = await api.post(CREATE_INCIDENT_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createStreetLightIncident failed:', error);
    throw error;
  }
};

export const updateIncidentStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_INCIDENT_STATUS_ENDPOINT, undefined, {
      params: {
        name,
        trang_thai: trangThai,
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateIncidentStatus failed:', error);
    throw error;
  }
};

export const getStreetLightInspections = async (
  params?: StreetLightQueryParams
): Promise<StreetLightInspection[]> => {
  try {
    const response = await api.get(INSPECTIONS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);

    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightInspections failed:', error);
    throw error;
  }
};

export const createStreetLightInspection = async (
  payload: CreateStreetLightInspectionPayload
) => {
  try {
    const response = await api.post(CREATE_INSPECTION_ENDPOINT, undefined, {
      params: {
        data: JSON.stringify(payload),
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createStreetLightInspection failed:', error);
    throw error;
  }
};

export const updateStreetLightInspectionStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_INSPECTION_STATUS_ENDPOINT, undefined, {
      params: {
        name,
        trang_thai: trangThai,
      },
    });

    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateStreetLightInspectionStatus failed:', error);
    throw error;
  }
};

export const getMaintenancePlans = async (
  params?: StreetLightQueryParams
): Promise<MaintenancePlan[]> => {
  try {
    const response = await api.get(MAINTENANCE_PLANS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getMaintenancePlans failed:', error);
    throw error;
  }
};

export const createMaintenancePlan = async (payload: CreateMaintenancePlanPayload) => {
  try {
    const response = await api.post(CREATE_MAINTENANCE_PLAN_ENDPOINT, undefined, {
      params: { data: JSON.stringify(payload) },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createMaintenancePlan failed:', error);
    throw error;
  }
};

export const updateMaintenancePlanStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_MAINTENANCE_PLAN_STATUS_ENDPOINT, undefined, {
      params: { name, trang_thai: trangThai },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateMaintenancePlanStatus failed:', error);
    throw error;
  }
};

export const getWorkOrders = async (params?: StreetLightQueryParams): Promise<WorkOrder[]> => {
  try {
    const response = await api.get(WORK_ORDERS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getWorkOrders failed:', error);
    throw error;
  }
};

export const createWorkOrder = async (payload: CreateWorkOrderPayload) => {
  try {
    const response = await api.post(CREATE_WORK_ORDER_ENDPOINT, undefined, {
      params: { data: JSON.stringify(payload) },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createWorkOrder failed:', error);
    throw error;
  }
};

export const updateWorkOrderStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_WORK_ORDER_STATUS_ENDPOINT, undefined, {
      params: { name, trang_thai: trangThai },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateWorkOrderStatus failed:', error);
    throw error;
  }
};

export const getWorkLogs = async (params?: StreetLightQueryParams): Promise<WorkLog[]> => {
  try {
    const response = await api.get(WORK_LOGS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getWorkLogs failed:', error);
    throw error;
  }
};

export const createWorkLog = async (payload: CreateWorkLogPayload) => {
  try {
    const response = await api.post(CREATE_WORK_LOG_ENDPOINT, undefined, {
      params: { data: JSON.stringify(payload) },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createWorkLog failed:', error);
    throw error;
  }
};

export const getAcceptanceRecords = async (
  params?: StreetLightQueryParams
): Promise<AcceptanceRecord[]> => {
  try {
    const response = await api.get(ACCEPTANCE_RECORDS_ENDPOINT, { params: buildParams(params) });
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getAcceptanceRecords failed:', error);
    throw error;
  }
};

export const createAcceptanceRecord = async (payload: CreateAcceptanceRecordPayload) => {
  try {
    const response = await api.post(CREATE_ACCEPTANCE_RECORD_ENDPOINT, undefined, {
      params: { data: JSON.stringify(payload) },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] createAcceptanceRecord failed:', error);
    throw error;
  }
};

export const updateAcceptanceStatus = async (name: string, trangThai: string) => {
  try {
    const response = await api.post(UPDATE_ACCEPTANCE_STATUS_ENDPOINT, undefined, {
      params: { name, trang_thai: trangThai },
    });
    return getFrappePayload(response.data);
  } catch (error) {
    console.error('[StreetLightAPI] updateAcceptanceStatus failed:', error);
    throw error;
  }
};

export const getReportByArea = async (): Promise<ReportByAreaItem[]> => {
  try {
    const response = await api.get(REPORT_BY_AREA_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getReportByArea failed:', error);
    throw error;
  }
};

export const getReportIncidents = async (): Promise<ReportIncidentsData> => {
  try {
    const response = await api.get(REPORT_INCIDENTS_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return payload;
  } catch (error) {
    console.error('[StreetLightAPI] getReportIncidents failed:', error);
    throw error;
  }
};

export const getReportWorkOrders = async (): Promise<ReportWorkOrdersData> => {
  try {
    const response = await api.get(REPORT_WORK_ORDERS_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return payload;
  } catch (error) {
    console.error('[StreetLightAPI] getReportWorkOrders failed:', error);
    throw error;
  }
};

export const getReportUnitPerformance = async (): Promise<UnitPerformanceItem[]> => {
  try {
    const response = await api.get(REPORT_UNIT_PERFORMANCE_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getReportUnitPerformance failed:', error);
    throw error;
  }
};

export interface MyWorkItem {
  type: string;
  title: string;
  reference_name: string;
  ma_tai_san?: string;
  ten_tai_san?: string;
  tuyen_duong?: string;
  khu_vuc?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  action_url: string;
}

export interface StreetLightNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  level: 'info' | 'warning' | 'error' | 'success';
  created_at: string;
  action_url: string;
  is_read: boolean;
}

export interface StreetLightCategoryItem {
  code: string;
  name: string;
  description?: string;
  color?: string;
  usage_count?: number;
}

export interface StreetLightCategoriesData {
  severity: StreetLightCategoryItem[];
  report_sources: StreetLightCategoryItem[];
  fault_types: StreetLightCategoryItem[];
  electrical_conditions: StreetLightCategoryItem[];
  pole_conditions: StreetLightCategoryItem[];
  wire_conditions: StreetLightCategoryItem[];
  safety_levels: StreetLightCategoryItem[];
}

const MY_WORK_ITEMS_ENDPOINT = '/api/method/smart_city.smart_city.services.street_light_service.get_my_work_items';
const NOTIFICATIONS_ENDPOINT = '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_notifications';
const CATEGORIES_ENDPOINT = '/api/method/smart_city.smart_city.services.street_light_service.get_street_light_categories';

export const getMyWorkItems = async (): Promise<MyWorkItem[]> => {
  try {
    const response = await api.get(MY_WORK_ITEMS_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getMyWorkItems failed:', error);
    throw error;
  }
};

export const getStreetLightNotifications = async (): Promise<StreetLightNotification[]> => {
  try {
    const response = await api.get(NOTIFICATIONS_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightNotifications failed:', error);
    throw error;
  }
};

export const getStreetLightCategories = async (): Promise<StreetLightCategoriesData> => {
  try {
    const response = await api.get(CATEGORIES_ENDPOINT);
    const payload = getFrappePayload(response.data);
    return payload;
  } catch (error) {
    console.error('[StreetLightAPI] getStreetLightCategories failed:', error);
    throw error;
  }
};
