import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
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
import StreetLightIncidents from './pages/StreetLightIncidents';
import StreetLightIncidentNew from './pages/StreetLightIncidentNew';
import StreetLightInspections from './pages/StreetLightInspections';
import StreetLightMaintenancePlans from './pages/StreetLightMaintenancePlans';
import StreetLightWorkOrders from './pages/StreetLightWorkOrders';
import StreetLightWorkLogs from './pages/StreetLightWorkLogs';
import StreetLightAcceptance from './pages/StreetLightAcceptance';
import StreetLightReportsArea from './pages/StreetLightReportsArea';
import StreetLightReportsIncidents from './pages/StreetLightReportsIncidents';
import StreetLightReportsWorkOrders from './pages/StreetLightReportsWorkOrders';
import StreetLightReportsUnitPerformance from './pages/StreetLightReportsUnitPerformance';
import StreetLightMyWork from './pages/StreetLightMyWork';
import StreetLightNotifications from './pages/StreetLightNotifications';
import StreetLightCategoryPage from './pages/StreetLightCategoryPage';

function App() {
  const location = useLocation();
  const isMapRoute = location.pathname === '/street-lights/map';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className={`flex-1 ${isMapRoute ? 'overflow-hidden p-0 flex flex-col' : 'overflow-auto p-6 md:p-8'}`}>
          <div className={`w-full ${isMapRoute ? 'flex-1 h-full flex flex-col' : ''}`}>
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
              <Route path="/street-lights/incidents" element={<StreetLightIncidents />} />
              <Route path="/street-lights/incidents/new" element={<StreetLightIncidentNew />} />
              <Route path="/street-lights/inspections" element={<StreetLightInspections />} />
              <Route path="/street-lights/plans" element={<StreetLightMaintenancePlans />} />
              <Route path="/street-lights/work-orders" element={<StreetLightWorkOrders />} />
              <Route path="/street-lights/work-logs" element={<StreetLightWorkLogs />} />
              <Route path="/street-lights/acceptance" element={<StreetLightAcceptance />} />
              <Route path="/street-lights/reports/areas" element={<StreetLightReportsArea />} />
              <Route path="/street-lights/reports/incidents" element={<StreetLightReportsIncidents />} />
              <Route path="/street-lights/reports/work-orders" element={<StreetLightReportsWorkOrders />} />
              <Route path="/street-lights/reports/unit-performance" element={<StreetLightReportsUnitPerformance />} />
              
              <Route path="/street-lights/my-work" element={<StreetLightMyWork />} />
              <Route path="/street-lights/notifications" element={<StreetLightNotifications />} />
              <Route path="/street-lights/categories/severity" element={<StreetLightCategoryPage categoryKey="severity" title="Mức độ sự cố" description="Quản lý các mức độ nghiêm trọng của sự cố" />} />
              <Route path="/street-lights/categories/report-sources" element={<StreetLightCategoryPage categoryKey="report_sources" title="Nguồn báo cáo" description="Các kênh tiếp nhận phản ánh sự cố" />} />
              <Route path="/street-lights/categories/fault-types" element={<StreetLightCategoryPage categoryKey="fault_types" title="Loại sự cố" description="Phân loại các sự cố thường gặp" />} />
              <Route path="/street-lights/categories/electrical-conditions" element={<StreetLightCategoryPage categoryKey="electrical_conditions" title="Tình trạng điện" description="Các trạng thái về nguồn điện" />} />
              <Route path="/street-lights/categories/pole-conditions" element={<StreetLightCategoryPage categoryKey="pole_conditions" title="Tình trạng cột" description="Tình trạng vật lý của cột đèn" />} />
              <Route path="/street-lights/categories/wire-conditions" element={<StreetLightCategoryPage categoryKey="wire_conditions" title="Tình trạng dây" description="Tình trạng dây dẫn và cáp ngầm" />} />
              <Route path="/street-lights/categories/safety-levels" element={<StreetLightCategoryPage categoryKey="safety_levels" title="Mức an toàn" description="Đánh giá mức độ an toàn" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
