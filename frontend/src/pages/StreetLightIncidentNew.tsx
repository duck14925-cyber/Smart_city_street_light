import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createStreetLightIncident,
  getStreetLights,
  type StreetLightRecord,
} from '../api/streetLightApi';

const PRIORITY_OPTIONS = ['Thấp', 'Trung bình', 'Cao', 'Rất cấp tính'];

interface IncidentForm {
  tieu_de: string;
  lightName: string;
  ma_tai_san: string;
  route_name: string;
  khu_vuc: string;
  latitude: string;
  longitude: string;
  muc_do_uu_tien: string;
  mo_ta_chi_tiet: string;
  nguoi_bao_cao: string;
  sdt_lien_he: string;
}

const initialForm: IncidentForm = {
  tieu_de: '',
  lightName: '',
  ma_tai_san: '',
  route_name: '',
  khu_vuc: '',
  latitude: '',
  longitude: '',
  muc_do_uu_tien: 'Trung bình',
  mo_ta_chi_tiet: '',
  nguoi_bao_cao: '',
  sdt_lien_he: '',
};

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100';

const StreetLightIncidentNew = () => {
  const navigate = useNavigate();
  const [lights, setLights] = useState<StreetLightRecord[]>([]);
  const [form, setForm] = useState<IncidentForm>(initialForm);
  const [loadingLights, setLoadingLights] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLights = async () => {
      setLoadingLights(true);
      try {
        const data = await getStreetLights({ limit: 500 });
        setLights(data);
      } catch {
        setLights([]);
      } finally {
        setLoadingLights(false);
      }
    };

    loadLights();
  }, []);

  const selectedLight = useMemo(
    () => lights.find((light) => light.name === form.lightName || light.ma_tai_san === form.ma_tai_san),
    [form.lightName, form.ma_tai_san, lights]
  );

  const updateForm = (field: keyof IncidentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectLight = (name: string) => {
    const light = lights.find((item) => item.name === name);
    if (!light) {
      setForm((current) => ({ ...current, lightName: name }));
      return;
    }

    setForm((current) => ({
      ...current,
      lightName: light.name,
      ma_tai_san: light.ma_tai_san,
      route_name: light.route_name || '',
      khu_vuc: light.khu_vuc || '',
      latitude: light.latitude === null ? '' : String(light.latitude),
      longitude: light.longitude === null ? '' : String(light.longitude),
      tieu_de: current.tieu_de || `Báo hỏng đèn đường ${light.ma_tai_san}`,
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.tieu_de.trim()) {
      setError('Vui lòng nhập tiêu đề sự cố.');
      return;
    }
    if (!form.khu_vuc) {
      setError('Vui lòng chọn đèn hoặc nhập khu vực.');
      return;
    }
    if (!form.mo_ta_chi_tiet.trim()) {
      setError('Vui lòng nhập mô tả chi tiết.');
      return;
    }
    if (!form.nguoi_bao_cao.trim()) {
      setError('Vui lòng nhập người báo cáo.');
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Tọa độ latitude/longitude không hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      await createStreetLightIncident({
        tieu_de: form.tieu_de.trim(),
        street_light: form.lightName,
        ma_tai_san: form.ma_tai_san,
        route_name: form.route_name,
        khu_vuc: form.khu_vuc,
        latitude,
        longitude,
        muc_do_uu_tien: form.muc_do_uu_tien,
        mo_ta_chi_tiet: form.mo_ta_chi_tiet.trim(),
        nguoi_bao_cao: form.nguoi_bao_cao.trim(),
        sdt_lien_he: form.sdt_lien_he.trim(),
      });
      navigate('/street-lights/incidents', {
        replace: true,
        state: { notice: 'Đã tạo báo cáo sự cố đèn đường mới.' },
      });
    } catch {
      setError('Không thể tạo báo cáo sự cố. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-red-50 to-orange-50 p-6 md:-m-8 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-white/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-red-50 to-orange-50 px-6 py-6">
            <div className="mb-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-700">
              Báo cáo sự cố mới
            </div>
            <h1 className="text-3xl font-black text-slate-950">Báo cáo sự cố đèn đường</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Chọn thiết bị đèn để tự điền tuyến, khu vực và tọa độ trước khi gửi phản ánh.
            </p>
          </div>

          <div className="space-y-5 p-6">
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tiêu đề
                </span>
                <input value={form.tieu_de} onChange={(event) => updateForm('tieu_de', event.target.value)} className={inputClass} placeholder="VD: Báo hỏng đèn đường DEN-0001" />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Chọn đèn
                </span>
                <select value={form.lightName} onChange={(event) => handleSelectLight(event.target.value)} className={inputClass}>
                  <option value="">{loadingLights ? 'Đang tải danh sách đèn...' : 'Chọn đèn từ danh sách'}</option>
                  {lights.map((light) => (
                    <option key={light.name} value={light.name}>
                      {light.ma_tai_san} - {light.ten_tai_san}
                    </option>
                  ))}
                </select>
              </label>

              {[
                ['ma_tai_san', 'Mã đèn'],
                ['route_name', 'Tuyến đường'],
                ['khu_vuc', 'Khu vực'],
                ['latitude', 'Latitude'],
                ['longitude', 'Longitude'],
              ].map(([field, label]) => (
                <label key={field}>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </span>
                  <input
                    value={form[field as keyof IncidentForm]}
                    onChange={(event) => updateForm(field as keyof IncidentForm, event.target.value)}
                    className={inputClass}
                    readOnly={field !== 'khu_vuc' && Boolean(selectedLight)}
                  />
                </label>
              ))}

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Mức ưu tiên
                </span>
                <select value={form.muc_do_uu_tien} onChange={(event) => updateForm('muc_do_uu_tien', event.target.value)} className={inputClass}>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Người báo cáo
                </span>
                <input value={form.nguoi_bao_cao} onChange={(event) => updateForm('nguoi_bao_cao', event.target.value)} className={inputClass} placeholder="Họ tên người báo" />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  SĐT liên hệ
                </span>
                <input value={form.sdt_lien_he} onChange={(event) => updateForm('sdt_lien_he', event.target.value)} className={inputClass} placeholder="Số điện thoại" />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Mô tả chi tiết
                </span>
                <textarea value={form.mo_ta_chi_tiet} onChange={(event) => updateForm('mo_ta_chi_tiet', event.target.value)} rows={5} className={inputClass} placeholder="Mô tả hiện trạng: đèn không sáng, nhấp nháy, gãy cột..." />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/street-lights/incidents" className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">
                Hủy
              </Link>
              <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Lưu báo cáo'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StreetLightIncidentNew;
