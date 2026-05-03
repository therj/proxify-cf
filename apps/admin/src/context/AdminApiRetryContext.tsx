import React, { createContext, useContext, useEffect, useState } from 'react';

/** Dispatched with Try again on the fatal API modal so admin routes refetch without full reload. */
export const ADMIN_API_RETRY_EVENT = 'proxifycf:admin-api-retry';

const AdminApiRetryEpochContext = createContext(0);

export function AdminApiRetryProvider({ children }: { children: React.ReactNode }) {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setEpoch((e) => e + 1);
    window.addEventListener(ADMIN_API_RETRY_EVENT, bump);
    return () => window.removeEventListener(ADMIN_API_RETRY_EVENT, bump);
  }, []);

  return <AdminApiRetryEpochContext.Provider value={epoch}>{children}</AdminApiRetryEpochContext.Provider>;
}

/** Bump this in useEffect deps to re-run data loads after fatal-modal Try again. */
export function useAdminApiRetryEpoch(): number {
  return useContext(AdminApiRetryEpochContext);
}
