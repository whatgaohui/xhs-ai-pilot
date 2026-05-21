"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, AccountAnalysis } from "@/types";
import { formatNumber } from "@/components/account-card";

// ─── Simple in-memory cache ─────────────────────────────────────────────

interface CacheEntry {
  data: (XhsAccountInfo & { postsCount?: number })[];
  timestamp: number;
}

const accountsCache: { current: CacheEntry | null } = { current: null };
const CACHE_TTL = 30_000; // 30 seconds

// ─── Hook Return Type ──────────────────────────────────────────────────

export interface AccountStats {
  followers: number;
  likedCollected: number;
  notesCount: number;
  following: number;
}

export interface AccountDataState {
  /** All accounts list */
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  /** Currently selected account (resolved from selectedAccountId) */
  selectedAccount: (XhsAccountInfo & { postsCount?: number }) | null;
  /** Selected account ID (from Zustand store) */
  selectedAccountId: string | null;
  /** Set selected account ID (syncs with Zustand store) */
  setSelectedAccountId: (id: string | null) => void;
  /** Loading state for accounts fetch */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh accounts from API (bypasses cache) */
  refreshAccounts: () => Promise<void>;
  /** Account analysis data (for the selected account) */
  analysis: AccountAnalysis | null;
  /** Loading state for analysis fetch */
  analysisLoading: boolean;
  /** Refresh analysis for the selected account */
  refreshAnalysis: () => Promise<void>;
  /** Computed stats for selected account */
  stats: AccountStats;
  /** Engagement rate for selected account */
  engagementRate: string;
  /** Formatted stats for display */
  formattedStats: {
    followers: string;
    likedCollected: string;
    notesCount: string;
    following: string;
  };
}

// ─── Hook Implementation ───────────────────────────────────────────────

export function useAccountData(): AccountDataState {
  const { selectedAccountId, setSelectedAccountId } = useAppStore();
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Track if initial fetch has been done
  const initialFetchRef = useRef(false);

  // ─── Fetch Accounts ──────────────────────────────────────────────────

  const fetchAccounts = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && accountsCache.current) {
      const age = Date.now() - accountsCache.current.timestamp;
      if (age < CACHE_TTL) {
        setAccounts(accountsCache.current.data);
        setLoading(false);
        return;
      }
    }

    try {
      setError(null);
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        const accountList = data.data || [];
        setAccounts(accountList);
        accountsCache.current = { data: accountList, timestamp: Date.now() };

        // Auto-select first account if none selected
        if (!selectedAccountId && accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      } else {
        setError(data.error || "加载账号列表失败");
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
      setError("网络错误，无法加载账号列表");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, setSelectedAccountId]);

  // Initial fetch
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchAccounts();
    }
  }, [fetchAccounts]);

  // ─── Fetch Analysis ──────────────────────────────────────────────────

  const fetchAnalysis = useCallback(async () => {
    if (!selectedAccountId) {
      setAnalysis(null);
      return;
    }
    setAnalysisLoading(true);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/analysis`);
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [selectedAccountId, fetchAnalysis]);

  // ─── Refresh Methods ─────────────────────────────────────────────────

  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    await fetchAccounts(true);
  }, [fetchAccounts]);

  const refreshAnalysis = useCallback(async () => {
    await fetchAnalysis();
  }, [fetchAnalysis]);

  // ─── Computed Values ─────────────────────────────────────────────────

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId || accounts.length === 0) return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [selectedAccountId, accounts]);

  const stats = useMemo<AccountStats>(() => {
    if (!selectedAccount) {
      return { followers: 0, likedCollected: 0, notesCount: 0, following: 0 };
    }
    return {
      followers: selectedAccount.followers || 0,
      likedCollected: selectedAccount.likedCollected || 0,
      notesCount: selectedAccount.notesCount || selectedAccount.postsCount || 0,
      following: selectedAccount.following || 0,
    };
  }, [selectedAccount]);

  const engagementRate = useMemo(() => {
    if (!analysis || !selectedAccount) return "0";
    const totalEng = analysis.avgLikes + analysis.avgComments + analysis.avgCollects;
    const rate = selectedAccount.followers > 0
      ? (totalEng / selectedAccount.followers * 100).toFixed(1)
      : "0";
    return rate;
  }, [analysis, selectedAccount]);

  const formattedStats = useMemo(() => ({
    followers: formatNumber(stats.followers),
    likedCollected: formatNumber(stats.likedCollected),
    notesCount: formatNumber(stats.notesCount),
    following: formatNumber(stats.following),
  }), [stats]);

  return {
    accounts,
    selectedAccount,
    selectedAccountId,
    setSelectedAccountId,
    loading,
    error,
    refreshAccounts,
    analysis,
    analysisLoading,
    refreshAnalysis,
    stats,
    engagementRate,
    formattedStats,
  };
}
