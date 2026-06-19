import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createStreetLightIncident,
  getStreetLights,
  type StreetLightRecord,
} from '../api/streetLightApi';
import StreetLightMultiPicker from '../components/street-light/StreetLightMultiPicker';

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

  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [selectedLights, setSelectedLights] = useState<StreetLightRecord[]>([]);

  const selectedLight = useMemo(
    () => (mode === 'single' && selectedLights.length === 1 ? selectedLights[0] : null),
    [mode, selectedLights]
  );

  const handleModeChange = (newMode: 'single' | 'multiple') => {
    setMode(newMode);
    setSelectedLights([]);
    setForm((current) => ({
      ...current,
      lightName: '',
      ma_tai_san: '',
      route_name: '',
      khu_vuc: '',
      latitude: '',
      longitude: '',
    }));
  };

  const updateForm = (field: keyof IncidentForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePickerChange = (selected: StreetLightRecord[]) => {
    setSelectedLights(selected);

    if (mode === 'single') {
      if (selected.length === 1) {
        const light = selected[0];
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
      } else {
        setForm((current) => ({
          ...current,
          lightName: '',
          ma_tai_san: '',
          route_name: '',
          khu_vuc: '',
          latitude: '',
          longitude: '',
        }));
      }
    } else {
      // mode === 'multiple'
      if (selected.length > 0) {
        const routesSet = new Set(selected.map((l) => l.route_name).filter(Boolean));
        const areasSet = new Set(selected.map((l) => l.khu_vuc).filter(Boolean));
        const routesList = Array.from(routesSet);
        const areasList = Array.from(areasSet);
        const firstLight = selected[0];

        setForm((current) => {
          let proposedTitle = current.tieu_de;
          if (
            !proposedTitle ||
            proposedTitle.startsWith('Sự cố nhiều đèn') ||
            proposedTitle.startsWith('Báo hỏng đèn')
          ) {
            if (routesList.length === 1) {
              proposedTitle = `Sự cố nhiều đèn trên tuyến ${routesList[0]}`;
            } else {
              proposedTitle = `Sự cố nhiều đèn tại khu vực ${firstLight.ten_khu_vuc || firstLight.khu_vuc}`;
            }
          }

          return {
            ...current,
            lightName: firstLight.name,
            ma_tai_san: firstLight.ma_tai_san,
            route_name: routesList.join(', '),
            khu_vuc: areasList.join(', '),
            latitude: firstLight.latitude === null ? '' : String(firstLight.latitude),
            longitude: firstLight.longitude === null ? '' : String(firstLight.longitude),
            tieu_de: proposedTitle,
          };
        });
      } else {
        setForm((current) => ({
          ...current,
          lightName: '',
          ma_tai_san: '',
          route_name: '',
          khu_vuc: '',
          latitude: '',
          longitude: '',
        }));
      }
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (mode === 'single') {
      if (selectedLights.length !== 1) {
        setError('Vui lòng chọn thiết bị đèn gặp sự cố.');
        return;
      }
    } else {
      if (selectedLights.length === 0) {
        setError('Vui lòng chọn ít nhất một thiết bị đèn bị ảnh hưởng.');
        return;
      }
    }

    if (!form.tieu_de.trim()) {
      setError('Vui lòng nhập tiêu đề sự cố.');
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

    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;

    if (mode === 'single') {
      latitude = Number(form.latitude);
      longitude = Number(form.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setError('Tọa độ latitude/longitude không hợp lệ.');
        return;
      }
    } else {
      if (form.latitude && form.longitude) {
        latitude = Number(form.latitude);
        longitude = Number(form.longitude);
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        tieu_de: form.tieu_de.trim(),
        street_light: mode === 'single' ? selectedLights[0].name : form.lightName,
        ma_tai_san: mode === 'single' ? selectedLights[0].ma_tai_san : form.ma_tai_san,
        route_name: form.route_name,
        khu_vuc: form.khu_vuc,
        latitude,
        longitude,
        muc_do_uu_tien: form.muc_do_uu_tien,
        mo_ta_chi_tiet: form.mo_ta_chi_tiet.trim(),
        nguoi_bao_cao: form.nguoi_bao_cao.trim(),
        sdt_lien_he: form.sdt_lien_he.trim(),
      };

      if (mode === 'multiple') {
        payload.affected_lights = selectedLights.map((light) => ({
          name: light.name,
          ma_tai_san: light.ma_tai_san,
          ten_tai_san: light.ten_tai_san,
          route_name: light.route_name,
          khu_vuc: light.khu_vuc,
          latitude: light.latitude,
          longitude: light.longitude,
        }));
      }

      await createStreetLightIncident(payload);
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

              <div className="md:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Số lượng đèn gặp sự cố
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition">
                    <input
                      type="radio"
                      name="incident_mode"
                      value="single"
                      checked={mode === 'single'}
                      onChange={() => handleModeChange('single')}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <span>Một đèn</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition">
                    <input
                      type="radio"
                      name="incident_mode"
                      value="multiple"
                      checked={mode === 'multiple'}
                      onChange={() => handleModeChange('multiple')}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <span>Nhiều đèn</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <StreetLightMultiPicker
                  lights={lights}
                  selectedLights={selectedLights}
                  onChange={handlePickerChange}
                  multiple={mode === 'multiple'}
                  label={mode === 'single' ? 'Chọn đèn' : 'Chọn danh sách đèn'}
                  placeholder={loadingLights ? 'Đang tải danh sách đèn...' : 'Nhập mã đèn, tên đèn, tuyến đường hoặc khu vực...'}
                />
              </div>

              {mode === 'single' && (
                <div className="md:col-span-2">
                  {!selectedLight ? (
                    <p className="text-xs font-semibold text-slate-400 italic">
                      Chọn thiết bị đèn để hệ thống tự điền tuyến, khu vực và tọa độ.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                          Thông tin thiết bị gặp sự cố
                        </h3>
                        <Link
                          to="/street-lights/map"
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                        >
                          <span>Xem trên bản đồ</span>
                          <span>→</span>
                        </Link>
                      </div>
                      <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 text-sm">
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mã đèn</span>
                          <span className="font-semibold text-slate-700">{selectedLight.ma_tai_san}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tên thiết bị</span>
                          <span className="font-semibold text-slate-700">{selectedLight.ten_tai_san}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tuyến đường</span>
                          <span className="font-semibold text-slate-700">{selectedLight.route_name || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Khu vực</span>
                          <span className="font-semibold text-slate-700">{selectedLight.ten_khu_vuc || selectedLight.khu_vuc}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái hiện tại</span>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            selectedLight.trang_thai === 'Hoạt động'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedLight.trang_thai === 'Hỏng'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedLight.trang_thai}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Loại thiết bị</span>
                          <span className="font-semibold text-slate-700">{selectedLight.device_type_name || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Công suất</span>
                          <span className="font-semibold text-slate-700">{selectedLight.power_w ? `${selectedLight.power_w}W` : '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Chiều cao cột</span>
                          <span className="font-semibold text-slate-700">{selectedLight.pole_height_m ? `${selectedLight.pole_height_m}m` : '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Latitude</span>
                          <span className="font-semibold text-slate-700">{selectedLight.latitude !== null ? selectedLight.latitude.toFixed(6) : '—'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Longitude</span>
                          <span className="font-semibold text-slate-700">{selectedLight.longitude !== null ? selectedLight.longitude.toFixed(6) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'multiple' && selectedLights.length > 0 && (
                <div className="md:col-span-2 rounded-2xl border border-orange-100 bg-orange-50/50 p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                      Danh sách đèn bị ảnh hưởng ({selectedLights.length} thiết bị)
                    </h3>
                    <Link
                      to="/street-lights/map"
                      className="inline-flex items-center gap-1 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
                    >
                      <span>Xem trên bản đồ</span>
                      <span>→</span>
                    </Link>
                  </div>
                  <div className="mt-4 overflow-x-auto max-h-60 rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-bold">
                        <tr>
                          <th className="px-4 py-2">Mã đèn</th>
                          <th className="px-4 py-2">Tên thiết bị</th>
                          <th className="px-4 py-2">Tuyến đường</th>
                          <th className="px-4 py-2">Khu vực</th>
                          <th className="px-4 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {selectedLights.map((light) => (
                          <tr key={light.name} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-bold text-slate-900">{light.ma_tai_san}</td>
                            <td className="px-4 py-2">{light.ten_tai_san}</td>
                            <td className="px-4 py-2">{light.route_name || '—'}</td>
                            <td className="px-4 py-2">{light.ten_khu_vuc || light.khu_vuc}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                light.trang_thai === 'Hoạt động'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : light.trang_thai === 'Hỏng'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {light.trang_thai}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
