import { EditorPreview } from "./editorPreview";

export function ProductPreview() {
  return (
    <section
      className="mx-auto max-w-[1320px] px-7 max-[951px]:px-[22px] max-[651px]:px-0"
      aria-labelledby="preview-label"
    >
      <div className="mx-[6px] mb-[17px] flex items-center justify-between text-[9px] tracking-[1.45px] text-[#858b95] max-[951px]:text-[7px] max-[951px]:tracking-[1px] max-[651px]:mb-[14px] max-[651px]:justify-center max-[651px]:text-[6px] max-[651px]:tracking-[1.1px]">
        <span id="preview-label">YOUR DOCUMENT. YOUR AI. ONE WORKSPACE.</span>
        <span className="flex items-center gap-[10px] text-[10px] tracking-normal text-[#8b929e] max-[951px]:text-[8px] max-[651px]:hidden">
          Editor concept{" "}
          <span className="text-[21px] text-[#98add1]" aria-hidden="true">
            ↙
          </span>
        </span>
      </div>
      <EditorPreview />
      <p className="mt-5 text-center text-[10px] leading-[1.7] text-[#949ba6] max-[651px]:mt-[17px] max-[651px]:text-[8px]">
        A first look at Worrek. The editor is taking shape.
      </p>
    </section>
  );
}
