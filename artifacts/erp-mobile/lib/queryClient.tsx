import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { AppState, type AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Keep data in cache for 24h so it survives offline reloads.
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "msme_pro_query_cache_v1",
  throttleTime: 1000,
});

function onAppStateChange(state: AppStateStatus) {
  focusManager.setFocused(state === "active");
}

export function PersistQueryProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: "v1" }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
