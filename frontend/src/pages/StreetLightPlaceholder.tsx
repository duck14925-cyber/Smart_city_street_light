interface StreetLightPlaceholderProps {
  title: string;
}

const StreetLightPlaceholder = ({ title }: StreetLightPlaceholderProps) => {
  return (
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/80">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6">
            <div className="mb-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              Cấp điện & Chiếu sáng
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Chức năng đang được xây dựng trong phase tiếp theo
            </p>
          </div>

          <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">
                💡
              </div>
              <h2 className="text-xl font-bold text-slate-900">Module đang chuẩn bị</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Màn hình này đã được đưa vào cấu trúc điều hướng của hệ thống quản lý đèn đường.
                Phần dữ liệu và thao tác nghiệp vụ sẽ được tích hợp sau khi hoàn thiện dashboard,
                bản đồ GIS và quy trình sự cố.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Trạng thái</p>
              <div className="mt-5 space-y-4">
                {['Khung giao diện', 'Điều hướng nghiệp vụ', 'Tích hợp dữ liệu'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${index < 2 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-semibold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreetLightPlaceholder;
