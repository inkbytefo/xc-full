// ============================================================================
// ServersPage - Placeholder (Temporary)
// ============================================================================
// This is a temporary placeholder while the servers feature is being rebuilt.
// The full server functionality will be restored in a future update.
// ============================================================================

export function ServersPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Sunucular
        </h1>
        <p className="text-zinc-400 mb-6">
          Sunucu sistemi şu anda yeniden yapılandırılıyor.
          Yakında daha iyi bir deneyimle geri dönecek!
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          Geliştirme aşamasında
        </div>
      </div>
    </div>
  );
}
