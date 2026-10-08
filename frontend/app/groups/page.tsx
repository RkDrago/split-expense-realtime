"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiError, createGroup, listGroups } from "@/lib/api";
import type { Group } from "@/lib/types";
import { useUser, shortName } from "@/lib/user";

export default function GroupsPage() {
  const { userId, user, ready } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create form
  const [name, setName] = useState("");
  const [type, setType] = useState("trip");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setGroups(await listGroups(userId));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listGroups(userId)
      .then((list) => {
        if (active) setGroups(list);
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, userId]);

  function addMember() {
    const email = memberInput.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Enter a valid email for member");
      return;
    }
    if (!members.includes(email)) setMembers([...members, email]);
    setMemberInput("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    setCreating(true);
    setError("");
    try {
      await createGroup({
        name: name.trim(),
        type,
        members,
        createdBy: userId,
      });
      setName("");
      setMembers([]);
      setMemberInput("");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Groups</h1>
        <p className="text-sm text-[var(--muted)]">
          Create a trip or flat group, add members by email, share the invite
          link.
        </p>
      </div>

      <div className="grid md:grid-cols-[380px_1fr] gap-6 items-start">
        <form
          onSubmit={submit}
          className="bg-[var(--panel)] border rounded-xl p-5 space-y-4"
        >
          <h2 className="font-medium">New group</h2>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--muted)]">Group name</label>
            <input
              className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              placeholder="Goa Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--muted)]">Type</label>
            <select
              className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="trip">Trip</option>
              <option value="flat">Flat</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--muted)]">
              Add members (email)
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
                placeholder="friend@example.com"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
              <button
                type="button"
                onClick={addMember}
                className="border rounded-md px-3 text-sm hover:bg-white/5"
              >
                Add
              </button>
            </div>
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {members.map((m) => (
                  <span
                    key={m}
                    className="text-xs bg-[var(--panel-2)] border rounded-full px-2 py-0.5 flex items-center gap-1"
                  >
                    {shortName(m)}
                    <button
                      type="button"
                      aria-label={`remove ${m}`}
                      className="text-[var(--muted)] hover:text-[var(--danger)]"
                      onClick={() =>
                        setMembers(members.filter((x) => x !== m))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full bg-[var(--accent)] text-black font-medium rounded-md px-3 py-2 text-sm disabled:opacity-50 hover:opacity-90"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </form>

        <div className="bg-[var(--panel)] border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-medium">Your groups</h2>
            <button
              onClick={load}
              className="text-xs text-[var(--muted)] hover:text-white"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-[var(--muted)]">Loading…</p>
          ) : groups.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">
              {userId
                ? "No groups yet — create your first one."
                : "Set your identity to see groups."}
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b">
                  <th className="text-left font-normal px-5 py-2">Name</th>
                  <th className="text-left font-normal px-2 py-2">Type</th>
                  <th className="text-left font-normal px-2 py-2">Members</th>
                  <th className="text-left font-normal px-2 py-2">Invite</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g._id} className="border-b last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3">
                      <Link
                        href={`/group/${g._id}`}
                        className="text-sm font-medium hover:text-[var(--accent)]"
                      >
                        {g.name}
                      </Link>
                      {user && g.members.includes(userId) && (
                        <span className="ml-2 text-[10px] text-[var(--accent-2)]">
                          member
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border text-[var(--muted)]">
                        {g.type}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-[var(--muted)]">
                      {g.members.length}
                    </td>
                    <td className="px-2 py-3">
                      <CopyInvite code={g.inviteCode} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          /* clipboard unavailable */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs border rounded px-2 py-1 hover:bg-white/5"
      title={link}
    >
      {copied ? "Copied!" : "Copy invite"}
    </button>
  );
}
