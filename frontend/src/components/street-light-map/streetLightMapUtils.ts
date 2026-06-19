import type {
  MapMode,
  StreetLight,
  StreetLightCluster,
  StreetLightMapFilters,
  StreetLightRouteLine,
} from './streetLightTypes';

const statusBadgeClasses: Record<string, string> = {
  'Hoạt động': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Hỏng': 'bg-red-50 text-red-700 ring-red-200',
  'Bảo trì': 'bg-amber-50 text-amber-700 ring-amber-200',
};

const statusColors: Record<string, string> = {
  'Hoạt động': '#10b981',
  'Hỏng': '#ef4444',
  'Bảo trì': '#f59e0b',
};

export const getStatusColor = (status: string) => statusColors[status] ?? '#64748b';

export const getStatusBadgeClass = (status: string) =>
  statusBadgeClasses[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200';

export const hasCoordinates = (light: StreetLight) =>
  typeof light.latitude === 'number' && typeof light.longitude === 'number';

export const formatCoordinate = (lat: number | null, lng: number | null) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return 'Chưa có tọa độ';
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

export const normalizeRouteName = (light: StreetLight) => {
  if (light.route_name?.trim()) {
    return light.route_name.trim();
  }

  const parts = light.ten_tai_san?.split(' - ').map((part) => part.trim()).filter(Boolean) ?? [];
  if (parts.length >= 3 && parts[0].toLocaleLowerCase('vi-VN').includes('đèn chiếu sáng')) {
    return parts.slice(1, -1).join(' - ');
  }

  return '';
};

export const normalizeRouteTitle = (title: string | null | undefined): string => {
  if (!title) return '';
  let res = title.trim().toUpperCase();
  if (res.startsWith('ĐƯỜNG ')) {
    res = res.slice(6).trim();
  } else if (res.startsWith('ĐƯỜNG')) {
    res = res.slice(5).trim();
  }
  return res;
};

export const buildAreaOptions = (lights: StreetLight[]) => {
  const areaMap = new Map<string, string>();

  lights.forEach((light) => {
    if (!light.khu_vuc) return;
    areaMap.set(light.khu_vuc, light.ten_khu_vuc || light.khu_vuc);
  });

  return Array.from(areaMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, 'vi-VN'));
};

export const buildRouteOptions = (lights: StreetLight[]) => {
  const routeNames = new Set<string>();

  lights.forEach((light) => {
    const routeName = normalizeRouteName(light);
    if (!routeName) return;
    routeNames.add(routeName);
  });

  return Array.from(routeNames)
    .map((routeName) => ({ value: routeName, label: routeName }))
    .sort((left, right) => left.label.localeCompare(right.label, 'vi-VN'));
};

export const buildRouteLines = (lights: StreetLight[]): StreetLightRouteLine[] => {
  const routeGroups = new Map<string, StreetLight[]>();

  lights.forEach((light) => {
    const routeName = normalizeRouteName(light);
    if (!routeName || !hasCoordinates(light)) return;

    const routeLights = routeGroups.get(routeName) ?? [];
    routeLights.push(light);
    routeGroups.set(routeName, routeLights);
  });

  return Array.from(routeGroups.entries())
    .map(([routeName, routeLights]) => {
      const sortedLights = [...routeLights].sort((left, right) => {
        const leftKey = left.ma_tai_san || left.ten_tai_san || left.name;
        const rightKey = right.ma_tai_san || right.ten_tai_san || right.name;
        return leftKey.localeCompare(rightKey, 'vi-VN');
      });
      const centerlinePoints = [];

      for (let index = 0; index < sortedLights.length; index += 2) {
        const firstLight = sortedLights[index];
        const secondLight = sortedLights[index + 1];

        if (!secondLight) {
          centerlinePoints.push({
            latitude: firstLight.latitude as number,
            longitude: firstLight.longitude as number,
          });
          continue;
        }

        centerlinePoints.push({
          latitude: ((firstLight.latitude as number) + (secondLight.latitude as number)) / 2,
          longitude: ((firstLight.longitude as number) + (secondLight.longitude as number)) / 2,
        });
      }

      return {
        route_name: routeName,
        points: centerlinePoints,
        count: sortedLights.length,
      };
    })
    .filter((routeLine) => routeLine.points.length >= 2)
    .sort((left, right) => left.route_name.localeCompare(right.route_name, 'vi-VN'));
};

export const filterLights = (lights: StreetLight[], filters: StreetLightMapFilters) => {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase('vi-VN');

  return lights.filter((light) => {
    const routeName = normalizeRouteName(light);
    const matchesStatus = filters.trang_thai ? light.trang_thai === filters.trang_thai : true;
    const matchesArea = filters.khu_vuc ? light.khu_vuc === filters.khu_vuc : true;
    const matchesRoute = filters.route_name ? normalizeRouteTitle(routeName) === normalizeRouteTitle(filters.route_name) : true;
    const searchableText = [
      light.ma_tai_san,
      light.ten_tai_san,
      light.ten_khu_vuc,
      routeName,
      light.khu_vuc,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi-VN');
    const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

    return matchesStatus && matchesArea && matchesRoute && matchesSearch;
  });
};

const getClusterCellSize = (zoomOrHeight: number, mode: MapMode) => {
  if (mode === '2d') {
    if (zoomOrHeight <= 11) return 0.02;
    if (zoomOrHeight <= 12) return 0.014;
    if (zoomOrHeight <= 13) return 0.008;
    return 0.004;
  }

  if (zoomOrHeight > 20000) return 0.035;
  if (zoomOrHeight > 12000) return 0.024;
  return 0.016;
};

export const buildLightClusters = (
  lights: StreetLight[],
  mode: MapMode,
  zoomOrHeight: number
): StreetLightCluster[] => {
  const cellSize = getClusterCellSize(zoomOrHeight, mode);
  const clusterMap = new Map<string, StreetLight[]>();

  lights.forEach((light) => {
    if (!hasCoordinates(light)) return;

    const routeName = normalizeRouteName(light) || 'unknown';
    const latCell = Math.floor((light.latitude as number) / cellSize);
    const lngCell = Math.floor((light.longitude as number) / cellSize);
    const key = `${routeName}:${latCell}:${lngCell}`;
    const group = clusterMap.get(key) ?? [];
    group.push(light);
    clusterMap.set(key, group);
  });

  return Array.from(clusterMap.entries())
    .map(([id, clusterLights]) => {
      const latitude =
        clusterLights.reduce((total, light) => total + (light.latitude as number), 0) /
        clusterLights.length;
      const longitude =
        clusterLights.reduce((total, light) => total + (light.longitude as number), 0) /
        clusterLights.length;

      return {
        id,
        latitude,
        longitude,
        count: clusterLights.length,
        lights: clusterLights,
      };
    })
    .sort((left, right) => right.count - left.count);
};
