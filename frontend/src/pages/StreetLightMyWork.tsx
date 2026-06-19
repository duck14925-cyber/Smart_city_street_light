import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyWorkItems, type MyWorkItem } from '../api/streetLightApi';

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Mới':
    case 'Lập kế hoạch':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'Đang thực hiện':
    case 'Đang xử lý':
      return 'bg-orange-50 text-orange-700 ring-orange-200';
    case 'Hoàn thành':
    case 'Đã giải quyết':
    case 'Đã đóng':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'Hủy':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case 'Thấp':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    case 'Trung bình':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'Cao':
      return 'bg-orange-50 text-orange-700 ring-orange-200';
    case 'Rất cấp tính':
    case 'Nguy hiểm':
    case 'Rất nguy hiểm':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'An toàn':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'Cần theo dõi':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
};

const StreetLightMyWork = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyWorkItems();
      setItems(data);
    } catch (err) {
      console.error('Chi tiết lỗi khi tải công việc:', err);
      setError('Không thể tải danh sách công việc.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = !filterType || item.type === filterType;
      const matchStatus = !filterStatus || item.status === filterStatus;
      return matchQuery && matchType && matchStatus;
    });
  }, [items, searchQuery, filterType, filterStatus]);

  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type))), [items]);
  const statuses = useMemo(() => Array.from(new Set(items.map((i) => i.status).filter(Boolean))), [items]);

  const total = items.length;
  const inProgress = items.filter(
    (i) => i.status === 'Đang thực hiện' || i.status === 'Đang xử lý'
  ).length;
  const completed = items.filter(
    (i) => i.status === 'Hoàn thành' || i.status === 'Đã giải quyết' || i.status === 'Đã đóng'
  ).length;
  // Giả lập tính quá hạn
  const today = new Date().toISOString().split('T')[0];
  const overdue = items.filter(
    (i) => i.due_date && i.due_date < today && i.status !== 'Hoàn thành' && i.status !== 'Đã giải quyết' && i.status !== 'Đã đóng'
  ).length;

  return (
    <div className="-m-6 min-h-full bg-slate-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Công việc của tôi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý các phiếu công việc, kiểm tra, kế hoạch và sự cố được giao
            </p>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Tổng việc</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{total}</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-orange-700">Đang xử lý</p>
                <p className="mt-2 text-3xl font-bold text-orange-900">{inProgress}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-red-700">Quá hạn</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{overdue}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-700">Hoàn thành</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{completed}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <input
                    type="text"
                    placeholder="Tìm theo tiêu đề hoặc mã..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:w-64 sm:text-sm"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                  >
                    <option value="">Tất cả loại việc</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                  >
                    <option value="">Tất cả trạng thái</option>
                    {statuses.map((s) => (
                      <option key={s} value={s as string}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
              ) : items.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">Không có công việc</h3>
                  <p className="mt-1 text-sm text-slate-500">Chưa có công việc nào được giao</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy công việc nào phù hợp với bộ lọc.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Loại / Mã</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Tiêu đề</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Tài sản / Khu vực</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Độ ưu tiên</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Trạng thái</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Hạn/Ngày</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredItems.map((item) => (
                        <tr key={`${item.type}-${item.reference_name}`} className="hover:bg-slate-50 hover:cursor-pointer" onClick={() => navigate(item.action_url)}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <div className="font-medium text-slate-900">{item.type}</div>
                            <div className="text-slate-500">{item.reference_name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900 max-w-xs truncate" title={item.title}>
                            {item.title}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {item.ma_tai_san ? (
                              <>
                                <div className="font-medium text-slate-900">{item.ma_tai_san}</div>
                                <div className="text-slate-500">{item.khu_vuc}</div>
                              </>
                            ) : (
                              <div className="text-slate-500">{item.khu_vuc || '-'}</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {item.priority ? (
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getPriorityBadgeClass(
                                  item.priority
                                )}`}
                              >
                                {item.priority}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {item.status ? (
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClass(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {item.due_date || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(item.action_url);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Mở
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StreetLightMyWork;
