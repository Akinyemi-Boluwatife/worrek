import styles from "./illustrations.module.css";

type EditorIconProps = {
  name:
    "doc" | "undo" | "paste" | "align" | "center" | "list" | "search" | "clip";
  className?: string;
};

const paths = {
  doc: (
    <>
      <path d="M5 3h9l5 5v13H5zM14 3v6h5M9 13h6M9 17h6" />
    </>
  ),
  undo: (
    <>
      <path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12" />
    </>
  ),
  paste: (
    <>
      <path d="M9 5H5v16h14V5h-4M9 3h6v5H9zM9 12h6M9 16h6" />
    </>
  ),
  align: (
    <>
      <path d="M4 5h16M4 10h10M4 15h16M4 20h10" />
    </>
  ),
  center: (
    <>
      <path d="M4 5h16M7 10h10M4 15h16M7 20h10" />
    </>
  ),
  list: (
    <>
      <path d="M9 5h11M9 12h11M9 19h11M3 5h1M3 12h1M3 19h1" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  clip: (
    <>
      <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2M6 15l8-8" />
    </>
  ),
};

export function EditorIcon({ name, className = "" }: EditorIconProps) {
  return (
    <svg
      className={`${styles.icon} ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
