import Link from "next/link";

import { AuthDivider } from "./auth-divider";
import {
  authCardClassName,
  authDescriptionClassName,
  authFootnoteClassName,
  authHeadingClassName,
  authLinkClassName,
} from "./form-styles";
import { SignupForm } from "./signup-form";
import { SocialAuthButtons } from "./social-auth-buttons";

export function SignupCard() {
  return (
    <section className={authCardClassName}>
      <h1 className={authHeadingClassName}>Create your account</h1>
      <p className={authDescriptionClassName}>
        Start writing and editing with intelligent simplicity.
      </p>

      <div className="mt-7">
        <SocialAuthButtons />
      </div>

      <AuthDivider label="or continue with email" />

      <SignupForm />

      <p className={authFootnoteClassName}>
        Already have an account?{" "}
        <Link href="/login" className={authLinkClassName}>
          Sign in
        </Link>
      </p>
    </section>
  );
}
