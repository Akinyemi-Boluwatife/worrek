import { FeatureDemo } from "./featureDemo";
import styles from "./illustrations.module.css";

export function InstructionsDemo() {
  return (
    <FeatureDemo
      variant="instructions"
      label="Animated Worrek editor demonstration: text is selected, a request is entered in the AI panel, and the selected paragraph is replaced with a clearer version."
      font="Manrope"
      document={
        <div className={styles["demo-page"]}>
          <span className={styles["demo-doc-label"]}>
            PRODUCT LAUNCH / DRAFT 02
          </span>
          <h4>Meet the next chapter.</h4>
          <span className={styles["demo-rule"]}></span>
          <h5>Opening note</h5>
          <p className={styles["demo-change-copy"]}>
            <span
              className={[styles["before"], styles["demo-selection"]].join(" ")}
            >
              Our team has worked very hard to create a new product that we
              believe can make planning projects easier for everyone.
            </span>
            <span className={styles["after"]}>
              Plan projects with less friction, from the first idea to the final
              detail.
            </span>
          </p>
          <p>
            Built for focused teams who want a clear path from thinking to
            doing.
          </p>
          <h5>What matters</h5>
          <p>
            Keep priorities visible, give every task an owner, and make room for
            the work that matters most.
          </p>
        </div>
      }
    >
      <div className={styles["demo-chat"]}>
        <div className={styles["demo-context"]}>Selected paragraph</div>
        <div className={styles["demo-prompt"]}>
          <span className={styles["typed-text"]}>
            Make this shorter and more confident.
          </span>
        </div>
        <div className={styles["demo-thinking"]}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className={styles["demo-response"]}>
          <p>I’ve tightened the opening and kept the main idea.</p>
        </div>
      </div>
    </FeatureDemo>
  );
}

export function BiggerEditsDemo() {
  return (
    <FeatureDemo
      variant="bigger"
      label="Animated Worrek editor demonstration: the AI works through three areas of a longer document and marks each revision complete."
      font="Georgia"
      document={
        <div
          className={[styles["demo-page"], styles["demo-long-page"]].join(" ")}
        >
          <span className={styles["demo-doc-label"]}>
            FIELDNOTE / ANNUAL REPORT
          </span>
          <h4>One year of progress</h4>
          <span className={styles["demo-rule"]}></span>
          <div
            className={[styles["multi-section"], styles["section-one"]].join(
              " ",
            )}
          >
            <h5>
              01 / Overview <b>✓</b>
            </h5>
            <p>
              We grew carefully, learned quickly, and built a stronger
              foundation for what comes next.
            </p>
            <div className={styles["edit-sweep"]}></div>
          </div>
          <div
            className={[styles["multi-section"], styles["section-two"]].join(
              " ",
            )}
          >
            <h5>
              02 / The work <b>✓</b>
            </h5>
            <p>
              Three focused initiatives helped teams move with more clarity
              across the organization.
            </p>
            <div className={styles["edit-sweep"]}></div>
          </div>
          <div
            className={[styles["multi-section"], styles["section-three"]].join(
              " ",
            )}
          >
            <h5>
              03 / Looking ahead <b>✓</b>
            </h5>
            <p>
              Next year is about turning that foundation into useful, lasting
              momentum.
            </p>
            <div className={styles["edit-sweep"]}></div>
          </div>
        </div>
      }
    >
      <div className={[styles["demo-chat"], styles["bigger-chat"]].join(" ")}>
        <div className={styles["demo-context"]}>Entire document</div>
        <div className={styles["demo-prompt"]}>
          Improve the structure and rewrite the three main sections.
        </div>
        <div className={styles["demo-plan"]}>
          <span>Working through your document</span>
          <ol>
            <li>
              <i></i>Clarify the overview
            </li>
            <li>
              <i></i>Reorder the middle section
            </li>
            <li>
              <i></i>Strengthen the conclusion
            </li>
          </ol>
          <div className={styles["demo-progress"]}>
            <span></span>
          </div>
        </div>
      </div>
    </FeatureDemo>
  );
}

export function WorkflowDemo() {
  return (
    <FeatureDemo
      variant="workflow"
      label="Animated Worrek editor demonstration: a sentence is typed manually, the writer asks AI for an idea, and manual writing continues in the same document."
      font="Georgia"
      document={
        <div className={styles["demo-page"]}>
          <span className={styles["demo-doc-label"]}>
            PERSONAL ESSAY / WORKING DRAFT
          </span>
          <h4>The quiet work</h4>
          <span className={styles["demo-rule"]}></span>
          <p>
            Good ideas rarely arrive fully formed. They begin as a loose thread,
            waiting to be followed.
          </p>
          <p className={styles["manual-line"]}>
            <span>Writing gives the thought somewhere to go.</span>
            <i></i>
          </p>
          <p className={styles["continued-line"]}>
            <span>And revision helps it become what it was trying to say.</span>
            <i></i>
          </p>
          <p>
            A first draft is a place to begin. Return to it with fresh eyes,
            follow the strongest idea, and let the rest fall away.
          </p>
        </div>
      }
    >
      <div className={[styles["demo-chat"], styles["workflow-chat"]].join(" ")}>
        <div className={styles["demo-context"]}>Working with your draft</div>
        <div className={styles["demo-prompt"]}>
          <span className={styles["workflow-prompt"]}>
            Give me a bridge to the idea of revision.
          </span>
        </div>
        <div
          className={[
            styles["demo-response"],
            styles["workflow-response"],
          ].join(" ")}
        >
          <p>
            Try connecting the act of writing with the clarity that comes from
            revisiting it.
          </p>
        </div>
      </div>
    </FeatureDemo>
  );
}

export function ReviewDemo() {
  return (
    <FeatureDemo
      variant="control"
      label="Animated Worrek editor demonstration: one AI change is accepted and a second is rejected while the document remains under the writer’s control."
      font="Manrope"
      reviewing
      composer="Ask about these changes…"
      document={
        <div className={styles["demo-page"]}>
          <span className={styles["demo-doc-label"]}>
            WEEKLY UPDATE / FRIDAY
          </span>
          <h4>What we shipped</h4>
          <span className={styles["demo-rule"]}></span>
          <h5>Project status</h5>
          <p
            className={[
              styles["tracked-change"],
              styles["accepted-change"],
            ].join(" ")}
          >
            <span className={styles["tracked-before"]}>
              The new flow is quite a lot easier to use.
            </span>
            <span className={styles["tracked-after"]}>
              The new flow is faster and easier to use.
            </span>
          </p>
          <h5>Next week</h5>
          <p
            className={[
              styles["tracked-change"],
              styles["rejected-change"],
            ].join(" ")}
          >
            <span className={styles["tracked-before"]}>
              We’ll test the final details with the team.
            </span>
            <span className={styles["tracked-after"]}>
              We shall undertake comprehensive validation.
            </span>
          </p>
        </div>
      }
    >
      <div className={styles["review-list"]}>
        <div
          className={[styles["review-card"], styles["review-accept"]].join(" ")}
        >
          <span>CLARITY</span>
          <p>
            “The new flow is <del>quite a lot</del> <ins>faster and</ins> easier
            to use.”
          </p>
          <div>
            <b>Accept</b>
            <i>Reject</i>
          </div>
        </div>
        <div
          className={[styles["review-card"], styles["review-reject"]].join(" ")}
        >
          <span>TONE</span>
          <p>
            “We <del>will test</del>{" "}
            <ins>shall undertake comprehensive validation of</ins> the final
            details.”
          </p>
          <div>
            <b>Accept</b>
            <i>Reject</i>
          </div>
        </div>
      </div>
    </FeatureDemo>
  );
}
