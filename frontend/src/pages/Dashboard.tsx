import { useState, useEffect } from 'react';
import { frappeGetCount } from '../api/axios';

interface StatCard {
  title: string;
  icon: string;
  gradient: string;
  value: number | null;
}

const Dashboard = () => {
  const [stats, setStats] = useState<StatCard[]>([
    { title: 'Khu vực', icon: '🗺️', gradient: 'from-blue-500 to-blue-600', value: null },
    { title: 'Hộ gia đình', icon: '🏠', gradient: 'from-emerald-500 to-emerald-600', value: null },
    { title: 'Nhân khẩu', icon: '👤', gradient: 'from-violet-500 to-violet-600', value: null },
    { title: 'Sự kiện dân cư', icon: '📋', gradient: 'from-amber-500 to-amber-600', value: null },
    { title: 'Hạ tầng', icon: '🏗️', gradient: 'from-cyan-500 to-cyan-600', value: null },
    { title: 'Báo cáo vấn đề', icon: '⚠️', gradient: 'from-rose-500 to-rose-600', value: null },
  ]);

  useEffect(() => {
    const doctypes = ['Khu Vuc', 'Ho Gia Dinh', 'Nhan Khau', 'Su Kien Dan Cu', 'Tai Nguyen Ha Tang', 'Bao Cao Van De'];
    Promise.all(doctypes.map((dt) => frappeGetCount(dt))).then((counts) => {
      setStats((prev) =>
        prev.map((s, i) => ({ ...s, value: counts[i] }))
      );
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bảng điều khiển quản lý đô thị thông minh</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl text-white shadow-lg`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{card.title}</p>
              {card.value === null ? (
                <div className="mt-1 w-12 h-7 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold mt-0.5">{card.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Thêm nhân khẩu', icon: '➕👤', href: '/nhan-khau' },
              { label: 'Thêm hộ gia đình', icon: '➕🏠', href: '/ho-gia-dinh' },
              { label: 'Báo cáo vấn đề', icon: '📝', href: '/bao-cao' },
              { label: 'Thêm khu vực', icon: '➕🗺️', href: '/khu-vuc' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span>{action.icon}</span> {action.label}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Hoạt động gần đây</h2>
          <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
