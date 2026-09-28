import { EditorIcon } from "./editorIcon";
import styles from "./illustrations.module.css";

export function EditorPreview() {
  return (
    <figure
      className={styles["editor"]}
      role="img"
      aria-label="Worrek AI word processor concept. A project brief with a Word-style formatting ribbon and selected overview text sits beside an AI assistant suggesting a concise rewrite. A prompt composer is at the bottom of the AI panel. This is a static illustration, not an interactive editor."
    >
      <div className={styles["editor-workspace"]} aria-hidden="true">
        <div className={styles["word-processor"]}>
          <div className={styles["editor-tabs"]}>
            <span className={styles["file-tab"]}>File</span>
            <span className={styles["active-tab"]}>Home</span>
            <span>Insert</span>
            <span>Layout</span>
            <span>Review</span>
            <span>View</span>
            <span className={styles["editing-mode"]}>
              ✎ &nbsp; Editing <small>⌄</small>
            </span>
          </div>
          <div className={styles["ribbon"]}>
            <div className={styles["clipboard-group"]}>
              <div className={styles["undo-stack"]}>
                <EditorIcon name="undo" />
                <EditorIcon name="undo" className={styles["redo"]} />
              </div>
              <div className={styles["paste-tool"]}>
                <EditorIcon name="paste" />
                <span>
                  Paste <small>⌄</small>
                </span>
              </div>
            </div>
            <div className={styles["font-group"]}>
              <div className={styles["ribbon-row"]}>
                <span
                  className={[styles["select"], styles["font-select"]].join(
                    " ",
                  )}
                >
                  Georgia <small>⌄</small>
                </span>
                <span
                  className={[styles["select"], styles["size-select"]].join(
                    " ",
                  )}
                >
                  11 <small>⌄</small>
                </span>
              </div>
              <div
                className={[styles["ribbon-row"], styles["formatting"]].join(
                  " ",
                )}
              >
                <b>B</b>
                <em>I</em>
                <u>U</u>
                <span className={styles["strike"]}>S</span>
                <span className={styles["font-color"]}>A</span>
                <span className={styles["highlight-tool"]}>ab</span>
                <small>⌄</small>
              </div>
            </div>
            <div className={styles["paragraph-group"]}>
              <div className={styles["ribbon-row"]}>
                <span className={styles["selected-tool"]}>
                  <EditorIcon name="align" />
                </span>
                <EditorIcon name="center" />
                <EditorIcon name="align" className={styles["right-align"]} />
                <span>
                  ↕ <small>⌄</small>
                </span>
              </div>
              <div className={styles["ribbon-row"]}>
                <EditorIcon name="list" />
                <span className={styles["number-list"]}>1≡</span>
                <span className={styles["indent-tool"]}>⇥</span>
                <span>¶</span>
              </div>
            </div>
            <div className={styles["styles-group"]}>
              <span className={styles["select"]}>
                Normal text <small>⌄</small>
              </span>
              <span className={styles["ribbon-label"]}>Styles</span>
            </div>
            <div className={styles["find-group"]}>
              <EditorIcon name="search" />
              <span className={styles["ribbon-label"]}>Find</span>
            </div>
          </div>
          <div className={styles["document-stage"]}>
            <div className={styles["ruler"]}>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>
            <article className={styles["document-page"]}>
              <div className={styles["document-kicker"]}>
                STUDIO NORTH / PROJECT BRIEF
              </div>
              <h2>Website refresh</h2>
              <p className={styles["document-subtitle"]}>
                A clearer story. A better experience.
              </p>
              <div className={styles["document-rule"]}></div>
              <h3>Overview</h3>
              <p>
                <mark>
                  The goal of this project is to refresh our current website so
                  that people can more easily understand our product, explore
                  what it offers, and find their way around.
                </mark>
                <span className={styles["text-caret"]}></span>
              </p>
              <p>
                The new site should help visitors understand what we do, find
                what they need, and take the next step with confidence.
              </p>
              <h3>What we’re working toward</h3>
              <ul>
                <li>
                  A focused story, from the first headline to the last detail.
                </li>
                <li>Simple navigation that makes every page easy to find.</li>
                <li>A consistent experience across desktop and mobile.</li>
              </ul>
              <h3>Next steps</h3>
              <p>
                Align on the direction, refine the first draft, and turn the
                strongest ideas into a plan.
              </p>
              <div className={styles["page-bottom"]}>
                <span>STUDIO NORTH</span>
                <span>01</span>
              </div>
            </article>
          </div>
          <div className={styles["document-status"]}>
            <span>
              Page 1 of 1 <i></i> 126 words
            </span>
            <span>English (US)</span>
            <span className={styles["zoom"]}>
              − <span className={styles["zoom-track"]}></span> + <b>100%</b>
            </span>
          </div>
        </div>
        <aside className={styles["assistant-panel"]}>
          <div className={styles["assistant-header"]}>
            <span>Worrek AI Agent</span>
            <span className={styles["assistant-menu"]}>
              ＋ <span>···</span>
            </span>
          </div>
          <div className={styles["conversation"]}>
            <div className={styles["conversation-context"]}>
              <EditorIcon name="doc" /> Working with your document
            </div>
            <div className={styles["user-message"]}>
              Make the overview more concise and confident.
            </div>
            <div className={styles["assistant-message"]}>
              <p>
                Here’s a tighter version that keeps the focus on the project.
              </p>
              <div className={styles["rewrite"]}>
                <span className={styles["rewrite-label"]}>
                  SUGGESTED REWRITE
                </span>
                <p>
                  We’re refreshing our website to make our product clearer,
                  easier to explore, and simpler to use.
                </p>
              </div>
              <div className={styles["suggestion-actions"]}>
                <span className={styles["apply-suggestion"]}>
                  Apply to document
                </span>
                <span className={styles["retry"]}>↻</span>
              </div>
            </div>
          </div>
          <div className={styles["composer"]}>
            <div className={styles["context-chip"]}>
              <EditorIcon name="doc" /> Selected text <span>×</span>
            </div>
            <p>Ask AI to write, edit, or summarize…</p>
            <div className={styles["composer-tools"]}>
              <EditorIcon name="clip" />
              <span>
                Use document <small>⌄</small>
              </span>
              <span className={styles["send-arrow"]}>↑</span>
            </div>
          </div>
          <div className={styles["assistant-footnote"]}>
            You’re in control of every edit.
          </div>
        </aside>
      </div>
    </figure>
  );
}
