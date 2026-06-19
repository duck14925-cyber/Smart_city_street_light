import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStreetLightNotifications, type StreetLightNotification } from '../api/streetLightApi';

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error':
      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">🚨</div>;
    case 'warning':
      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">⚠️</div>;
    case 'success':
      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✅</div>;
    case 'info':
    default:
      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">ℹ️</div>;
  }
};

const StreetLightNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<StreetLightNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStreetLightNotifications();
      setNotifications(data);
    } catch {
      setError('Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return notifications.filter((item) => {
      const matchType = !filterType || item.type === filterType;
      const matchLevel = !filterLevel || item.level === filterLevel;
      return matchType && matchLevel;
    });
  }, [notifications, filterType, filterLevel]);

  const types = useMemo(() => Array.from(new Set(notifications.map((i) => i.type))), [notifications]);

  const total = notifications.length;
  const warnings = notifications.filter((i) => i.level === 'warning' || i.level === 'error').length;
  const incidents = notifications.filter((i) => i.type === 'Sự cố').length;
  const works = notifications.filter((i) => i.type === 'Công việc' || i.type === 'Nghiệm thu').length;

  return (
    <div className="-m-6 min-h-full bg-slate-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Thông báo</h1>
            <p className="mt-1 text-sm text-slate-500">Cập nhật sự kiện, sự cố và công việc mới nhất</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            ↻ Làm mới
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Lỗi</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Tất cả</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{total}</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-orange-700">Cảnh báo</p>
                <p className="mt-1 text-2xl font-bold text-orange-900">{warnings}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-red-700">Sự cố</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{incidents}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-blue-700">Công việc</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{works}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 p-4 sm:flex sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:w-48 sm:text-sm"
                  >
                    <option value="">Tất cả phân loại</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:w-48 sm:text-sm"
                  >
                    <option value="">Tất cả mức độ</option>
                    <option value="info">Thông tin</option>
                    <option value="warning">Cảnh báo</option>
                    <option value="error">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Đang tải thông báo...</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Không có thông báo nào.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <li
                      key={item.id}
                      className={`relative flex items-start gap-4 p-4 hover:bg-slate-50 ${
                        !item.is_read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {getLevelIcon(item.level)}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <p className={`text-sm font-semibold text-slate-900 ${!item.is_read ? 'font-bold' : ''}`}>
                            {item.title}
                          </p>
                          <span className="mt-1 whitespace-nowrap text-xs text-slate-500 sm:mt-0">
                            {item.created_at}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {item.type}
                          </span>
                          <button
                            onClick={() => navigate(item.action_url)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Xem chi tiết &rarr;
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StreetLightNotifications;
