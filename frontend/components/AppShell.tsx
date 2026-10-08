"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useUser, shortName, saveUser, type LocalUser } from "@/lib/user";

const NAV = [
  { href: "/groups", label: "Groups" },
  { href: "/balances", label: "Balances" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useUser();
  const [manualOpen, setManualOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // prompt automatically until an identity is saved
  const askOpen = manualOpen || (ready && !user);

  function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) return;
    const u: LocalUser = { name: name.trim() || shortName(cleanEmail), email: cleanEmail };
    saveUser(u);
    setManualOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link href="/groups" className="font-semibold tracking-tight">
            💸 SplitMate
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md transition ${
                    active
                      ? "bg-[var(--panel-2)] text-white"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {ready && user ? (
              <button
                onClick={() => setManualOpen(true)}
                className="text-xs px-2.5 py-1 rounded-full border text-[var(--muted)] hover:text-white"
                title="Change identity"
              >
                {user.name}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>

      <footer className="border-t py-4 text-center text-xs text-[var(--muted)]">
        SplitMate · realtime group expenses
      </footer>

      {askOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={saveIdentity}
            className="bg-[var(--panel)] border rounded-xl p-6 w-full max-w-sm space-y-4"
          >
            <div>
              <h2 className="font-semibold text-lg">Who are you?</h2>
              <p className="text-sm text-[var(--muted)]">
                Your email identifies you in groups and balances.
              </p>
            </div>
            <input
              className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              placeholder="you@example.com"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-[var(--accent)] text-black font-medium rounded-md px-3 py-2 text-sm hover:opacity-90"
            >
              Continue
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="w-full text-[var(--muted)] text-sm hover:text-white"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
