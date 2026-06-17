import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getStreetLightDashboard,
  type StreetLightChartItem,
  type StreetLightDashboardData,
} from '../api/streetLightApi';

const numberFormatter = new Intl.NumberFormat('vi-VN');

const statusBadgeColors: Record<string, string> = {
  'Hoạt động': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Hỏng': 'bg-red-50 text-red-700 ring-red-200',
  'Bảo trì': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Mới': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Đang xử lý': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Đã giải quyết': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Đã đóng': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Thấp': 'bg-slate-50 text-slate-700 ring-slate-200',
  'Trung bình': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Cao': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Rất cấp tính': 'bg-red-50 text-red-700 ring-red-200',
};

const barColors: Record<string, string> = {
  'Hoạt động': 'bg-emerald-500',
  'Hỏng': 'bg-red-500',
  'Bảo trì': 'bg-amber-500',
  'Mới': 'bg-blue-500',
  'Đang xử lý': 'bg-orange-500',
  'Đã giải quyết': 'bg-emerald-500',
  'Đã đóng': 'bg-teal-500',
  'Thấp': 'bg-slate-500',
  'Trung bình': 'bg-blue-500',
  'Cao': 'bg-orange-500',
  'Rất cấp tính': 'bg-red-500',
};

const fallbackBarColors = ['bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-sky-500'];

const getBadgeColor = (label: string) =>
  statusBadgeColors[label] ?? 'bg-slate-50 text-slate-700 ring-slate-200';

const getBarColor = (label: string, index: number) =>
  barColors[label] ?? fallbackBarColors[index % fallbackBarColors.length];

const formatNumber = (value: number) => numberFormatter.format(value);

const StatSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
        <div className="h-9 w-20 rounded bg-slate-200 animate-pulse" />
        <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="h-12 w-12 rounded-2xl bg-slate-100 animate-pulse" />
    </div>
  </div>
);

const PanelSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-6 flex items-center justify-between">
      <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
      <div className="h-6 w-14 rounded-full bg-slate-100 animate-pulse" />
    </div>
    <div className="space-y-5">
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-10 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="h-3 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  colorClass: string;
}

const StatCard = ({ title, value, subtitle, icon, colorClass }: StatCardProps) => (
  <div className="group rounded-2xl border border-white/80 bg-white p-5 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{formatNumber(value)}</p>
        <p className="mt-2 text-xs font-medium text-slate-400">{subtitle}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white shadow-sm ${colorClass}`}>
        {icon}
      </div>
    </div>
  </div>
);

interface AnalysisPanelProps {
  title: string;
  icon: string;
  items: StreetLightChartItem[];
  emptyText: string;
}

const AnalysisPanel = ({ title, icon, items, emptyText }: AnalysisPanelProps) => {
  const total = items.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
  const maxValue = Math.max(...items.map((item) => Number(item.value ?? 0)), 0);

  return (
    <section className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="text-xs font-medium text-slate-400">Tổng {formatNumber(total)}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {items.length} nhóm
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const value = Number(item.value ?? 0);
            const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 6 : 0) : 0;

            return (
              <div key={`${item.label}-${item.khu_vuc ?? index}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getBadgeColor(item.label)}`}>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.khu_vuc ? (
                      <span className="ml-2 text-xs font-medium text-slate-400">{item.khu_vuc}</span>
                    ) : null}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{formatNumber(value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${getBarColor(item.label, index)} transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const StreetLightDashboard = () => {
  const [dashboard, setDashboard] = useState<StreetLightDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await getStreetLightDashboard();
      setDashboard(data);
      setLastUpdated(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      setError('Không thể tải dữ liệu dashboard đèn đường. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        title: 'Tổng số đèn',
        value: dashboard.total_lights,
        subtitle: 'Thiết bị đang quản lý',
        icon: '💡',
        colorClass: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      },
      {
        title: 'Đèn hoạt động',
        value: dashboard.active_lights,
        subtitle: 'Vận hành bình thường',
        icon: '✓',
        colorClass: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      },
      {
        title: 'Đèn hỏng',
        value: dashboard.broken_lights,
        subtitle: 'Cần xử lý kỹ thuật',
        icon: '!',
        colorClass: 'bg-gradient-to-br from-red-500 to-rose-500',
      },
      {
        title: 'Đèn bảo trì',
        value: dashboard.maintenance_lights,
        subtitle: 'Đang trong kế hoạch',
        icon: '🔧',
        colorClass: 'bg-gradient-to-br from-amber-500 to-orange-500',
      },
      {
        title: 'Sự cố đang mở',
        value: dashboard.open_incidents,
        subtitle: 'Mới hoặc đang xử lý',
        icon: '⚠',
        colorClass: 'bg-gradient-to-br from-indigo-500 to-blue-500',
      },
      {
        title: 'Sự cố đã xử lý',
        value: dashboard.resolved_incidents,
        subtitle: 'Đã giải quyết hoặc đóng',
        icon: '✓',
        colorClass: 'bg-gradient-to-br from-sky-500 to-emerald-500',
      },
    ];
  }, [dashboard]);

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/70">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                Chiếu sáng đô thị
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard quản lý đèn đường</h1>
              <p className="mt-2 text-sm text-slate-500">
                Theo dõi vận hành hệ thống chiếu sáng đô thị theo thời gian thực
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {lastUpdated ? (
                <span className="text-xs font-medium text-slate-400">Cập nhật {lastUpdated}</span>
              ) : null}
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className={refreshing ? 'animate-spin' : ''}>↻</span>
                Làm mới
              </button>
            </div>
          </div>

          {error ? (
            <div className="px-6 py-10">
              <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-red-600 shadow-sm">
                  !
                </div>
                <h2 className="text-lg font-bold text-red-900">Không tải được dữ liệu</h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {loading
                  ? [1, 2, 3, 4, 5, 6].map((item) => <StatSkeleton key={item} />)
                  : statCards.map((card) => <StatCard key={card.title} {...card} />)}
              </div>

              <div>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Phân tích nhanh</h2>
                    <p className="mt-1 text-sm text-slate-500">Tổng hợp theo trạng thái, khu vực và mức độ ưu tiên</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {loading || !dashboard ? (
                    [1, 2, 3, 4].map((item) => <PanelSkeleton key={item} />)
                  ) : (
                    <>
                      <AnalysisPanel
                        title="Đèn theo trạng thái"
                        icon="💡"
                        items={dashboard.charts.lights_by_status}
                        emptyText="Chưa có dữ liệu trạng thái đèn."
                      />
                      <AnalysisPanel
                        title="Sự cố theo trạng thái"
                        icon="🚨"
                        items={dashboard.charts.incidents_by_status}
                        emptyText="Chưa có dữ liệu trạng thái sự cố."
                      />
                      <AnalysisPanel
                        title="Đèn theo khu vực"
                        icon="🗺️"
                        items={dashboard.charts.lights_by_area}
                        emptyText="Chưa có dữ liệu phân bổ khu vực."
                      />
                      <AnalysisPanel
                        title="Sự cố theo mức độ ưu tiên"
                        icon="⚡"
                        items={dashboard.charts.incidents_by_priority}
                        emptyText="Chưa có dữ liệu mức độ ưu tiên."
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreetLightDashboard;
