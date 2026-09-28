import { Brand } from "./brand";
import { EarlyAccessLink } from "./earlyAccessLink";

export function SiteHeader() {
  return (
    <header className="page-wrap flex h-28 items-center justify-between max-[651px]:h-[86px]">
      <Brand />
      <EarlyAccessLink compact />
    </header>
  );
}
