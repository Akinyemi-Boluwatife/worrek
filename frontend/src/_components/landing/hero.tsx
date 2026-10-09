import { LoginLink } from "./loginLink";
import { HeroOrnaments } from "./heroOrnaments";

export function Hero() {
  return (
    <section
      className="page-wrap relative pt-[59px] pb-[88px] text-center max-[1200px]:pt-14 max-[1200px]:pb-[76px] max-[951px]:pt-11 max-[951px]:pb-[68px] max-[651px]:pt-[47px] max-[651px]:pb-[63px]"
      aria-labelledby="hero-title"
    >
      <h1
        id="hero-title"
        className="text-[clamp(62px,6.65vw,96px)] leading-[1.1] font-[650] tracking-[-5.5px] max-[1200px]:text-[7.1vw] max-[1200px]:tracking-[-4.5px] max-[951px]:text-[7.6vw] max-[951px]:tracking-[-3.6px] max-[651px]:text-[clamp(32px,9.4vw,56px)] max-[651px]:leading-[1.16] max-[651px]:tracking-[-1.8px] max-[375px]:text-[29px] max-[375px]:tracking-[-1.7px]"
      >
        Write, review, edit, format
        <br />
        <span>documents with AI</span>
      </h1>
      <p className="mx-auto mt-[27px] mb-[29px] max-w-[760px] text-[21px] leading-[1.65] tracking-[-0.2px] text-muted max-[951px]:max-w-[640px] max-[951px]:text-[19px] max-[651px]:mt-6 max-[651px]:mb-[26px] max-[651px]:max-w-[360px] max-[651px]:text-[17px] max-[375px]:text-[16px]">
        Worrek uses AI to make working with documents faster, easier, and more
        efficient.
      </p>
      <LoginLink />
      <HeroOrnaments />
    </section>
  );
}
