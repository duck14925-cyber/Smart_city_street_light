import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStreetLightCategories, type StreetLightCategoryItem, type StreetLightCategoriesData } from '../api/streetLightApi';

interface StreetLightCategoryPageProps {
  categoryKey: keyof StreetLightCategoriesData;
  title: string;
  description: string;
}

const StreetLightCategoryPage = ({ categoryKey, title, description }: StreetLightCategoryPageProps) => {
  const [items, setItems] = useState<StreetLightCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStreetLightCategories();
      setItems(data[categoryKey] || []);
    } catch {
      setError('Không thể tải dữ liệu danh mục.');
    } finally {
      setLoading(false);
    }
  }, [categoryKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  return (
    <div className="-m-6 min-h-full bg-slate-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full max-w-md rounded-xl border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Đang tải danh mục...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy kết quả nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Mã (Code)</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Tên hiển thị</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Mô tả</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500">Đang sử dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredItems.map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-500">
                          {item.code}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${
                              item.color || 'bg-slate-50 text-slate-700 ring-slate-200'
                            }`}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={item.description}>
                          {item.description || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-slate-900">
                          {item.usage_count ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700">
                              {item.usage_count}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreetLightCategoryPage;
