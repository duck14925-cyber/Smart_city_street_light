import { useState, useEffect } from 'react';
import { frappeGet, frappeCreate } from '../api/axios';

interface BaoCao {
  name: string;
  tieu_de: string;
  loai_van_de: string;
  khu_vuc: string;
  mo_ta_chi_tiet: string;
  muc_do_uu_tien: string;
  nguoi_bao_cao: string;
  sdt_lien_he: string;
  trang_thai: string;
}

const priorityColors: Record<string, string> = {
  'Thấp': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'Trung bình': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Cao': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Rất cấp tính': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  'Mới': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Đang xử lý': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Đã giải quyết': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Đã đóng': 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const defaultForm = {
  tieu_de: '', loai_van_de: 'Vệ sinh môi trường', khu_vuc: '',
  mo_ta_chi_tiet: '', muc_do_uu_tien: 'Trung bình',
  nguoi_bao_cao: '', sdt_lien_he: '', trang_thai: 'Mới',
};

const BaoCaoVanDe = () => {
  const [items, setItems] = useState<BaoCao[]>([]);
  const [khuVucs, setKhuVucs] = useState<{ name: string; ten_khu_vuc: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, kvs] = await Promise.all([
      frappeGet<BaoCao>('Bao Cao Van De'),
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
      await frappeCreate('Bao Cao Van De', form);
      setShowForm(false);
      setForm(defaultForm);
      load();
    } catch (err: any) {
      alert(err?.response?.data?._server_messages || 'Lỗi tạo báo cáo');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo Vấn đề</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tiếp nhận và theo dõi các vấn đề đô thị</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm">
          ➕ Tạo báo cáo
        </button>
      </div>

      {/* Cards list */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500">Chưa có báo cáo vấn đề nào.</div>
        ) : items.map((item) => (
          <div key={item.name} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${priorityColors[item.muc_do_uu_tien] || ''}`}>{item.muc_do_uu_tien}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{item.loai_van_de}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{item.khu_vuc}</span>
                </div>
                <h3 className="font-semibold text-base">{item.tieu_de}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.mo_ta_chi_tiet }} />
                <p className="text-xs text-slate-400 mt-2">👤 {item.nguoi_bao_cao} {item.sdt_lien_he ? `• 📞 ${item.sdt_lien_he}` : ''}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[item.trang_thai] || ''}`}>{item.trang_thai}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-bold">Tạo báo cáo vấn đề</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input required value={form.tieu_de} onChange={e => setForm({...form, tieu_de: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại vấn đề <span className="text-red-500">*</span></label>
                  <select required value={form.loai_van_de} onChange={e => setForm({...form, loai_van_de: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    {['Vệ sinh môi trường','An toàn giao thông','Cây xanh hư hỏng','Đèn đường hỏng','Ngập nước','Tiếng ồn','Khác'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Khu vực <span className="text-red-500">*</span></label>
                  <select required value={form.khu_vuc} onChange={e => setForm({...form, khu_vuc: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    <option value="">-- Chọn khu vực --</option>
                    {khuVucs.map(kv => <option key={kv.name} value={kv.name}>{kv.ten_khu_vuc}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả chi tiết <span className="text-red-500">*</span></label>
                <textarea required rows={4} value={form.mo_ta_chi_tiet} onChange={e => setForm({...form, mo_ta_chi_tiet: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mức độ ưu tiên</label>
                  <select value={form.muc_do_uu_tien} onChange={e => setForm({...form, muc_do_uu_tien: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    {['Thấp','Trung bình','Cao','Rất cấp tính'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select value={form.trang_thai} onChange={e => setForm({...form, trang_thai: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm">
                    {['Mới','Đang xử lý','Đã giải quyết','Đã đóng'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Người báo cáo <span className="text-red-500">*</span></label>
                  <input required value={form.nguoi_bao_cao} onChange={e => setForm({...form, nguoi_bao_cao: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SĐT liên hệ</label>
                  <input value={form.sdt_lien_he} onChange={e => setForm({...form, sdt_lien_he: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 text-sm" />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm">{saving ? 'Đang lưu...' : 'Gửi báo cáo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaoCaoVanDe;
