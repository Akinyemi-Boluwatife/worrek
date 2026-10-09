import { Brand } from "./brand";
import { LoginLink } from "./loginLink";

export function SiteHeader() {
  return (
    <header className="page-wrap flex h-28 items-center justify-between max-[651px]:h-[86px]">
      <Brand />
      <LoginLink compact />
    </header>
  );
}
