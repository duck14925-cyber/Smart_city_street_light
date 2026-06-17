import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axios';

const icon = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const iconShadow = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const { BaseLayer, Overlay } = LayersControl;

// Component hỗ trợ tự động zoom/pan đến ranh giới phường/xã
const FitBoundsToGeoJSON = ({ geojson }: { geojson: any }) => {
  const map = useMap();
  useEffect(() => {
    if (geojson) {
      const layer = L.geoJSON(geojson);
      map.fitBounds(layer.getBounds(), { padding: [50, 50] });
    }
  }, [geojson, map]);
  return null;
};

const TaiNguyenHaTang = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [wardBoundary, setWardBoundary] = useState<any>(null);

  // Fetch dữ liệu hạ tầng dựa trên Phường/Xã
  const fetchAssets = async (ward: string) => {
    try {
      const filters = ward ? { phuong_xa: ward } : undefined;
      
      const response = await api.get(`/api/resource/Tai Nguyen Ha Tang`, {
        params: {
          fields: JSON.stringify(['*']),
          ...(filters && { filters: JSON.stringify(filters) }),
          limit_page_length: 1000 // Safely get all markers for map
        },
      });
      setAssets(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  // Fetch ranh giới GeoJSON của Phường/Xã
  const fetchWardBoundary = async (ward: string) => {
    if (!ward) {
      setWardBoundary(null);
      return;
    }
    try {
      const response = await api.get(`/api/resource/Phuong Xa/${encodeURIComponent(ward)}`);
      const boundaryData = response.data.data.ranh_gioi_geo;
      if (boundaryData) {
        setWardBoundary(JSON.parse(boundaryData));
      } else {
        setWardBoundary(null);
      }
    } catch (error) {
      console.error('Error fetching ward boundary:', error);
      setWardBoundary(null);
    }
  };

  useEffect(() => {
    fetchAssets(selectedWard);
    fetchWardBoundary(selectedWard);
  }, [selectedWard]);

  // Nhóm tài sản theo loại
  const cameras = assets.filter(a => a.loai_tai_san === 'Camera an ninh' || a.loai_tai_san === 'Camera');
  const trees = assets.filter(a => a.loai_tai_san === 'Cây xanh');
  const shelters = assets.filter(a => a.loai_tai_san === 'Nhà sơ tán');

  const parseCoords = (gpsString: string) => {
    if (!gpsString) return null;
    const parts = gpsString.split(',');
    if (parts.length !== 2) return null;
    const lat = Number(parts[0].trim());
    const lng = Number(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng] as [number, number];
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-4 bg-slate-950 text-white">
      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">🗺️ Bản Đồ Hạ Tầng Đô Thị (Liên Chiểu)</h1>
          <p className="text-sm text-slate-400 mt-1">Hệ thống phân lớp dữ liệu & Bộ lọc Không gian</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            className="p-2 bg-slate-800 text-white rounded border border-slate-700 focus:outline-none focus:border-emerald-500 text-sm"
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
          >
            <option value="">-- Tất cả Phường/Xã --</option>
            <option value="Hòa Khánh Bắc">Hòa Khánh Bắc</option>
            <option value="Hòa Khánh Nam">Hòa Khánh Nam</option>
            <option value="Hòa Minh">Hòa Minh</option>
            <option value="Hòa Hiệp Bắc">Hòa Hiệp Bắc</option>
            <option value="Hòa Hiệp Nam">Hòa Hiệp Nam</option>
          </select>
          <span className="px-3 py-1 bg-emerald-950 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-800">● Smart Map Connected</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative" style={{ minHeight: '550px' }}>
        <MapContainer center={[16.0544, 108.1479]} zoom={13} style={{ height: '100%', width: '100%' }} className="custom-dark-map">
          <LayersControl position="topright">

            {/* FEATURE 1: Base Map Switcher */}
            <BaseLayer checked name="Dark Mode Map">
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
            </BaseLayer>
            <BaseLayer name="OpenStreetMap Standard">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
            </BaseLayer>
            <BaseLayer name="Satellite View">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri'
              />
            </BaseLayer>

            {/* FEATURE 2: Infrastructure Overlay Toggles */}
            <Overlay checked name="Hệ thống Camera">
              <LayersControl.Overlay checked name="Camera">
                {cameras.map(asset => {
                  const pos = parseCoords(asset.toa_do_gps);
                  return pos ? (
                    <Marker key={asset.ma_tai_san} position={pos}>
                      <Popup className="dark-popup">
                        <div className="text-slate-900 p-1">
                          <p className="font-bold">{asset.ten_tai_san}</p>
                          <p className="text-xs mt-1">Phân loại: {asset.loai_tai_san}</p>
                          <p className="text-xs font-semibold mt-1 text-emerald-600">Trạng thái: {asset.trang_thai}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null;
                })}
              </LayersControl.Overlay>
            </Overlay>

            <Overlay checked name="Cây xanh đô thị">
              <LayersControl.Overlay checked name="Cây xanh">
                {trees.map(asset => {
                  const pos = parseCoords(asset.toa_do_gps);
                  return pos ? (
                    <Marker key={asset.ma_tai_san} position={pos}>
                      <Popup className="dark-popup">
                        <div className="text-slate-900 p-1">
                          <p className="font-bold">{asset.ten_tai_san}</p>
                          <p className="text-xs mt-1">Phân loại: {asset.loai_tai_san}</p>
                          <p className="text-xs font-semibold mt-1 text-emerald-600">Trạng thái: {asset.trang_thai}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null;
                })}
              </LayersControl.Overlay>
            </Overlay>

            <Overlay checked name="Nhà sơ tán thiên tai">
              <LayersControl.Overlay checked name="Nhà sơ tán">
                {shelters.map(asset => {
                  const pos = parseCoords(asset.toa_do_gps);
                  return pos ? (
                    <Marker key={asset.ma_tai_san} position={pos}>
                      <Popup className="dark-popup">
                        <div className="text-slate-900 p-1">
                          <p className="font-bold">{asset.ten_tai_san}</p>
                          <p className="text-xs mt-1">Phân loại: {asset.loai_tai_san}</p>
                          <p className="text-xs font-semibold mt-1 text-emerald-600">Trạng thái: {asset.trang_thai}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null;
                })}
              </LayersControl.Overlay>
            </Overlay>
          </LayersControl>

          {/* FEATURE 3: Ward/Commune Spatial Filter Boundary */}
          {wardBoundary && (
            <>
              <GeoJSON
                key={selectedWard} /* Force re-render when ward changes */
                data={wardBoundary}
                style={{
                  color: '#3b82f6',
                  weight: 2,
                  opacity: 0.8,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1
                }}
              />
              <FitBoundsToGeoJSON geojson={wardBoundary} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default TaiNguyenHaTang;
