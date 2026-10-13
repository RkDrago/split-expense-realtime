"use client";

import { useState } from "react";
import {
  saveUser,
  settingsKeys,
  useSetting,
  useUser,
} from "@/lib/user";

export default function SettingsPage() {
  const { user, ready } = useUser();
  const [notify, setNotify] = useSetting<boolean>(
    settingsKeys.notify,
    true,
    (r) => r === "true"
  );
  const [upiId, setUpiId] = useSetting<string>(settingsKeys.upi, "", (r) => r);
  const [saved, setSaved] = useState("");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Profile, notifications and payment preferences. Stored locally in
          your browser.
        </p>
      </div>

      <ProfileForm key={user?.email ?? "anonymous"} ready={ready} user={user} />

      <div className="bg-[var(--panel)] border rounded-xl p-5 space-y-4">
        <h2 className="font-medium">Preferences</h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm">
            Notifications
            <span className="block text-xs text-[var(--muted)]">
              Get notified when someone adds an expense in your groups
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            onClick={() => setNotify(!notify)}
            className={`w-11 h-6 rounded-full transition relative ${
              notify ? "bg-[var(--accent-2)]" : "bg-[var(--panel-2)] border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                notify ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </label>

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]">UPI ID</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setSaved("UPI ID saved");
                setTimeout(() => setSaved(""), 2000);
              }}
              className="border rounded-md px-3 text-sm hover:bg-white/5"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Shown as a pay button next to transfers on the Balances page.
          </p>
        </div>

        {saved && <p className="text-xs text-[var(--accent-2)]">{saved}</p>}
      </div>
    </div>
  );
}

function ProfileForm({
  ready,
  user,
}: {
  ready: boolean;
  user: ReturnType<typeof useUser>["user"];
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      setMessage("");
      return;
    }
    const saved = saveUser({
      name: name.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
    });
    if (!saved) {
      setError("Could not save profile in this browser. Enable site storage and try again.");
      setMessage("");
      return;
    }
    setError("");
    setMessage("Profile saved");
  }

  return (
    <form
      onSubmit={saveProfile}
      className="bg-[var(--panel)] border rounded-xl p-5 space-y-4"
    >
      <h2 className="font-medium">Profile</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
            placeholder="Your name"
            value={ready ? name : ""}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]" htmlFor="profile-email">
            Email (your id)
          </label>
          <input
            id="profile-email"
            type="email"
            required
            className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
            placeholder="you@example.com"
            value={ready ? email : ""}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <button
        type="submit"
        className="bg-[var(--accent)] text-black font-medium rounded-md px-4 py-2 text-sm hover:opacity-90"
      >
        Save profile
      </button>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {message && <p className="text-xs text-[var(--accent-2)]">{message}</p>}
    </form>
  );
}
