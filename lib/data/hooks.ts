"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { CollectionName, Database, ID, RecordOf } from "@/lib/types";
import { store, type StoreSnapshot } from "./store";

/** Subscribes to one collection. Re-renders only when that collection changes. */
export function useCollection<K extends CollectionName>(collection: K): Database[K] {
  const subscribe = store.subscribe;
  const getSnapshot = useCallback(() => store.getCollection(collection), [collection]);
  const getServerSnapshot = useCallback(() => store.getServerCollection(collection), [collection]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useStoreStatus(): StoreSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useRecord<K extends CollectionName>(
  collection: K,
  id: ID | null | undefined,
): RecordOf<K> | null {
  const rows = useCollection(collection);
  if (!id) return null;
  return (rows as RecordOf<K>[]).find((row) => row.id === id) ?? null;
}

/** Boots the workspace once, on the client. */
export function useBootstrap() {
  const status = useStoreStatus();
  useEffect(() => {
    void store.init();
  }, []);
  useEffect(() => {
    const flushOnExit = () => void store.flush();
    window.addEventListener("beforeunload", flushOnExit);
    document.addEventListener("visibilitychange", flushOnExit);
    return () => {
      window.removeEventListener("beforeunload", flushOnExit);
      document.removeEventListener("visibilitychange", flushOnExit);
    };
  }, []);
  return status;
}

export const isReady = (snapshot: StoreSnapshot) => snapshot.status === "ready";
