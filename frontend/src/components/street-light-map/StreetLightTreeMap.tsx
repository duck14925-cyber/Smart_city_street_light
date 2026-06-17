import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  Entity,
  HeadingPitchRange,
  HeightReference,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  ShadowMode,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  Viewer,
  Math as CesiumMath,
} from 'cesium';
import 'leaflet/dist/leaflet.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type {
  BaseMapType,
  MapMode,
  StreetLight,
  StreetLightCluster,
  StreetLightRoute,
  StreetLightRouteLine,
} from './streetLightTypes';
import {
  buildLightClusters,
  buildRouteLines,
  getStatusColor,
  hasCoordinates,
  normalizeRouteName,
} from './streetLightMapUtils';

const DEFAULT_CENTER: [number, number] = [16.0544, 108.2022];
const ZOOM_3D_THRESHOLD = 2000;
const CLUSTER_3D_THRESHOLD = 8000;
const CLUSTER_2D_MAX_ZOOM = 14;
const FALLBACK_POLE_HEIGHT_M = 10;

interface TileConfig {
  url: string;
  attribution: string;
  maxZoom?: number;
}

const tileConfigs: Record<BaseMapType, TileConfig> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
  outdoors: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
    maxZoom: 17,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  google: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors. Google fallback: OSM tile không cần token.',
    maxZoom: 19,
  },
  google_satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri. Google satellite fallback: Esri imagery không cần token.',
    maxZoom: 18,
  },
  arcgis: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
  arcgis_satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
};

export const getLeafletTileConfig = (basemap: BaseMapType): TileConfig =>
  tileConfigs[basemap] ?? tileConfigs.standard;

const create2DMarkerIcon = (status: string, isSelected: boolean) => {
  const color = getStatusColor(status);
  const size = isSelected ? 36 : 28;
  const innerSize = isSelected ? 16 : 12;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:${color}22;
        border:3px solid ${isSelected ? '#2563eb' : color};
        box-shadow:0 8px 16px ${color}33;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          width:${innerSize}px;
          height:${innerSize}px;
          border-radius:9999px;
          background:${color};
          border:2px solid white;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const create2DClusterIcon = (count: number) => {
  const size = count >= 50 ? 54 : count >= 20 ? 48 : 42;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:linear-gradient(135deg,#2563eb,#06b6d4);
        border:4px solid white;
        color:white;
        box-shadow:0 16px 34px rgba(37,99,235,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900;
        font-size:${count >= 100 ? 13 : 14}px;
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createPickedLocationIcon = () => {
  const size = 42;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:#2563eb22;
        border:3px solid #2563eb;
        box-shadow:0 12px 28px rgba(37,99,235,.38);
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          width:16px;
          height:16px;
          border-radius:9999px;
          background:#2563eb;
          border:3px solid white;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export const getCesiumImageryProvider = (basemap: BaseMapType) => {
  const config = getLeafletTileConfig(basemap);

  return new UrlTemplateImageryProvider({
    url: config.url.replace('{s}', 'a').replace('{r}', ''),
    credit: config.attribution,
    enablePickFeatures: false,
    maximumLevel: config.maxZoom ?? 18,
  });
};

const flyCesiumToLights = (viewer: Viewer, lights: StreetLight[]) => {
  if (lights.length === 0) return;

  const longitudes = lights.map((light) => light.longitude as number);
  const latitudes = lights.map((light) => light.latitude as number);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const centerLongitude = (west + east) / 2;
  const centerLatitude = (south + north) / 2;
  const span = Math.max(east - west, north - south);
  const height = Math.max(1800, span * 175000);

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(centerLongitude, centerLatitude, height),
    orientation: {
      heading: CesiumMath.toRadians(-28),
      pitch: CesiumMath.toRadians(-43),
      roll: 0,
    },
    duration: 0.9,
  });
};

const flyCesiumToPoints = (
  viewer: Viewer,
  points: Array<{ latitude: number; longitude: number }>
) => {
  if (points.length === 0) return;

  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const centerLongitude = (west + east) / 2;
  const centerLatitude = (south + north) / 2;
  const span = Math.max(east - west, north - south);
  const height = points.length === 1 ? 1200 : Math.min(8500, Math.max(1800, span * 170000));

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(centerLongitude, centerLatitude, height),
    orientation: {
      heading: CesiumMath.toRadians(-28),
      pitch: CesiumMath.toRadians(-46),
      roll: 0,
    },
    duration: 0.8,
  });
};

const flyCesiumToLight = (viewer: Viewer, light: StreetLight) => {
  if (!hasCoordinates(light)) return;

  const target = Cartesian3.fromDegrees(light.longitude as number, light.latitude as number, 8);
  viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 80), {
    offset: new HeadingPitchRange(
      CesiumMath.toRadians(35),
      CesiumMath.toRadians(-58),
      360
    ),
    duration: 0.75,
  });
};

const flyCesiumToCluster = (viewer: Viewer, cluster: StreetLightCluster) => {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(cluster.longitude, cluster.latitude, 4200),
    orientation: {
      heading: CesiumMath.toRadians(30),
      pitch: CesiumMath.toRadians(-48),
      roll: 0,
    },
    duration: 0.75,
  });
};

const getEntityPayload = (entityId: unknown) => {
  if (typeof entityId !== 'string') return { type: '', id: '' };
  const separatorIndex = entityId.indexOf(':');
  if (separatorIndex < 0) return { type: '', id: entityId };

  return {
    type: entityId.slice(0, separatorIndex),
    id: decodeURIComponent(entityId.slice(separatorIndex + 1)),
  };
};

const toSafeEntityId = (prefix: string, value: string) =>
  `${prefix}:${encodeURIComponent(value)}`;

interface CesiumLightEntityPair {
  lightId: string;
  billboardEntities: Entity[];
  poleEntities: Entity[];
}

const setEntitiesVisible = (entities: Entity[], visible: boolean) => {
  entities.forEach((entity) => {
    entity.show = visible;
  });
};

const updateVisibilityByCameraHeight = (
  viewer: Viewer,
  entityPairs: CesiumLightEntityPair[],
  clusterEntities: Entity[]
) => {
  const height = viewer.camera.positionCartographic.height;
  const showClusters = height > CLUSTER_3D_THRESHOLD;
  const showBillboards = height > ZOOM_3D_THRESHOLD && height <= CLUSTER_3D_THRESHOLD;

  setEntitiesVisible(clusterEntities, showClusters);
  entityPairs.forEach((pair) => {
    setEntitiesVisible(pair.billboardEntities, showBillboards);
    setEntitiesVisible(pair.poleEntities, !showBillboards && !showClusters);
  });

  viewer.scene.requestRender();
};

const addCesiumCluster = (viewer: Viewer, cluster: StreetLightCluster) => {
  return viewer.entities.add({
    id: toSafeEntityId('cluster', cluster.id),
    name: `${cluster.count} đèn`,
    position: Cartesian3.fromDegrees(cluster.longitude, cluster.latitude, 80),
    point: {
      pixelSize: cluster.count >= 50 ? 40 : cluster.count >= 20 ? 34 : 28,
      color: Color.fromCssColorString('#2563eb').withAlpha(0.92),
      outlineColor: Color.WHITE,
      outlineWidth: 4,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: `${cluster.count}`,
      font: '900 15px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.fromCssColorString('#0f172a'),
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.CENTER,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
};

const addCesiumRouteLines = (
  viewer: Viewer,
  routeLines: StreetLightRouteLine[],
  selectedRouteName?: string | null
) => {
  routeLines.forEach((routeLine) => {
    const isHighlighted =
      selectedRouteName === routeLine.route_name || routeLines.length === 1;
    const positions = routeLine.points.map((point) =>
      Cartesian3.fromDegrees(point.longitude, point.latitude, 3)
    );

    viewer.entities.add({
      id: toSafeEntityId('route-line', routeLine.route_name),
      name: routeLine.route_name,
      polyline: {
        positions,
        width: isHighlighted ? 6 : 4,
        material: Color.fromCssColorString(isHighlighted ? '#facc15' : '#22d3ee').withAlpha(
          isHighlighted ? 0.9 : 0.65
        ),
        clampToGround: false,
      },
    });
  });
};

const addCesiumUrbanContext = (viewer: Viewer, lights: StreetLight[]) => {
  lights.slice(0, 80).forEach((light, index) => {
    if (!hasCoordinates(light) || index % 2 === 0) return;

    const height = 18 + (index % 7) * 8;
    const longitudeOffset = (((index * 3) % 7) - 3) * 0.000095;
    const latitudeOffset = (((index * 5) % 9) - 4) * 0.000075;
    const longitude = (light.longitude as number) + longitudeOffset;
    const latitude = (light.latitude as number) + latitudeOffset;

    viewer.entities.add({
      id: `building:${light.name || light.ma_tai_san}:${index}`,
      polyline: {
        positions: [
          Cartesian3.fromDegrees(longitude, latitude, 0),
          Cartesian3.fromDegrees(longitude, latitude, height),
        ],
        width: 2,
        material: Color.WHITE.withAlpha(0.16),
      },
    });
  });
};

const addCesiumBillboardLight = (viewer: Viewer, light: StreetLight, isSelected: boolean) => {
  const longitude = light.longitude as number;
  const latitude = light.latitude as number;
  const statusColor = Color.fromCssColorString(getStatusColor(light.trang_thai));
  const selectedColor = Color.fromCssColorString('#22d3ee');
  const entitySuffix = light.name || light.ma_tai_san;

  const billboardEntity = viewer.entities.add({
    id: toSafeEntityId('billboard', entitySuffix),
    name: light.ma_tai_san,
    position: Cartesian3.fromDegrees(longitude, latitude, 12),
    point: {
      pixelSize: isSelected ? 22 : 15,
      color: statusColor.withAlpha(0.95),
      outlineColor: isSelected ? selectedColor : Color.WHITE,
      outlineWidth: isSelected ? 5 : 3,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: isSelected
      ? {
          text: light.ma_tai_san,
          font: '800 14px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -34),
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          heightReference: HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }
      : undefined,
    properties: { lightName: light.name },
  });

  return [billboardEntity];
};

const addCesiumLight = (viewer: Viewer, light: StreetLight, isSelected: boolean) => {
  const longitude = light.longitude as number;
  const latitude = light.latitude as number;
  const statusColor = Color.fromCssColorString(getStatusColor(light.trang_thai));
  const selectedColor = Color.fromCssColorString('#22d3ee');
  const poleHeight = FALLBACK_POLE_HEIGHT_M;
  const headHeight = poleHeight + 0.8;
  const headLongitude = longitude + 0.000028;
  const headLatitude = latitude + 0.000012;
  const entitySuffix = light.name || light.ma_tai_san;
  const poleEntities: Entity[] = [];
  const addPoleEntity = (entityOptions: any) => {
    const entity = viewer.entities.add(entityOptions);
    poleEntities.push(entity);
    return entity;
  };

  addPoleEntity({
    id: toSafeEntityId('base', entitySuffix),
    name: light.ma_tai_san,
    position: Cartesian3.fromDegrees(longitude, latitude, 2),
    point: {
      pixelSize: isSelected ? 12 : 8,
      color: Color.fromCssColorString('#334155').withAlpha(0.95),
      outlineColor: isSelected ? selectedColor : Color.WHITE,
      outlineWidth: isSelected ? 3 : 2,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    properties: { lightName: light.name },
  });

  addPoleEntity({
    id: toSafeEntityId('pole', entitySuffix),
    name: light.ma_tai_san,
    polyline: {
      positions: [
        Cartesian3.fromDegrees(longitude, latitude, 0),
        Cartesian3.fromDegrees(longitude, latitude, poleHeight),
      ],
      width: isSelected ? 4 : 2.5,
      material: isSelected ? selectedColor : Color.fromCssColorString('#cbd5e1').withAlpha(0.95),
      shadows: ShadowMode.DISABLED,
    },
    properties: { lightName: light.name },
  });

  addPoleEntity({
    id: toSafeEntityId('arm', entitySuffix),
    name: light.ma_tai_san,
    polyline: {
      positions: [
        Cartesian3.fromDegrees(longitude, latitude, poleHeight + 0.5),
        Cartesian3.fromDegrees(headLongitude, headLatitude, headHeight),
      ],
      width: isSelected ? 4 : 2.5,
      material: isSelected ? selectedColor : Color.LIGHTGRAY,
      shadows: ShadowMode.ENABLED,
    },
    properties: { lightName: light.name },
  });

  addPoleEntity({
    id: toSafeEntityId('head', entitySuffix),
    name: light.ma_tai_san,
    position: Cartesian3.fromDegrees(headLongitude, headLatitude, headHeight),
    point: {
      pixelSize: isSelected ? 18 : 12,
      color: statusColor.withAlpha(0.95),
      outlineColor: isSelected ? selectedColor : Color.WHITE,
      outlineWidth: isSelected ? 4 : 2,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: isSelected
      ? {
          text: light.ma_tai_san,
          font: '800 14px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -46),
          verticalOrigin: VerticalOrigin.BOTTOM,
          horizontalOrigin: HorizontalOrigin.CENTER,
          heightReference: HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }
      : undefined,
    properties: { lightName: light.name },
  });

  addPoleEntity({
    id: toSafeEntityId('light-beam', entitySuffix),
    polyline: {
      positions: [
        Cartesian3.fromDegrees(headLongitude, headLatitude, headHeight - 1),
        Cartesian3.fromDegrees(headLongitude + 0.000014, headLatitude - 0.000009, 1),
      ],
      width: isSelected ? 3 : 2,
      material: statusColor.withAlpha(isSelected ? 0.42 : 0.25),
      shadows: ShadowMode.DISABLED,
    },
    properties: { lightName: light.name },
  });

  return poleEntities;
};

const MapFocus = ({ light }: { light: StreetLight | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!light || !hasCoordinates(light)) return;

    const target: [number, number] = [light.latitude as number, light.longitude as number];
    map.closePopup();
    map.invalidateSize();
    map.setView(target, 17, {
      animate: true,
      duration: 0.65,
    });
  }, [light, map]);

  return null;
};

const PopupSelectionSync = ({
  selectedLight,
  lights,
}: {
  selectedLight: StreetLight | null;
  lights: StreetLight[];
}) => {
  const map = useMap();

  useEffect(() => {
    const selectedStillVisible =
      selectedLight && lights.some((light) => light.name === selectedLight.name);

    if (!selectedStillVisible) {
      map.closePopup();
    }
  }, [lights, map, selectedLight]);

  return null;
};

const LightPopupContent = ({ light }: { light: StreetLight }) => {
  const routeName = normalizeRouteName(light);

  return (
    <div className="min-w-[230px] p-1 text-slate-100">
      <p className="font-mono text-xs font-bold text-blue-300">{light.ma_tai_san}</p>
      <h3 className="mt-1 text-sm font-bold text-white">{light.ten_tai_san}</h3>
      <div className="mt-3 space-y-1 text-xs text-slate-200">
        <p>Tuyến đường: {routeName || 'Chưa xác định'}</p>
        <p>Khu vực: {light.ten_khu_vuc || light.khu_vuc || 'Chưa xác định'}</p>
        <p>Trạng thái: {light.trang_thai || 'Không rõ'}</p>
        <p>
          Tọa độ: {Number(light.latitude).toFixed(6)}, {Number(light.longitude).toFixed(6)}
        </p>
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
      >
        Xem chi tiết
      </button>
    </div>
  );
};

const getFitPoints = (lights: StreetLight[], routes: StreetLightRoute[]) => {
  const lightPoints = lights
    .filter(hasCoordinates)
    .map((light) => ({
      latitude: light.latitude as number,
      longitude: light.longitude as number,
    }));

  if (lightPoints.length > 0) return lightPoints;

  return routes.flatMap((route) => route.polyline ?? []);
};

const FitBoundsOnLoad = ({
  lights,
  routes,
  fitSignal,
  selectedLight,
}: {
  lights: StreetLight[];
  routes: StreetLightRoute[];
  fitSignal: number;
  selectedLight: StreetLight | null;
}) => {
  const map = useMap();
  const lastFitKeyRef = useRef('');

  useEffect(() => {
    if (selectedLight) return;

    const fitPoints = getFitPoints(lights, routes);
    if (fitPoints.length === 0) return;

    const fitKey = `${fitSignal}:${fitPoints
      .map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
      .join('|')}`;
    if (lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey;

    if (fitPoints.length === 1) {
      const point = fitPoints[0];
      map.setView([point.latitude, point.longitude], 16, {
        animate: true,
        duration: 0.55,
      });
      return;
    }

    const bounds = L.latLngBounds(fitPoints.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds, {
      padding: [72, 72],
      maxZoom: 16,
    });
  }, [fitSignal, lights, map, routes, selectedLight]);

  return null;
};

const ZoomTracker = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

const ClusterMarker2D = ({ cluster }: { cluster: StreetLightCluster }) => {
  const map = useMap();

  return (
    <Marker
      position={[cluster.latitude, cluster.longitude]}
      icon={create2DClusterIcon(cluster.count)}
      eventHandlers={{
        click: () => {
          map.closePopup();
          map.setView([cluster.latitude, cluster.longitude], CLUSTER_2D_MAX_ZOOM + 2, {
            animate: true,
            duration: 0.65,
          });
        },
      }}
    >
      <Popup>
        <div className="min-w-[190px] p-1 text-slate-100">
          <p className="text-xs font-semibold text-slate-300">Cụm đèn</p>
          <h3 className="mt-1 text-sm font-bold text-white">{cluster.count} đèn chiếu sáng</h3>
          <p className="mt-2 text-xs text-slate-200">
            Nhấn cụm để phóng gần và xem từng đèn.
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

const LocationPicker2D = ({
  enabled,
  onPickLocation,
}: {
  enabled: boolean;
  onPickLocation: (location: { latitude: number; longitude: number }) => void;
}) => {
  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      onPickLocation({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
};

const RouteDrawer2D = ({
  enabled,
  onAddPoint,
}: {
  enabled: boolean;
  onAddPoint: (point: { latitude: number; longitude: number }) => void;
}) => {
  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      onAddPoint({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
};

interface Cesium3DMapProps {
  lights: StreetLight[];
  routeLines: StreetLightRouteLine[];
  routes: StreetLightRoute[];
  selectedLight: StreetLight | null;
  basemap: BaseMapType;
  fitSignal: number;
  showRouteLines: boolean;
  onSelectLight: (light: StreetLight) => void;
}

const Cesium3DMap = ({
  lights,
  routeLines,
  routes,
  selectedLight,
  basemap,
  fitSignal,
  showRouteLines,
  onSelectLight,
}: Cesium3DMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const clickHandlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const entityPairsRef = useRef<CesiumLightEntityPair[]>([]);
  const clusterEntitiesRef = useRef<Entity[]>([]);
  const clustersRef = useRef<StreetLightCluster[]>([]);
  const removeCameraListenerRef = useRef<(() => void) | null>(null);
  const lightsRef = useRef(lights);
  const onSelectLightRef = useRef(onSelectLight);
  const [cesiumError, setCesiumError] = useState('');

  useEffect(() => {
    lightsRef.current = lights;
  }, [lights]);

  useEffect(() => {
    onSelectLightRef.current = onSelectLight;
  }, [onSelectLight]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let viewer: Viewer;
    try {
      viewer = new Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        vrButton: false,
        scene3DOnly: true,
        shadows: true,
        shouldAnimate: true,
        skyBox: false,
        baseLayer: new ImageryLayer(getCesiumImageryProvider(basemap)),
      });

      viewer.cesiumWidget.showErrorPanel = () => undefined;
      viewer.scene.backgroundColor = Color.fromCssColorString('#7dd3fc');
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }
      viewer.scene.globe.baseColor = Color.fromCssColorString('#dbeafe');
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.00008;
      if (viewer.scene.moon) {
        viewer.scene.moon.show = false;
      }
      viewer.scene.rethrowRenderErrors = false;
      viewer.scene.renderError.addEventListener((scene, error) => {
        console.warn('[Cesium] render error ignored:', error);
        setCesiumError('Cesium gặp lỗi khi render 3D. Vui lòng thử lại hoặc chuyển về 2D.');
        scene.requestRender();
      });
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(DEFAULT_CENTER[1], DEFAULT_CENTER[0], 2200),
        orientation: {
          heading: CesiumMath.toRadians(-25),
          pitch: CesiumMath.toRadians(-42),
          roll: 0,
        },
      });
      viewer.camera.percentageChanged = 0.1;

      const handleCameraChanged = () => {
        updateVisibilityByCameraHeight(
          viewer,
          entityPairsRef.current,
          clusterEntitiesRef.current
        );
      };
      removeCameraListenerRef.current = viewer.camera.changed.addEventListener(handleCameraChanged);

      const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      clickHandler.setInputAction((movement: any) => {
        const picked = viewer.scene.pick(movement.position);
        const payload = getEntityPayload(picked?.id?.id);
        if (!payload.id) return;

        if (payload.type === 'cluster') {
          const pickedCluster = clustersRef.current.find((cluster) => cluster.id === payload.id);
          if (pickedCluster) {
            flyCesiumToCluster(viewer, pickedCluster);
          }
          return;
        }

        const pickedLight = lightsRef.current.find(
          (light) => light.name === payload.id || light.ma_tai_san === payload.id
        );
        if (pickedLight) {
          onSelectLightRef.current(pickedLight);
          flyCesiumToLight(viewer, pickedLight);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      viewerRef.current = viewer;
      clickHandlerRef.current = clickHandler;
      setCesiumError('');
    } catch (error) {
      console.error('[Cesium] init failed:', error);
      setCesiumError('Không khởi tạo được bản đồ 3D. Vui lòng thử lại hoặc chuyển về 2D.');
    }

    return () => {
      removeCameraListenerRef.current?.();
      removeCameraListenerRef.current = null;
      clickHandlerRef.current?.destroy();
      clickHandlerRef.current = null;
      entityPairsRef.current = [];
      clusterEntitiesRef.current = [];
      clustersRef.current = [];
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      viewer.imageryLayers.removeAll(true);
      viewer.imageryLayers.addImageryProvider(getCesiumImageryProvider(basemap));
      setCesiumError('');
    } catch (error) {
      console.error('[Cesium] basemap update failed:', error);
      setCesiumError('Không tải được nền bản đồ 3D. Vui lòng thử lại hoặc chuyển về 2D.');
    }
  }, [basemap]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      viewer.entities.removeAll();
      if (showRouteLines) {
        try {
          addCesiumRouteLines(viewer, routeLines, selectedLight ? normalizeRouteName(selectedLight) : '');
        } catch (routeError) {
          console.warn('[Cesium] route lines skipped:', routeError);
        }
      }
      addCesiumUrbanContext(viewer, lights);
      const clusters = buildLightClusters(lights, '3d', CLUSTER_3D_THRESHOLD + 1);
      const clusterEntities = clusters
        .filter((cluster) => cluster.count > 1)
        .map((cluster) => addCesiumCluster(viewer, cluster));
      const entityPairs = lights.map((light) => {
        const isSelected = selectedLight?.name === light.name;

        return {
          lightId: light.name || light.ma_tai_san,
          billboardEntities: addCesiumBillboardLight(viewer, light, isSelected),
          poleEntities: addCesiumLight(viewer, light, isSelected),
        };
      });
      clustersRef.current = clusters;
      clusterEntitiesRef.current = clusterEntities;
      entityPairsRef.current = entityPairs;
      updateVisibilityByCameraHeight(viewer, entityPairs, clusterEntities);
      setCesiumError('');
    } catch (error) {
      console.error('[Cesium] entity render failed:', error);
      entityPairsRef.current = [];
      clusterEntitiesRef.current = [];
      clustersRef.current = [];
      setCesiumError('Không render được dữ liệu bản đồ 3D. Vui lòng thử lại hoặc chuyển về 2D.');
    }
  }, [lights, routeLines, selectedLight, showRouteLines]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || selectedLight) return;

    const fitPoints = getFitPoints(lights, routes);
    if (fitPoints.length === 0) return;

    flyCesiumToPoints(viewer, fitPoints);
  }, [fitSignal, lights, routes, selectedLight]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedLight) return;

    try {
      flyCesiumToLight(viewer, selectedLight);
    } catch (error) {
      console.warn('[Cesium] selected light flyTo skipped:', error);
    }
  }, [selectedLight]);

  return (
    <div className="relative h-full min-h-[720px] w-full bg-slate-950">
      <div ref={containerRef} className="h-full min-h-[720px] w-full" />
      {cesiumError ? (
        <div className="absolute inset-0 z-[470] flex items-center justify-center bg-slate-950/80 p-6 text-white backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-950/80 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-xl font-black text-red-200">
              !
            </div>
            <h3 className="text-base font-bold">Không tải được bản đồ 3D</h3>
            <p className="mt-2 text-sm leading-6 text-red-100">{cesiumError}</p>
            <p className="mt-3 text-xs text-red-200/80">
              2D vẫn dùng được; 3D đã được chặn lỗi để không trắng toàn màn hình.
            </p>
          </div>
        </div>
      ) : null}
      {selectedLight ? (
        <div className="absolute left-4 top-4 z-[450] max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-white shadow-2xl backdrop-blur">
          <p className="font-mono text-xs font-bold text-blue-300">{selectedLight.ma_tai_san}</p>
          <h3 className="mt-1 text-sm font-bold">{selectedLight.ten_tai_san}</h3>
          <div className="mt-3 space-y-1 text-xs text-slate-300">
            <p>Tuyến đường: {normalizeRouteName(selectedLight) || 'Chưa xác định'}</p>
            <p>Khu vực: {selectedLight.ten_khu_vuc || selectedLight.khu_vuc || 'Chưa xác định'}</p>
            <p>Trạng thái: {selectedLight.trang_thai || 'Không rõ'}</p>
            <p>
              Tọa độ: {Number(selectedLight.latitude).toFixed(6)}, {Number(selectedLight.longitude).toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
          >
            Xem chi tiết
          </button>
        </div>
      ) : null}
    </div>
  );
};

interface StreetLightTreeMapProps {
  lights: StreetLight[];
  selectedLight: StreetLight | null;
  mapMode: MapMode;
  basemap: BaseMapType;
  fitSignal?: number;
  isPickingLocation?: boolean;
  pickedLocation?: { latitude: number; longitude: number } | null;
  savedRoutes?: StreetLightRoute[];
  isDrawingRoute?: boolean;
  drawingRoutePoints?: Array<{ latitude: number; longitude: number }>;
  onSelectLight: (light: StreetLight) => void;
  onPickLocation?: (location: { latitude: number; longitude: number }) => void;
  onCancelPickLocation?: () => void;
  onAddRoutePoint?: (point: { latitude: number; longitude: number }) => void;
  onUndoRoutePoint?: () => void;
  onFinishDrawRoute?: () => void;
  onCancelDrawRoute?: () => void;
}

const StreetLightTreeMap = ({
  lights,
  selectedLight,
  mapMode,
  basemap,
  fitSignal = 0,
  isPickingLocation = false,
  pickedLocation = null,
  savedRoutes = [],
  isDrawingRoute = false,
  drawingRoutePoints = [],
  onSelectLight,
  onPickLocation,
  onCancelPickLocation,
  onAddRoutePoint,
  onUndoRoutePoint,
  onFinishDrawRoute,
  onCancelDrawRoute,
}: StreetLightTreeMapProps) => {
  const [showRouteLines, setShowRouteLines] = useState(true);
  const [leafletZoom, setLeafletZoom] = useState(15);
  const routeLines = useMemo(() => {
    const lineMap = new Map<string, StreetLightRouteLine>();

    savedRoutes.forEach((route) => {
      if (!route.polyline || route.polyline.length < 2) return;
      lineMap.set(route.ten_tuyen || route.ma_tuyen || route.name, {
        route_name: route.ten_tuyen || route.ma_tuyen || route.name,
        points: route.polyline,
        count: route.polyline.length,
      });
    });

    buildRouteLines(lights).forEach((routeLine) => {
      if (!lineMap.has(routeLine.route_name)) {
        lineMap.set(routeLine.route_name, routeLine);
      }
    });

    return Array.from(lineMap.values());
  }, [lights, savedRoutes]);
  const lightClusters = useMemo(
    () => buildLightClusters(lights, '2d', leafletZoom),
    [leafletZoom, lights]
  );
  const show2DClusters = leafletZoom <= CLUSTER_2D_MAX_ZOOM;
  const mapCenter = useMemo<[number, number]>(() => {
    const firstLight = lights[0];

    if (firstLight && hasCoordinates(firstLight)) {
      return [firstLight.latitude as number, firstLight.longitude as number];
    }

    return DEFAULT_CENTER;
  }, [lights]);
  const tileConfig = getLeafletTileConfig(basemap);

  return (
    <div className="relative h-full min-h-[720px] w-full">
      {mapMode === '3d' ? (
        <Cesium3DMap
          lights={lights}
          routeLines={routeLines}
          routes={savedRoutes}
          selectedLight={selectedLight}
          basemap={basemap}
          fitSignal={fitSignal}
          showRouteLines={showRouteLines}
          onSelectLight={onSelectLight}
        />
      ) : (
        <MapContainer center={mapCenter} zoom={15} scrollWheelZoom className="h-full min-h-[720px] w-full">
          <TileLayer
            key={basemap}
            attribution={tileConfig.attribution}
            url={tileConfig.url}
            maxZoom={tileConfig.maxZoom}
          />
          <FitBoundsOnLoad
            lights={lights}
            routes={savedRoutes}
            fitSignal={fitSignal}
            selectedLight={selectedLight}
          />
          <ZoomTracker onZoomChange={setLeafletZoom} />
          <PopupSelectionSync selectedLight={selectedLight} lights={lights} />
          <LocationPicker2D
            enabled={isPickingLocation && !isDrawingRoute}
            onPickLocation={(location) => onPickLocation?.(location)}
          />
          <RouteDrawer2D
            enabled={isDrawingRoute}
            onAddPoint={(point) => onAddRoutePoint?.(point)}
          />
          <MapFocus light={selectedLight} />
          {savedRoutes.map((route) => (
            <Polyline
              key={route.name}
              positions={route.polyline.map((point) => [point.latitude, point.longitude])}
              pathOptions={{
                color: '#2563eb',
                opacity: 0.75,
                weight: 4,
                dashArray: '8 8',
              }}
            />
          ))}
          {drawingRoutePoints.length > 0 ? (
            <>
              {drawingRoutePoints.length >= 2 ? (
                <Polyline
                  positions={drawingRoutePoints.map((point) => [point.latitude, point.longitude])}
                  pathOptions={{ color: '#f97316', opacity: 0.95, weight: 5 }}
                />
              ) : null}
              {drawingRoutePoints.map((point, index) => (
                <Marker
                  key={`${point.latitude}-${point.longitude}-${index}`}
                  position={[point.latitude, point.longitude]}
                  icon={createPickedLocationIcon()}
                  zIndexOffset={1700}
                />
              ))}
            </>
          ) : null}
          {pickedLocation ? (
            <Marker
              position={[pickedLocation.latitude, pickedLocation.longitude]}
              icon={createPickedLocationIcon()}
              zIndexOffset={1600}
            >
              <Popup>
                <div className="min-w-[180px] p-1 text-slate-100">
                  <p className="text-xs font-semibold text-slate-300">Vị trí đang chọn</p>
                  <p className="mt-1 font-mono text-xs text-white">
                    {pickedLocation.latitude.toFixed(6)}, {pickedLocation.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ) : null}
          {showRouteLines
            ? routeLines.map((routeLine) => {
                const isHighlighted =
                  (selectedLight ? normalizeRouteName(selectedLight) : '') === routeLine.route_name ||
                  routeLines.length === 1;

                return (
                  <Polyline
                    key={routeLine.route_name}
                    positions={routeLine.points.map((point) => [point.latitude, point.longitude])}
                    pathOptions={{
                      color: isHighlighted ? '#facc15' : '#06b6d4',
                      opacity: isHighlighted ? 0.9 : 0.65,
                      weight: isHighlighted ? 5 : 3,
                    }}
                  />
                );
              })
            : null}
          {show2DClusters
            ? lightClusters.map((cluster) => {
                if (cluster.count === 1) {
                  const light = cluster.lights[0];
                  const isSelected = selectedLight?.name === light.name;

                  return (
                    <Marker
                      key={light.name}
                      position={[light.latitude as number, light.longitude as number]}
                      icon={create2DMarkerIcon(light.trang_thai, isSelected)}
                      zIndexOffset={isSelected ? 1000 : 0}
                      eventHandlers={{
                        click: () => onSelectLight(light),
                      }}
                    >
                      <Popup>
                        <LightPopupContent light={light} />
                      </Popup>
                    </Marker>
                  );
                }

                return <ClusterMarker2D key={cluster.id} cluster={cluster} />;
              })
            : lights.map((light) => {
            const isSelected = selectedLight?.name === light.name;

            return (
              <Marker
                key={light.name}
                position={[light.latitude as number, light.longitude as number]}
                icon={create2DMarkerIcon(light.trang_thai, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => onSelectLight(light),
                }}
              >
                <Popup>
                  <LightPopupContent light={light} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      <button
        type="button"
        onClick={() => setShowRouteLines((value) => !value)}
        className={`absolute bottom-4 left-4 z-[500] rounded-xl border px-3 py-2 text-xs font-bold shadow-lg backdrop-blur transition ${
          showRouteLines
            ? 'border-cyan-200 bg-cyan-50/95 text-cyan-700'
            : 'border-slate-200 bg-white/95 text-slate-600'
        }`}
      >
        {showRouteLines ? '✓ Hiện tuyến' : '○ Hiện tuyến'}
      </button>
      {isPickingLocation ? (
        <div className="absolute left-1/2 top-4 z-[520] w-[min(92%,440px)] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white/95 p-4 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-black text-slate-900">Bấm vào bản đồ để chọn vị trí đặt đèn</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Hệ thống sẽ tự điền latitude/longitude vào form thêm đèn.
          </p>
          <button
            type="button"
            onClick={onCancelPickLocation}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            Hủy chọn vị trí
          </button>
        </div>
      ) : null}
      {isDrawingRoute ? (
        <div className="absolute left-1/2 top-4 z-[530] w-[min(92%,520px)] -translate-x-1/2 rounded-2xl border border-orange-200 bg-white/95 p-4 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-black text-slate-900">Bấm nhiều điểm trên bản đồ để vẽ tuyến đường</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Đã chọn {drawingRoutePoints.length} điểm. Cần ít nhất 2 điểm để lưu tuyến.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              onClick={onFinishDrawRoute}
              disabled={drawingRoutePoints.length < 2}
              className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hoàn tất tuyến
            </button>
            <button
              type="button"
              onClick={onUndoRoutePoint}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Xóa điểm cuối
            </button>
            <button
              type="button"
              onClick={onCancelDrawRoute}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
            >
              Hủy vẽ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StreetLightTreeMap;
