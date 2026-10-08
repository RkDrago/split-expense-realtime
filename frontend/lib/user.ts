"use client";

import { useCallback, useSyncExternalStore } from "react";

const USER_KEY = "splitwise.user";
const UPI_KEY = "splitwise.upiId";
const NOTIFY_KEY = "splitwise.notify";

export interface LocalUser {
  name: string;
  email: string;
}

/** Read a key from localStorage (safe during SSR). */
function getSnapshot(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/** Subscribe to same-tab ("key" event) and cross-tab ("storage") changes. */
function subscribeKey(key: string, cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === key) cb();
  };
  window.addEventListener(key, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(key, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

function writeKey(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(key));
}

export function readUser(): LocalUser | null {
  const raw = getSnapshot(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

export function saveUser(user: LocalUser) {
  writeKey(USER_KEY, JSON.stringify(user));
}

function useStored(key: string): string | null {
  return useSyncExternalStore(
    useCallback((cb: () => void) => subscribeKey(key, cb), [key]),
    useCallback(() => getSnapshot(key), [key]),
    getServerSnapshot
  );
}

/** True once mounted on the client (avoids SSR/client render mismatch). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/** Current user as email id, e.g. alice@example.com */
export function useUser() {
  const raw = useStored(USER_KEY);
  const user = raw ? readUser() : null;
  return { user, userId: user?.email ?? "", ready: useMounted() };
}

export function useSetting<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T
): [T, (v: T) => void] {
  const raw = useStored(key);
  let value = fallback;
  if (raw !== null) {
    try {
      value = parse(raw);
    } catch {
      /* keep fallback */
    }
  }
  const update = useCallback(
    (v: T) => writeKey(key, String(v)),
    [key]
  );
  return [value, update];
}

export const settingsKeys = { upi: UPI_KEY, notify: NOTIFY_KEY };

export function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortName(email: string): string {
  if (!email) return "?";
  return email.split("@")[0];
}

/** UPI deep link for paying someone */
export function upiLink(payeeVpa: string, amount: number, note: string) {
  const params = new URLSearchParams({
    pa: payeeVpa,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
