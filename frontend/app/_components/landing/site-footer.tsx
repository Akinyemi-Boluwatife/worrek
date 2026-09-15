import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="page-wrap mt-[122px] flex min-h-[105px] items-center justify-between border-t border-[#e1e4e9] text-[9px] text-[#9299a4] max-[651px]:mt-20 max-[651px]:min-h-[86px] max-[651px]:text-[8px]">
      <Brand compact />
      <span className="-ml-[35px] max-[651px]:hidden">
        Write. Edit. Move forward.
      </span>
      <span>© 2026 Worrek</span>
    </footer>
  );
}
