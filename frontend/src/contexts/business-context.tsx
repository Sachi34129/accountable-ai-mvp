import React from 'react';

export type BusinessGstin = {
  id: string;
  gstin: string;
  isPrimary: boolean;
  createdAt?: string;
};

export type BusinessSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt?: string;
  gstins: BusinessGstin[];
};

type BusinessContextValue = {
  businesses: BusinessSummary[];
  loading: boolean;
  activeBusinessId: string | null;
  activeBusiness: BusinessSummary | null;
  setActiveBusinessId: (id: string) => void;
  refreshBusinesses: () => Promise<void>;
};

const BusinessContext = React.createContext<BusinessContextValue | null>(null);

const STORAGE_KEY = 'activeBusinessId';

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = React.useState<BusinessSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeBusinessId, setActiveBusinessIdState] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const refreshBusinesses = React.useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/entities', { credentials: 'include' }); // backend name stays /entities
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || 'Failed to load businesses');
      const list = (data.entities || []) as BusinessSummary[];
      setBusinesses(list);

      const stored = (() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      const hasStored = stored && list.some((e) => e.id === stored);
      if (hasStored) {
        setActiveBusinessIdState(stored!);
      } else {
        const def = list.find((e) => e.isDefault) || list[0] || null;
        if (def) {
          try {
            localStorage.setItem(STORAGE_KEY, def.id);
          } catch {
            // ignore
          }
          setActiveBusinessIdState(def.id);
        } else {
          setActiveBusinessIdState(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshBusinesses();
  }, [refreshBusinesses]);

  const setActiveBusinessId = React.useCallback((id: string) => {
    const next = String(id || '').trim();
    if (!next) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setActiveBusinessIdState(next);
  }, []);

  const activeBusiness = React.useMemo(() => {
    if (!activeBusinessId) return null;
    return businesses.find((e) => e.id === activeBusinessId) || null;
  }, [businesses, activeBusinessId]);

  const value: BusinessContextValue = React.useMemo(
    () => ({
      businesses,
      loading,
      activeBusinessId,
      activeBusiness,
      setActiveBusinessId,
      refreshBusinesses,
    }),
    [businesses, loading, activeBusinessId, activeBusiness, setActiveBusinessId, refreshBusinesses]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const ctx = React.useContext(BusinessContext);
  if (!ctx) throw new Error('useBusinessContext must be used within BusinessProvider');
  return ctx;
}


