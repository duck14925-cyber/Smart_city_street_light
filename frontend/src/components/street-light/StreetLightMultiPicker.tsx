import { useEffect, useMemo, useState, useRef } from 'react';
import { type StreetLightRecord } from '../../api/streetLightApi';

interface StreetLightMultiPickerProps {
  lights: StreetLightRecord[];
  selectedLights: StreetLightRecord[];
  onChange: (selected: StreetLightRecord[]) => void;
  multiple?: boolean;
  label?: string;
  placeholder?: string;
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100';

export default function StreetLightMultiPicker({
  lights,
  selectedLights,
  onChange,
  multiple = false,
  label = 'Chọn đèn',
  placeholder = 'Nhập mã đèn, tên đèn, tuyến đường hoặc khu vực...',
}: StreetLightMultiPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!multiple) {
      if (selectedLights.length === 1) {
        const light = selectedLights[0];
        setSearchTerm(`${light.ma_tai_san} - ${light.ten_tai_san}`);
      } else {
        setSearchTerm('');
      }
    }
  }, [selectedLights, multiple]);

  const filteredLights = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return lights.slice(0, 30);
    }

    if (!multiple && selectedLights.length === 1) {
      const selected = selectedLights[0];
      if (term === `${selected.ma_tai_san} - ${selected.ten_tai_san}`.toLowerCase()) {
        return lights.slice(0, 30);
      }
    }

    return lights
      .filter((light) => {
        const ma = (light.ma_tai_san || '').toLowerCase();
        const ten = (light.ten_tai_san || '').toLowerCase();
        const route = (light.route_name || '').toLowerCase();
        const khuvuc = (light.ten_khu_vuc || light.khu_vuc || '').toLowerCase();
        const devType = (light.device_type_name || '').toLowerCase();
        const status = (light.trang_thai || '').toLowerCase();

        return (
          ma.includes(term) ||
          ten.includes(term) ||
          route.includes(term) ||
          khuvuc.includes(term) ||
          devType.includes(term) ||
          status.includes(term)
        );
      })
      .slice(0, 30);
  }, [lights, searchTerm, selectedLights, multiple]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(true);
    if (!multiple && selectedLights.length === 1) {
      const selected = selectedLights[0];
      if (value !== `${selected.ma_tai_san} - ${selected.ten_tai_san}`) {
        onChange([]);
      }
    }
  };

  const handleToggleLight = (light: StreetLightRecord) => {
    const isSelected = selectedLights.some((item) => item.name === light.name);
    if (isSelected) {
      onChange(selectedLights.filter((item) => item.name !== light.name));
    } else {
      onChange([...selectedLights, light]);
    }
  };

  const handleItemClick = (light: StreetLightRecord) => {
    if (multiple) {
      handleToggleLight(light);
    } else {
      onChange([light]);
      setSearchTerm(`${light.ma_tai_san} - ${light.ten_tai_san}`);
      setShowDropdown(false);
    }
  };

  const handleSelectAllFiltered = () => {
    const newSelected = [...selectedLights];
    filteredLights.forEach((light) => {
      if (!newSelected.some((item) => item.name === light.name)) {
        newSelected.push(light);
      }
    });
    onChange(newSelected);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block">
        {label && (
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
            {label}
          </span>
        )}
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => handleSearchChange(event.target.value)}
          onFocus={() => setShowDropdown(true)}
          className={inputClass}
          placeholder={placeholder}
        />
      </label>

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          {multiple && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                >
                  Chọn tất cả kết quả
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Đã chọn: {selectedLights.length}
              </span>
            </div>
          )}

          {filteredLights.length === 0 ? (
            <div className="px-4 py-3 text-sm font-medium text-slate-400 text-center">
              Không tìm thấy đèn phù hợp
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLights.map((light) => {
                const isSelected = selectedLights.some((item) => item.name === light.name);
                return (
                  <div
                    key={light.name}
                    onClick={() => handleItemClick(light)}
                    className={`flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 text-left transition ${
                      isSelected
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {multiple && (
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // toggled on container click
                          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{light.ma_tai_san}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-medium text-slate-700">{light.ten_tai_san}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium">
                        {light.route_name && (
                          <>
                            <span>Tuyến: {light.route_name}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>Khu vực: {light.ten_khu_vuc || light.khu_vuc}</span>
                        {light.device_type_name && (
                          <>
                            <span>•</span>
                            <span>Loại: {light.device_type_name}</span>
                          </>
                        )}
                        {light.latitude !== null && light.longitude !== null && (
                          <>
                            <span>•</span>
                            <span>GPS: ({light.latitude.toFixed(4)}, {light.longitude.toFixed(4)})</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        light.trang_thai === 'Hoạt động'
                          ? 'bg-emerald-100 text-emerald-800'
                          : light.trang_thai === 'Hỏng'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {light.trang_thai}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {multiple && selectedLights.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {selectedLights.map((light) => (
            <div
              key={light.name}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
            >
              <span>{light.ma_tai_san} - {light.ten_tai_san}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLight(light);
                }}
                className="rounded-full w-4 h-4 inline-flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-600 font-bold transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
