export type StreetLightStatus = 'Hoạt động' | 'Hỏng' | 'Bảo trì' | (string & {});

export type MapMode = '2d' | '3d';

export type BaseMapType = 'street' | 'satellite';

export interface StreetLight {
  name: string;
  ma_tai_san: string;
  ten_tai_san: string;
  route_name?: string | null;
  khu_vuc: string;
  ten_khu_vuc?: string;
  latitude: number | null;
  longitude: number | null;
  trang_thai: StreetLightStatus;
}

export interface StreetLightMapFilters {
  khu_vuc: string;
  route_name: string;
  trang_thai: string;
  search: string;
}

export interface StreetLightRouteLinePoint {
  latitude: number;
  longitude: number;
}

export interface StreetLightRouteLine {
  route_name: string;
  points: StreetLightRouteLinePoint[];
  count: number;
}

export interface StreetLightCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  lights: StreetLight[];
}

export interface StreetLightRoute {
  name: string;
  ma_tuyen: string;
  ten_tuyen: string;
  khu_vuc: string;
  ten_khu_vuc?: string;
  polyline: StreetLightRouteLinePoint[];
  so_diem?: number;
  ghi_chu?: string;
}
