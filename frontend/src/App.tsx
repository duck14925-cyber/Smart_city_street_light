import { Navigate, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import KhuVuc from './pages/KhuVuc';
import HoGiaDinh from './pages/HoGiaDinh';
import NhanKhau from './pages/NhanKhau';
import BaoCaoVanDe from './pages/BaoCaoVanDe';
import TaiNguyenHaTang from './pages/TaiNguyen'; // 1. Bổ sung import file bản đồ hạ tầng vào đây
import StreetLightDashboard from './pages/StreetLightDashboard';
import StreetLightMap from './pages/StreetLightMap';
import StreetLightAssets from './pages/StreetLightAssets';
import StreetLightDeviceTypes from './pages/StreetLightDeviceTypes';
import StreetLightPlaceholder from './pages/StreetLightPlaceholder';

const streetLightPlaceholderRoutes = [
  { path: '/street-lights/my-work', title: 'Công việc của tôi' },
  { path: '/street-lights/notifications', title: 'Thông báo' },
  { path: '/street-lights/incidents/new', title: 'Báo cáo sự cố mới' },
  { path: '/street-lights/incidents', title: 'Danh sách sự cố' },
  { path: '/street-lights/categories/severity', title: 'Mức độ sự cố' },
  { path: '/street-lights/categories/report-sources', title: 'Nguồn báo cáo' },
  { path: '/street-lights/categories/fault-types', title: 'Loại sự cố' },
  { path: '/street-lights/inspections', title: 'Phiếu kiểm tra' },
  { path: '/street-lights/categories/electrical-conditions', title: 'Tình trạng điện' },
  { path: '/street-lights/categories/pole-conditions', title: 'Tình trạng cột' },
  { path: '/street-lights/categories/wire-conditions', title: 'Tình trạng dây' },
  { path: '/street-lights/categories/safety-levels', title: 'Mức an toàn' },
  { path: '/street-lights/plans', title: 'Kế hoạch bảo trì' },
  { path: '/street-lights/work-orders', title: 'Phiếu công việc' },
  { path: '/street-lights/work-logs', title: 'Nhật ký thi công' },
  { path: '/street-lights/acceptance', title: 'Nghiệm thu' },
  { path: '/street-lights/reports/areas', title: 'Theo khu vực' },
  { path: '/street-lights/reports/incidents', title: 'Sự cố' },
  { path: '/street-lights/reports/work-orders', title: 'Phiếu công việc' },
  { path: '/street-lights/reports/unit-performance', title: 'Hiệu suất đơn vị' },
];

function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="w-full">
            <Routes>
              <Route path="/" element={<Navigate to="/street-lights/dashboard" replace />} />
              <Route path="/khu-vuc" element={<KhuVuc />} />
              <Route path="/ho-gia-dinh" element={<HoGiaDinh />} />
              <Route path="/nhan-khau" element={<NhanKhau />} />
              <Route path="/ha-tang" element={<TaiNguyenHaTang />} /> {/* 2. Bổ sung kích hoạt đường dẫn bản đồ */}
              <Route path="/bao-cao" element={<BaoCaoVanDe />} />
              <Route path="/smart-city/dashboard" element={<Dashboard />} />
              <Route path="/street-lights/dashboard" element={<StreetLightDashboard />} />
              <Route path="/street-lights/map" element={<StreetLightMap />} />
              <Route path="/street-lights/assets" element={<StreetLightAssets />} />
              <Route path="/street-lights/device-types" element={<StreetLightDeviceTypes />} />
              {streetLightPlaceholderRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<StreetLightPlaceholder title={route.title} />}
                />
              ))}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
