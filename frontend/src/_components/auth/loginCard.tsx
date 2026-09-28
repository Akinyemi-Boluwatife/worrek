import Link from "next/link";

import { AuthDivider } from "./authDivider";
import {
  authCardClassName,
  authDescriptionClassName,
  authFootnoteClassName,
  authHeadingClassName,
  authLinkClassName,
} from "./formStyles";
import { LoginForm } from "./loginForm";
import { SocialAuthButtons } from "./socialAuthButtons";

export function LoginCard() {
  return (
    <section className={authCardClassName}>
      <h1 className={authHeadingClassName}>Welcome back</h1>
      <p className={authDescriptionClassName}>
        Sign in to continue to your manuscripts.
      </p>

      <div className="mt-7">
        <SocialAuthButtons />
      </div>

      <AuthDivider label="or continue with email" />

      <LoginForm />

      <p className={authFootnoteClassName}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={authLinkClassName}>
          Create one
        </Link>
      </p>
    </section>
  );
}
