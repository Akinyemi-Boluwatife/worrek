import Link from "next/link";

import { AuthDivider } from "./authDivider";
import {
  authCardClassName,
  authDescriptionClassName,
  authFootnoteClassName,
  authHeadingClassName,
  authLinkClassName,
} from "./formStyles";
import { SignupForm } from "./signupForm";
import { SocialAuthButtons } from "./socialAuthButtons";

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
