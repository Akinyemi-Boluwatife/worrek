import Link from "next/link";
import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { LogoutButton } from "@/_components/auth/logoutButton";
import styles from "./editor.module.css";

type EditorHeaderProps = {
  isRenaming: boolean;
  setIsRenaming: Dispatch<SetStateAction<boolean>>;
  draftTitle: string;
  setDraftTitle: Dispatch<SetStateAction<string>>;
  isSavingName: boolean;
  renameError: string;
  setRenameError: Dispatch<SetStateAction<string>>;
  isBlank: boolean;
  isLoadingDocument: boolean;
  isEditorReady: boolean;
  isSaving: boolean;
  currentDocumentTitle: string;
  fileName: string;
  saveStatus: string;
  saveError: string;
  statusLabel: string;
  saveLabel: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  moreMenuRef: RefObject<HTMLDetailsElement | null>;
  beginRename: () => void;
  onSaveName: (event: FormEvent<HTMLFormElement>) => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveDocx: () => void;
  onSaveToWorrek: () => void;
};

export function EditorHeader({
  isRenaming, setIsRenaming, draftTitle, setDraftTitle, isSavingName,
  renameError, setRenameError, isBlank, isLoadingDocument, isEditorReady, isSaving,
  currentDocumentTitle, fileName, saveStatus, saveError, statusLabel,
  saveLabel, fileInputRef, moreMenuRef, beginRename, onSaveName,
  onFileInputChange, onSaveDocx, onSaveToWorrek,
}: EditorHeaderProps) {
  return (      <header className={styles.topBar}>
        <div
          className={`${styles.identityGroup} ${isRenaming ? styles.identityRenaming : ""}`}
        >
          <Link
            href="/documents"
            prefetch={true}
            className={styles.brandLink}
            aria-label="Worrek documents"
          >
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none">
                <path
                  d="M4 9.5 10 27l8-13 8 13 6-17.5"
                  stroke="currentColor"
                  strokeWidth="5.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m14 9 4 5.5L22 9"
                  stroke="currentColor"
                  strokeWidth="4.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className={styles.brandName}>Worrek</span>
          </Link>
          <span className={styles.breadcrumbArrow} aria-hidden="true">
            ›
          </span>
          {isRenaming ? (
            <form onSubmit={onSaveName} className={styles.renameForm}>
              <input
                autoFocus
                aria-label="Document name"
                maxLength={255}
                value={draftTitle}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                  setRenameError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsRenaming(false);
                    setRenameError("");
                  }
                }}
                disabled={isSavingName}
                className={styles.renameInput}
              />
              <button
                type="submit"
                disabled={isSavingName}
                className={styles.renameConfirm}
              >
                {isSavingName ? "Saving…" : "Save name"}
              </button>
              <button
                type="button"
                disabled={isSavingName}
                onClick={() => {
                  setIsRenaming(false);
                  setRenameError("");
                }}
                className={styles.renameCancel}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={beginRename}
              disabled={isBlank || isLoadingDocument || isSaving}
              className={styles.documentTitle}
              title="Rename document"
              aria-label={`Rename ${currentDocumentTitle || fileName}`}
            >
              <span>
                {currentDocumentTitle || fileName.replace(/\.docx$/i, "")}
              </span>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <span
            className={`${styles.saveStatus} ${saveStatus === "error" || renameError ? styles.saveStatusError : ""}`}
            role={saveStatus === "error" || renameError ? "alert" : "status"}
            title={renameError || saveError || statusLabel}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m4 10 4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              {renameError ||
                (saveStatus === "error" ? saveError : statusLabel)}
            </span>
          </span>
        </div>

        <nav className={styles.workspaceTabs} aria-label="Workspace">
          <span aria-current="page" className={styles.activeTab}>
            Document
          </span>
          <Link
            href="/documents"
            prefetch={true}
            className={styles.inactiveTab}
          >
            Files
          </Link>
        </nav>

        <div className={styles.topActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={onFileInputChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${styles.iconAction} ${styles.desktopAction}`}
            title="Open .docx"
            aria-label="Open .docx"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 16V5.5A1.5 1.5 0 0 1 4.5 4H8l1.5 2H15a1.5 1.5 0 0 1 1.5 1.5V16H3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M3 9h13.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void onSaveDocx()}
            className={`${styles.iconAction} ${styles.desktopAction}`}
            title="Download .docx"
            aria-label="Download .docx"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 3v9m0 0 3-3m-3 3L7 9M4 14v2h12v-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void onSaveToWorrek()}
            disabled={
              isBlank ||
              isLoadingDocument ||
              !isEditorReady ||
              isSaving ||
              isRenaming
            }
            className={styles.primaryAction}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 15.5V4.5h10l2 2v9H4Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7 4.5v4h6v-4M7 15.5v-5h6v5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {saveLabel}
          </button>
          <details ref={moreMenuRef} className={styles.moreMenu}>
            <summary
              className={styles.iconAction}
              aria-label="More document actions"
              title="More document actions"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="10" r="1.3" />
                <circle cx="10" cy="10" r="1.3" />
                <circle cx="16" cy="10" r="1.3" />
              </svg>
            </summary>
            <div className={styles.morePanel}>
              <button
                type="button"
                className={styles.mobileMenuAction}
                onClick={() => {
                  if (moreMenuRef.current) moreMenuRef.current.open = false;
                  fileInputRef.current?.click();
                }}
              >
                Open .docx
              </button>
              <button
                type="button"
                className={styles.mobileMenuAction}
                onClick={() => {
                  if (moreMenuRef.current) moreMenuRef.current.open = false;
                  void onSaveDocx();
                }}
              >
                Download .docx
              </button>
              <div className={styles.logoutItem}>
                <LogoutButton />
              </div>
            </div>
          </details>
        </div>
      </header>
  );
}
