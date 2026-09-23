export function SavedDocumentsSkeleton() {
  return (
    <section aria-label="Loading saved documents" className="mt-12 max-[651px]:mt-9">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-[16px] font-[650] tracking-[-0.3px]">
          Saved documents
        </h2>
        <div className="h-3 w-20 rounded bg-[#e3e8ef]" aria-hidden="true" />
      </div>
      <div className="space-y-px overflow-hidden rounded-xl border border-[#dce1e8] bg-[#e9ecf0]" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-4 bg-white px-5 py-5">
            <div className="size-11 shrink-0 rounded-lg bg-[#edf3ff]" />
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
