import { useState, useEffect } from 'react';
import { frappeGet, frappeCreate } from '../api/axios';

interface KhuVuc {
  name: string;
  ten_khu_vuc: string;
  ma_khu_vuc: string;
  dan_so: number;
}

const defaultForm = { ten_khu_vuc: '', ma_khu_vuc: '', dan_so: 0, ghi_chu: '' };

const KhuVuc = () => {
  const [items, setItems] = useState<KhuVuc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await frappeGet<KhuVuc>('Khu Vuc');
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await frappeCreate('Khu Vuc', form);
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (err: any) {
      alert(err?.response?.data?._server_messages || 'Lỗi tạo khu vực');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Khu vực</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Danh sách các khu vực trong đô thị</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
          ➕ Thêm khu vực
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4">Mã</th>
                <th className="p-4">Tên khu vực</th>
                <th className="p-4">Dân số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Chưa có khu vực nào.</td></tr>
              ) : items.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-mono text-sm">{item.ma_khu_vuc}</td>
                  <td className="p-4 font-medium">{item.ten_khu_vuc}</td>
                  <td className="p-4 text-sm">{item.dan_so ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Thêm khu vực mới</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên khu vực <span className="text-red-500">*</span></label>
                <input required value={form.ten_khu_vuc} onChange={e => setForm({...form, ten_khu_vuc: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã khu vực <span className="text-red-500">*</span></label>
                <input required value={form.ma_khu_vuc} onChange={e => setForm({...form, ma_khu_vuc: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dân số</label>
                <input type="number" value={form.dan_so} onChange={e => setForm({...form, dan_so: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea rows={3} value={form.ghi_chu} onChange={e => setForm({...form, ghi_chu: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm">{saving ? 'Đang lưu...' : 'Lưu khu vực'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KhuVuc;
