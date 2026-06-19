import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'QUẢN LÝ ĐÈN ĐƯỜNG',
    items: [
      { name: 'Dashboard đèn đường', path: '/street-lights/dashboard', icon: '💡' },
      { name: 'Bản đồ GIS', path: '/street-lights/map', icon: '🗺️' },
      { name: 'Công việc của tôi', path: '/street-lights/my-work', icon: '🛠️' },
      { name: 'Thông báo', path: '/street-lights/notifications', icon: '🔔' },
    ],
  },
  {
    title: 'TÀI SẢN ĐIỆN & CHIẾU SÁNG',
    items: [
      { name: 'Danh sách thiết bị', path: '/street-lights/assets', icon: '🏙️' },
      { name: 'Loại thiết bị', path: '/street-lights/device-types', icon: '🏷️' },
    ],
  },
  {
    title: 'SỰ CỐ & PHẢN ÁNH',
    items: [
      { name: 'Báo cáo sự cố mới', path: '/street-lights/incidents/new', icon: '➕' },
      { name: 'Danh sách sự cố', path: '/street-lights/incidents', icon: '🚨' },
      { name: 'Mức độ sự cố', path: '/street-lights/categories/severity', icon: '📌' },
      { name: 'Nguồn báo cáo', path: '/street-lights/categories/report-sources', icon: '📣' },
      { name: 'Loại sự cố', path: '/street-lights/categories/fault-types', icon: '⚠️' },
    ],
  },
  {
    title: 'KIỂM TRA KỸ THUẬT',
    items: [
      { name: 'Phiếu kiểm tra', path: '/street-lights/inspections', icon: '✅' },
      { name: 'Tình trạng điện', path: '/street-lights/categories/electrical-conditions', icon: '⚡' },
      { name: 'Tình trạng cột', path: '/street-lights/categories/pole-conditions', icon: '🗼' },
      { name: 'Tình trạng dây', path: '/street-lights/categories/wire-conditions', icon: '〰️' },
      { name: 'Mức an toàn', path: '/street-lights/categories/safety-levels', icon: '🛡️' },
    ],
  },
  {
    title: 'KẾ HOẠCH & THI CÔNG',
    items: [
      { name: 'Kế hoạch bảo trì', path: '/street-lights/plans', icon: '🗓️' },
      { name: 'Phiếu công việc', path: '/street-lights/work-orders', icon: '📋' },
      { name: 'Nhật ký thi công', path: '/street-lights/work-logs', icon: '🧰' },
      { name: 'Nghiệm thu', path: '/street-lights/acceptance', icon: '🎯' },
    ],
  },
  {
    title: 'THỐNG KÊ & BÁO CÁO',
    items: [
      { name: 'Theo khu vực', path: '/street-lights/reports/areas', icon: '📊' },
      { name: 'Sự cố', path: '/street-lights/reports/incidents', icon: '📈' },
      { name: 'Phiếu công việc', path: '/street-lights/reports/work-orders', icon: '📑' },
      { name: 'Hiệu suất đơn vị', path: '/street-lights/reports/unit-performance', icon: '🏅' },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (location.pathname === '/street-lights/map') {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [location.pathname]);

  return (
    <aside className={`hidden shrink-0 flex-col border-r border-slate-700/80 bg-slate-900 text-slate-100 shadow-xl md:flex transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-700/80 px-5 relative overflow-hidden">
        <div className="flex items-center gap-3 w-full">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-xl shadow-lg shadow-blue-950/40">
            💡
          </div>
          <div className={`min-w-0 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto flex-1'}`}>
            <h1 className="truncate text-base font-bold leading-tight text-white">Cấp điện & Chiếu sáng</h1>
            <p className="mt-0.5 text-xs font-medium text-slate-400">Quản lý đèn đường</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-5">
            {!isCollapsed ? (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                {group.title}
              </p>
            ) : (
              <div className="h-6 mb-2 border-b border-slate-800/50 mx-3"></div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="flex shrink-0 h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-base">
                        {item.icon}
                      </span>
                      <span className={`truncate transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700/80 p-4 shrink-0 overflow-hidden">
        <div 
          className={`flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition-colors ${isCollapsed ? 'bg-transparent hover:bg-slate-800/80 justify-center' : 'bg-slate-800/80 hover:bg-slate-700/80'}`}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-white shadow-sm">
            {isCollapsed ? '>>' : 'AD'}
          </div>
          <div className={`min-w-0 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
            <p className="truncate text-sm font-bold text-white">Administrator</p>
            <p className="text-xs text-slate-400">Thu gọn menu ⇥</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
