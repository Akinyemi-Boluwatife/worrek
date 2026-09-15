import type { ReactNode } from "react";
import styles from "./illustrations.module.css";

type FeatureDemoProps = {
  variant: "instructions" | "bigger" | "workflow" | "control";
  label: string;
  font: "Manrope" | "Georgia";
  reviewing?: boolean;
  composer?: string;
  document: ReactNode;
  children: ReactNode;
};

export function FeatureDemo({
  variant,
  label,
  font,
  reviewing = false,
  composer = "Ask Worrek to edit…",
  document,
  children,
}: FeatureDemoProps) {
  return (
    <div
      className={[styles["feature-demo"], styles[`demo-${variant}`]].join(" ")}
      role="img"
      aria-label={label}
    >
      <div className={styles["demo-chrome"]} aria-hidden="true">
        <div className={styles["demo-tabs"]}>
          <span className={styles["demo-tab-active"]}>Home</span>
          <span>Insert</span>
          <span>Layout</span>
          <span>Review</span>
          <span className={styles["demo-mode"]}>
            ✎ {reviewing ? "Reviewing" : "Editing"}
          </span>
        </div>
        <div className={styles["demo-toolbar"]}>
          <span>↶</span>
          <span>↷</span>
          <i />
          <span className={styles["demo-select"]}>{font}⌄</span>
          <span
            className={[styles["demo-select"], styles["demo-size"]].join(" ")}
          >
            11⌄
          </span>
          <b>B</b>
          <em>I</em>
          <u>U</u>
          <i />
          <span>≡</span>
          <span>☷</span>
        </div>
        <div className={styles["demo-workarea"]}>
          <div className={styles["demo-canvas"]}>{document}</div>
          <aside className={styles["demo-ai"]}>
            <div className={styles["demo-ai-head"]}>
              <span>Worrek AI Agent</span>
              <span>{reviewing ? "2 suggestions" : "···"}</span>
            </div>
            {children}
            <div className={styles["demo-composer"]}>
              <span>{composer}</span>
              <b>↑</b>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
