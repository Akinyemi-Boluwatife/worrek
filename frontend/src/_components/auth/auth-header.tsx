import { Brand } from "@/_components/landing/brand";

const navLinks = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Support", href: "#" },
];

export function AuthHeader() {
  return (
    <header className="page-wrap flex h-28 items-center justify-between max-[651px]:h-[86px]">
      <Brand />
      <nav
        aria-label="Legal and support"
        className="flex items-center gap-6 text-[12px] font-[650] text-muted max-[651px]:gap-4"
      >
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="transition-colors hover:text-foreground motion-reduce:transition-none"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
