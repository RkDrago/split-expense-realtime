"use client";

import { useEffect, useState } from "react";
import { apiError, expenseHistory, listGroups } from "@/lib/api";
import type { Expense, Group } from "@/lib/types";
import { useUser } from "@/lib/user";
import { ExpenseRow, CATEGORIES } from "@/components/ExpenseRow";

export default function ActivityPage() {
  const { userId, ready } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupId, setGroupId] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && userId) {
      listGroups(userId)
        .then(setGroups)
        .catch((err) => setError(apiError(err)));
    }
  }, [ready, userId]);

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    expenseHistory({
      userId,
      groupId: groupId || undefined,
      category: category || undefined,
    })
      .then((list) => {
        if (active) {
          setExpenses(list);
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
  }, [ready, userId, groupId, category]);

  const groupName = (id: string) =>
    groups.find((g) => g._id === id)?.name ?? "Unknown group";

  const filtered = query.trim()
    ? expenses.filter(
        (e) =>
          e.description.toLowerCase().includes(query.toLowerCase()) ||
          e.paidBy.toLowerCase().includes(query.toLowerCase()) ||
          e.category.toLowerCase().includes(query.toLowerCase())
      )
    : expenses;

  const total = filtered.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-[var(--muted)]">
          Expense history across your groups.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]">Group</label>
          <select
            className="bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)]">Category</label>
          <select
            className="bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs text-[var(--muted)]">Search</label>
          <input
            className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
            placeholder="description, member, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="bg-[var(--panel)] border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium">Expenses history</h2>
          <span className="text-xs text-[var(--muted)]">
            {filtered.length} items · {formatAmount(total)}
          </span>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-[var(--muted)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">
            No expenses match your filters.
          </p>
        ) : (
          <div className="px-5 pb-2 overflow-x-auto">
            <table className="w-full">
              <thead className="text-xs text-[var(--muted)]">
                <tr>
                  <th className="text-left font-normal py-2">Expense</th>
                  <th className="text-left font-normal py-2 pr-3">Paid by</th>
                  <th className="text-right font-normal py-2 pr-3">Amount</th>
                  <th className="text-left font-normal py-2 pr-3 hidden sm:table-cell">
                    Split
                  </th>
                  <th className="text-right font-normal py-2">When</th>
                </tr>
              </thead>
            </table>
            <GroupedTable items={filtered} nameOf={groupName} />
          </div>
        )}
      </div>
    </div>
  );
}

function GroupedTable({
  items,
  nameOf,
}: {
  items: Expense[];
  nameOf: (id: string) => string;
}) {
  // group consecutive expenses by groupId
  const sections: { id: string; list: Expense[] }[] = [];
  for (const e of items) {
    const last = sections[sections.length - 1];
    if (last && last.id === e.groupId) last.list.push(e);
    else sections.push({ id: e.groupId, list: [e] });
  }
  return (
    <div className="space-y-4 pb-2">
      {sections.map((s) => (
        <div key={s.id}>
          <p className="text-[11px] uppercase tracking-wide text-[var(--muted)] pt-2">
            {nameOf(s.id)}
          </p>
          <table className="w-full">
            <tbody>
              {s.list.map((e) => (
                <ExpenseRow key={e._id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function formatAmount(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
