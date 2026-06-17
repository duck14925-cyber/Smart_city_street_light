const Navbar = () => {
  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-700/70 bg-slate-900 px-6 shadow-sm">
      {/* Mobile logo */}
      <div className="flex items-center md:hidden">
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          💡 Cấp điện & Chiếu sáng
        </h1>
      </div>

      {/* Search bar (desktop) */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm đèn, khu vực, sự cố..."
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 pl-11 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right lg:block">
          <p className="text-sm font-bold text-white">Hệ thống quản lý đèn đường</p>
          <p className="text-xs text-slate-400">Theo dõi vận hành chiếu sáng đô thị</p>
        </div>
        <button className="relative rounded-xl p-2.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
          🔔
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900"></span>
        </button>
        <button className="rounded-xl p-2.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
          ⚙️
        </button>
      </div>
    </header>
  );
};

export default Navbar;
