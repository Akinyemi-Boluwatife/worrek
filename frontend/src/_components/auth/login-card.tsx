import Link from "next/link";

import { AuthDivider } from "./auth-divider";
import {
  authCardClassName,
  authDescriptionClassName,
  authFootnoteClassName,
  authHeadingClassName,
  authLinkClassName,
} from "./form-styles";
import { LoginForm } from "./login-form";
import { SocialAuthButtons } from "./social-auth-buttons";

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
