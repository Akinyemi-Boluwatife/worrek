export function SavedDocumentsSkeleton() {
  return (
    <section aria-label="Loading saved documents" className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">
          Saved documents
        </h2>
        <div className="h-3 w-20 rounded bg-[#e3e8ef]" aria-hidden="true" />
      </div>
      <div className="space-y-px overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f1f5f9]" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-4 bg-white px-5 py-5">
            <div className="size-12 shrink-0 rounded-xl bg-[#eff5ff]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 max-w-full rounded bg-[#e3e8ef]" />
              <div className="h-3 w-28 rounded bg-[#eef1f4]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
