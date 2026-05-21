import { create } from 'zustand';

interface AppState {
  // Navigation (v3.1 architecture: 5 items)
  activeTab: 'dashboard' | 'account-hub' | 'analytics' | 'library' | 'settings';
  // Sub-tab inside account-hub: 'overview' | 'notes' | 'persona'
  accountHubTab: 'overview' | 'notes' | 'persona';
  setAccountHubTab: (tab: AppState['accountHubTab']) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;

  // Selected account
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  // Loading states
  isScraping: boolean;
  setIsScraping: (v: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // Dialogs
  addAccountDialogOpen: boolean;
  setAddAccountDialogOpen: (v: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;

  // Prefilled topic for creator view
  prefilledTopic: string | null;
  setPrefilledTopic: (topic: string | null) => void;
  navigateToCreator: (topic: string) => void;

  // Note creator sheet (opens inside account-hub > notes tab)
  creatorSheetOpen: boolean;
  setCreatorSheetOpen: (open: boolean) => void;

  // ─── Cross-Tab Navigation (v4.1) ──────────────────────────────────────
  // Navigate to notes tab from within account hub
  navigateToNotes: () => void;
  // Navigate to persona tab from within account hub
  navigateToPersona: () => void;
  // Navigate to overview tab from within account hub
  navigateToOverview: () => void;
  // Navigate to creator with account context
  navigateToCreatorForAccount: (accountId: string, topic?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  accountHubTab: 'overview',
  setAccountHubTab: (tab) => set({ accountHubTab: tab }),
  setActiveTab: (tab) => {
    // Legacy compatibility: map old tab ids to new architecture
    const legacyMap: Record<string, { tab: AppState['activeTab']; sub?: AppState['accountHubTab'] }> = {
      account: { tab: 'account-hub', sub: 'overview' },
      content: { tab: 'account-hub', sub: 'notes' },
      persona: { tab: 'account-hub', sub: 'persona' },
      creator: { tab: 'account-hub', sub: 'notes' },
    };
    const mapped = legacyMap[tab as string];
    if (mapped) {
      set({ activeTab: mapped.tab, ...(mapped.sub ? { accountHubTab: mapped.sub } : {}) });
    } else {
      set({ activeTab: tab });
    }
  },
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  isScraping: false,
  setIsScraping: (v) => set({ isScraping: v }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  addAccountDialogOpen: false,
  setAddAccountDialogOpen: (v) => set({ addAccountDialogOpen: v }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  prefilledTopic: null,
  setPrefilledTopic: (topic) => set({ prefilledTopic: topic }),
  navigateToCreator: (topic) =>
    set({
      activeTab: 'account-hub',
      accountHubTab: 'notes',
      creatorSheetOpen: true,
      prefilledTopic: topic,
    }),
  creatorSheetOpen: false,
  setCreatorSheetOpen: (open) => set({ creatorSheetOpen: open }),

  // ─── Cross-Tab Navigation (v4.1) ──────────────────────────────────────
  navigateToNotes: () => set({ activeTab: 'account-hub', accountHubTab: 'notes' }),
  navigateToPersona: () => set({ activeTab: 'account-hub', accountHubTab: 'persona' }),
  navigateToOverview: () => set({ activeTab: 'account-hub', accountHubTab: 'overview' }),
  navigateToCreatorForAccount: (accountId, topic) =>
    set({
      activeTab: 'account-hub',
      accountHubTab: 'notes',
      selectedAccountId: accountId,
      creatorSheetOpen: true,
      prefilledTopic: topic || null,
    }),
}));
