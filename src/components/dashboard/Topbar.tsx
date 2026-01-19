import { BellIcon, SearchIcon } from "./icons";

export default function Topbar() {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100/80 bg-white/80 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="relative flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-100/70 px-4 py-2 text-slate-500">
        <SearchIcon className="h-5 w-5" />
        <input
          aria-label="Search"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          placeholder="Search datasets, pipelines..."
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400" />
        </button>
        <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-500" />
          <div className="text-sm">
            <p className="font-semibold text-slate-800">Emma Kwan</p>
            <p className="text-xs text-slate-500">Platform Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
