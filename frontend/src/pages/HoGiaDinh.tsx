import { useState, useEffect } from 'react';
import { frappeGet, frappeCreate } from '../api/axios';

interface HoGiaDinh {
  name: string;
  ma_ho: string;
  chu_ho: string;
  khu_vuc: string;
  dia_chi: string;
  so_dien_thoai: string;
  email: string;
  tong_nhan_khau: number;
  trang_thai: string;
}

const statusColors: Record<string, string> = {
  'Hoạt động': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Bỏ trống': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Hủy bỏ': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const defaultForm = { ma_ho: '', chu_ho: '', khu_vuc: '', dia_chi: '', so_dien_thoai: '', email: '', tong_nhan_khau: 0, trang_thai: 'Hoạt động' };

const HoGiaDinh = () => {
  const [items, setItems] = useState<HoGiaDinh[]>([]);
  const [khuVucs, setKhuVucs] = useState<{ name: string; ten_khu_vuc: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, kvs] = await Promise.all([
      frappeGet<HoGiaDinh>('Ho Gia Dinh'),
      frappeGet<{ name: string; ten_khu_vuc: string }>('Khu Vuc', { fields: ['name', 'ten_khu_vuc'] }),
    ]);
    setItems(data);
    setKhuVucs(kvs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await frappeCreate('Ho Gia Dinh', form);
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (err: any) {
      alert(err?.response?.data?._server_messages || 'Lỗi tạo hộ gia đình');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Hộ gia đình</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Danh sách hộ gia đình đăng ký cư trú</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
          ➕ Thêm hộ gia đình
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4">Mã hộ</th>
                <th className="p-4">Chủ hộ</th>
                <th className="p-4">Khu vực</th>
                <th className="p-4">Địa chỉ</th>
                <th className="p-4">Nhân khẩu</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có hộ gia đình nào.</td></tr>
              ) : items.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-mono text-sm">{item.ma_ho}</td>
                  <td className="p-4 font-medium">{item.chu_ho}</td>
                  <td className="p-4 text-sm">{item.khu_vuc}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{item.dia_chi}</td>
                  <td className="p-4 text-sm text-center">{item.tong_nhan_khau ?? 0}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.trang_thai] || ''}`}>{item.trang_thai}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-bold">Thêm hộ gia đình</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã hộ <span className="text-red-500">*</span></label>
                  <input required value={form.ma_ho} onChange={e => setForm({...form, ma_ho: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chủ hộ <span className="text-red-500">*</span></label>
                  <input required value={form.chu_ho} onChange={e => setForm({...form, chu_ho: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Khu vực <span className="text-red-500">*</span></label>
                <select required value={form.khu_vuc} onChange={e => setForm({...form, khu_vuc: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                  <option value="">-- Chọn khu vực --</option>
                  {khuVucs.map(kv => <option key={kv.name} value={kv.name}>{kv.ten_khu_vuc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ <span className="text-red-500">*</span></label>
                <input required value={form.dia_chi} onChange={e => setForm({...form, dia_chi: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                  <input value={form.so_dien_thoai} onChange={e => setForm({...form, so_dien_thoai: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tổng nhân khẩu</label>
                  <input type="number" value={form.tong_nhan_khau} onChange={e => setForm({...form, tong_nhan_khau: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select value={form.trang_thai} onChange={e => setForm({...form, trang_thai: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    <option>Hoạt động</option>
                    <option>Bỏ trống</option>
                    <option>Hủy bỏ</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm">{saving ? 'Đang lưu...' : 'Lưu hộ gia đình'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoGiaDinh;
