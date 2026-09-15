import styles from "./illustrations.module.css";

export function HeroOrnaments() {
  return (
    <>
      <div className={styles["document-doodle"]} aria-hidden="true">
        <svg viewBox="0 0 84 104" fill="none">
          <path
            d="M10 4h43l20 21v73H10z"
            fill="#fff"
            stroke="#a0b4d4"
            strokeWidth="1.3"
          />
          <path
            d="M53 4v22h20M24 43h34M24 53h27M24 63h32"
            stroke="#a0b4d4"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M22 73h35v11H22z" fill="#e4ecff" />
          <path
            d="m27 79 4-4 5 4 10-8"
            stroke="#4878da"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>.docx</span>
      </div>
      <div className={styles["edit-doodle"]} aria-hidden="true">
        <span
          className={[styles["selection-corner"], styles["tl"]].join(" ")}
        ></span>
        <span
          className={[styles["selection-corner"], styles["tr"]].join(" ")}
        ></span>
        <span
          className={[styles["selection-corner"], styles["bl"]].join(" ")}
        ></span>
        <span
          className={[styles["selection-corner"], styles["br"]].join(" ")}
        ></span>
        Aa
        <svg className={styles["cursor"]} viewBox="0 0 26 34">
          <path
            d="m3 2 20 19-10 1-5 10z"
            fill="#4274dc"
            stroke="#f8f8f5"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className={styles["hero-ornaments"]} aria-hidden="true">
        <div className={styles["floating-image"]}>
          <svg viewBox="0 0 84 70" fill="none">
            <rect
              x="1"
              y="1"
              width="82"
              height="68"
              rx="5"
              fill="white"
              stroke="#b6c6df"
            />
            <rect x="8" y="8" width="68" height="48" rx="2" fill="#edf3ff" />
            <circle cx="59" cy="21" r="6" fill="#b2c9f1" />
            <path d="m8 48 20-22 19 19 11-10 18 21H8z" fill="#8caee7" />
            <path d="m8 48 20-22 19 19 11-10" stroke="#668ed2" />
            <path d="M29 62h26" stroke="#bdcbe0" strokeLinecap="round" />
          </svg>
        </div>
        <div className={styles["floating-ai"]}>
          <svg viewBox="0 0 64 64" fill="none">
            <rect
              x="1"
              y="1"
              width="62"
              height="62"
              rx="12"
              fill="#edf3ff"
              stroke="#b9ccec"
            />
            <path
              d="M18 42 26 21l8 21M21 35h10M41 22v20M38 22h6M38 42h6"
              stroke="#527dca"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles["floating-network"]}>
          <svg viewBox="0 0 70 70" fill="none">
            <circle cx="35" cy="35" r="33" fill="white" stroke="#c1cfe4" />
            <path
              d="m35 17 17 10v18L35 55 18 45V27zM35 17v38M18 27l34 18M52 27 18 45"
              stroke="#91acda"
              strokeWidth="1.3"
            />
            <g fill="#648bd0">
              <circle cx="35" cy="17" r="3" />
              <circle cx="52" cy="27" r="3" />
              <circle cx="52" cy="45" r="3" />
              <circle cx="35" cy="55" r="3" />
              <circle cx="18" cy="45" r="3" />
              <circle cx="18" cy="27" r="3" />
              <circle cx="35" cy="36" r="4" />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}
