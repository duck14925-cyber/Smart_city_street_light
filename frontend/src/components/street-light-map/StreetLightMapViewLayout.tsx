import type { ReactNode } from 'react';

interface StreetLightMapViewLayoutProps {
  headerTitle: string;
  headerSubtitle: string;
  sidebar: ReactNode;
  map: ReactNode;
  toolbar?: ReactNode;
  headerActions?: ReactNode;
}

const StreetLightMapViewLayout = ({
  headerTitle,
  headerSubtitle,
  sidebar,
  map,
  toolbar,
  headerActions,
}: StreetLightMapViewLayoutProps) => {
  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-900">
      <div className="flex flex-col h-full w-full bg-white shadow-sm overflow-hidden">
        <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              GIS chiếu sáng
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{headerTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">{headerSubtitle}</p>
          </div>
          {headerActions}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 h-full flex flex-col border-r border-slate-200 bg-white">
            {sidebar}
          </div>
          <section className="relative flex-1 h-full overflow-hidden bg-slate-200">
            {map}
            {toolbar}
          </section>
        </div>
      </div>
    </div>
  );
};

export default StreetLightMapViewLayout;

