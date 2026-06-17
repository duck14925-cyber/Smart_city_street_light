import { useState, useEffect } from 'react';
import { frappeGet, frappeCreate } from '../api/axios';

interface NhanKhau {
  name: string;
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  cccd_cmt: string;
  ho_gia_dinh: string;
  quan_he: string;
  nghe_nghiep: string;
  trang_thai: string;
}

const statusColors: Record<string, string> = {
  'Đang sống': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Tạm cư': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Chuyển đi': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Mất': 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const defaultForm = { ho_ten: '', ngay_sinh: '', gioi_tinh: 'Nam', cccd_cmt: '', ho_gia_dinh: '', quan_he: 'Chủ hộ', nghe_nghiep: '', trang_thai: 'Đang sống' };

const NhanKhau = () => {
  const [items, setItems] = useState<NhanKhau[]>([]);
  const [hoList, setHoList] = useState<{ name: string; chu_ho: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, hos] = await Promise.all([
      frappeGet<NhanKhau>('Nhan Khau'),
      frappeGet<{ name: string; chu_ho: string }>('Ho Gia Dinh', { fields: ['name', 'chu_ho'] }),
    ]);
    setItems(data);
    setHoList(hos);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await frappeCreate('Nhan Khau', form);
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (err: any) {
      alert(err?.response?.data?._server_messages || 'Lỗi tạo nhân khẩu');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Nhân khẩu</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Danh sách cư dân đăng ký nhân khẩu</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
          ➕ Thêm nhân khẩu
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4">CCCD/CMT</th>
                <th className="p-4">Họ tên</th>
                <th className="p-4">Ngày sinh</th>
                <th className="p-4">Giới tính</th>
                <th className="p-4">Hộ gia đình</th>
                <th className="p-4">Quan hệ</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Chưa có nhân khẩu nào.</td></tr>
              ) : items.map((item) => (
                <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-mono text-sm">{item.cccd_cmt}</td>
                  <td className="p-4 font-medium">{item.ho_ten}</td>
                  <td className="p-4 text-sm">{item.ngay_sinh || '—'}</td>
                  <td className="p-4 text-sm">{item.gioi_tinh}</td>
                  <td className="p-4 text-sm">{item.ho_gia_dinh}</td>
                  <td className="p-4 text-sm">{item.quan_he}</td>
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
              <h2 className="text-lg font-bold">Thêm nhân khẩu mới</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input required value={form.ho_ten} onChange={e => setForm({...form, ho_ten: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày sinh</label>
                  <input type="date" value={form.ngay_sinh} onChange={e => setForm({...form, ngay_sinh: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Giới tính</label>
                  <select value={form.gioi_tinh} onChange={e => setForm({...form, gioi_tinh: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    <option>Nam</option>
                    <option>Nữ</option>
                    <option>Khác</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CCCD/CMT <span className="text-red-500">*</span></label>
                <input required value={form.cccd_cmt} onChange={e => setForm({...form, cccd_cmt: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hộ gia đình <span className="text-red-500">*</span></label>
                  <select required value={form.ho_gia_dinh} onChange={e => setForm({...form, ho_gia_dinh: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    <option value="">-- Chọn hộ --</option>
                    {hoList.map(h => <option key={h.name} value={h.name}>{h.name} — {h.chu_ho}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quan hệ</label>
                  <select value={form.quan_he} onChange={e => setForm({...form, quan_he: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    {['Chủ hộ','Vợ','Chồng','Con','Cha','Mẹ','Anh/Chị/Em','Khác'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nghề nghiệp</label>
                <input value={form.nghe_nghiep} onChange={e => setForm({...form, nghe_nghiep: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select value={form.trang_thai} onChange={e => setForm({...form, trang_thai: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                  {['Đang sống','Tạm cư','Chuyển đi','Mất'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm">{saving ? 'Đang lưu...' : 'Lưu nhân khẩu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NhanKhau;
