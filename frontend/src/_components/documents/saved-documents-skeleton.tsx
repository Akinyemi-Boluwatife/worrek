export function SavedDocumentsSkeleton() {
  return (
    <section aria-label="Saved documents" aria-busy="true" className="mt-12 pb-16">
      <span className="sr-only" role="status">Loading documents…</span>
      <div className="motion-safe:animate-pulse">
        <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">Saved documents</h2>
            <div className="h-4 w-20 rounded bg-[#e3e8ef]" aria-hidden="true" />
            <div className="h-8 w-16 rounded-md bg-[#e3e8ef]" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2" aria-hidden="true">
            <div className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe3ea] bg-white sm:w-64" />
            <div className="h-10 w-24 rounded-lg border border-[#dfe3ea] bg-white" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-4 border-b border-[#f1f5f9] px-4 py-4 last:border-b-0 sm:px-5 sm:py-5">
              <div className="size-12 shrink-0 rounded-xl border border-[#dbe8fe] bg-[#eff5ff]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-48 max-w-full rounded bg-[#e3e8ef]" />
                <div className="h-3 w-32 max-w-full rounded bg-[#eef1f4]" />
              </div>
              <div className="hidden w-20 shrink-0 space-y-2 sm:block">
                <div className="h-3 rounded bg-[#e3e8ef]" />
                <div className="ml-auto h-3 w-12 rounded bg-[#eef1f4]" />
              </div>
              <div className="size-9 shrink-0 rounded-lg bg-[#eef1f4]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
