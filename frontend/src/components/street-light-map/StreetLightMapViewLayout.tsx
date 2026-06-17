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
    <div className="-m-6 min-h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 p-6 text-slate-900 md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm shadow-slate-200/80">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                GIS chiếu sáng
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{headerTitle}</h1>
              <p className="mt-2 text-sm text-slate-500">{headerSubtitle}</p>
            </div>
            {headerActions}
          </div>

          <div className="grid min-h-[720px] gap-0 lg:grid-cols-[360px_1fr]">
            {sidebar}
            <section className="relative min-h-[720px] overflow-hidden bg-slate-200">
              {map}
              {toolbar}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreetLightMapViewLayout;

