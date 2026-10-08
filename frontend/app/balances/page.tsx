"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  apiError,
  createSettlement,
  getBalances,
  listGroups,
} from "@/lib/api";
import type { BalancesResponse, Group } from "@/lib/types";
import {
  formatMoney,
  shortName,
  useSetting,
  settingsKeys,
  upiLink,
  useUser,
} from "@/lib/user";

function BalancesInner() {
  const searchParams = useSearchParams();
  const { userId, ready } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState(searchParams.get("group") || "");
  const [data, setData] = useState<BalancesResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [upiId] = useSetting<string>(settingsKeys.upi, "", (r) => r);

  // fall back to the first group when none chosen explicitly
  const activeGroupId = groupId || groups[0]?._id || "";

  const load = useCallback(async () => {
    if (!activeGroupId) return;
    setLoading(true);
    try {
      setData(await getBalances(activeGroupId));
      setError("");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [activeGroupId]);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    listGroups(userId)
      .then((list) => {
        if (active) setGroups(list);
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      });
    return () => {
      active = false;
    };
  }, [ready, userId]);

  useEffect(() => {
    if (!activeGroupId) return;
    let active = true;
    getBalances(activeGroupId)
      .then((res) => {
        if (active) {
          setData(res);
          setError("");
        }
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
  }, [activeGroupId]);

  async function settle(from: string, to: string, amount: number) {
    if (!activeGroupId) return;
    setPaying(from + to);
    try {
      await createSettlement({ groupId: activeGroupId, from, to, amount });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Balances</h1>
          <p className="text-sm text-[var(--muted)]">
            Simplified — fewest transfers to settle everyone up.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]">Group</label>
          <select
            className="bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm min-w-[200px]"
            value={activeGroupId}
            onChange={(e) => {
              setLoading(true);
              setGroupId(e.target.value);
            }}
          >
            <option value="" disabled>
              Select group
            </option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!activeGroupId ? (
        <p className="text-sm text-[var(--muted)]">
          Create a group first to see balances.
        </p>
      ) : loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : data ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(data.balances).map(([member, bal]) => (
              <div
                key={member}
                className="bg-[var(--panel)] border rounded-xl p-4"
              >
                <p className="text-sm text-[var(--muted)] truncate">
                  {shortName(member)}
                </p>
                <p
                  className={`text-xl font-semibold ${
                    bal > 0
                      ? "text-[var(--accent-2)]"
                      : bal < 0
                        ? "text-[var(--danger)]"
                        : ""
                  }`}
                >
                  {formatMoney(bal)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {bal > 0.009
                    ? "is owed"
                    : bal < -0.009
                      ? "owes"
                      : "settled up"}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-[var(--panel)] border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h2 className="font-medium">Who owes whom</h2>
            </div>
            {data.transfers.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted)]">
                🎉 All settled up — no transfers needed.
              </p>
            ) : (
              <table className="w-full">
                <thead className="text-xs text-[var(--muted)]">
                  <tr className="border-b">
                    <th className="text-left font-normal px-5 py-2">From</th>
                    <th className="text-left font-normal px-2 py-2">To</th>
                    <th className="text-right font-normal px-2 py-2">Amount</th>
                    <th className="text-right font-normal px-5 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.transfers.map((t, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-5 py-3 text-sm">
                        {shortName(t.from)}
                      </td>
                      <td className="px-2 py-3 text-sm">{shortName(t.to)}</td>
                      <td className="px-2 py-3 text-sm text-right font-medium">
                        {formatMoney(t.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              settle(t.from, t.to, t.amount)
                            }
                            disabled={paying === t.from + t.to}
                            className="text-xs bg-[var(--accent-2)] text-black font-medium rounded px-2.5 py-1.5 disabled:opacity-50 hover:opacity-90"
                          >
                            {paying === t.from + t.to
                              ? "Settling…"
                              : "Settle"}
                          </button>
                          {upiId && (
                            <a
                              href={upiLink(
                                upiId,
                                t.amount,
                                `Settle ${data.group.name}`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs border rounded px-2.5 py-1.5 hover:bg-white/5"
                            >
                              UPI
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!upiId && (
              <p className="px-5 pb-4 text-xs text-[var(--muted)]">
                Set your UPI ID in{" "}
                <a href="/settings" className="text-[var(--accent)]">
                  Settings
                </a>{" "}
                to show a payment QR/link here.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function BalancesPage() {
  return (
    <Suspense>
      <BalancesInner />
    </Suspense>
  );
}
