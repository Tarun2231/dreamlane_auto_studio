export default function AdminGateLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="card max-w-md border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm font-medium text-white">Checking admin access…</p>
        <p className="mt-2 text-xs text-slate-400">Verifying your session</p>
      </div>
    </div>
  );
}
