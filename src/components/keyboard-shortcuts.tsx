"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

/**
 * Global keyboard shortcuts handler (v3.1).
 *
 * Registered shortcuts:
 * - Cmd/Ctrl + 1-5: Navigate between 5 main views
 * - Cmd/Ctrl + N: New note (opens creator sheet)
 * - Cmd/Ctrl + E: Export data
 * - Cmd/Ctrl + K is handled by CommandPalette component
 */
export function KeyboardShortcuts() {
  const { setActiveTab } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && !e.shiftKey && !e.altKey) {
        const tabMap: Record<string, Parameters<typeof setActiveTab>[0]> = {
          "1": "dashboard",
          "2": "account-hub",
          "3": "analytics",
          "4": "library",
          "5": "settings",
        };

        const tab = tabMap[e.key];
        if (tab) {
          e.preventDefault();
          setActiveTab(tab);
          return;
        }

        // Cmd/Ctrl + N: open AI creator sheet
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          const store = useAppStore.getState();
          store.setActiveTab("account-hub");
          store.setAccountHubTab("notes");
          store.setCreatorSheetOpen(true);
          return;
        }

        // Cmd/Ctrl + E: Export
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("xhs-export"));
          return;
        }
      }

      if (isTyping) return;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTab]);

  return null;
}

