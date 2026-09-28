import {
  authDividerClassName,
  authDividerLabelClassName,
  authDividerLineClassName,
} from "./formStyles";

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className={`${authDividerClassName} my-6`}>
      <span className={authDividerLineClassName} />
      <span className={authDividerLabelClassName}>{label}</span>
    </div>
  );
}
