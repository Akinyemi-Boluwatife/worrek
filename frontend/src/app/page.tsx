import { Faq } from "@/_components/landing/faq";
import { Features } from "@/_components/landing/features";
import { Hero } from "@/_components/landing/hero";
import { ProductPreview } from "@/_components/landing/product-preview";
import { SiteFooter } from "@/_components/landing/site-footer";
import { SiteHeader } from "@/_components/landing/site-header";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="absolute top-[10px] left-[10px] z-10 -translate-y-[160%] bg-white p-3 focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <ProductPreview />
        <Features />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
