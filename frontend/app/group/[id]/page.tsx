"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiError,
  createExpense,
  getGroup,
  listExpenses,
} from "@/lib/api";
import type { Expense, Group, SplitType } from "@/lib/types";
import { formatMoney, shortName, useUser } from "@/lib/user";
import { ExpenseRow, CATEGORIES } from "@/components/ExpenseRow";
import { getSocket, joinGroupRoom } from "@/lib/socket";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id ?? "";
  const { userId } = useUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // expense form
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [unequal, setUnequal] = useState<Record<string, string>>({});
  const [percent, setPercent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    Promise.all([getGroup(groupId), listExpenses(groupId)])
      .then(([g, ex]) => {
        if (!active) return;
        setGroup(g);
        setExpenses(ex);
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
  }, [groupId]);

  // realtime: join room, listen for new expenses
  useEffect(() => {
    if (!groupId) return;
    const leave = joinGroupRoom(groupId);
    const s = getSocket();
    const onExpense = (e: Expense) => {
      setExpenses((prev) =>
        prev.some((x) => x._id === e._id) ? prev : [e, ...prev]
      );
      setToast(`New expense: ${formatMoney(e.amount)} by ${shortName(e.paidBy)}`);
      setTimeout(() => setToast(""), 3000);
    };
    s.on(`group:${groupId}:expense`, onExpense);
    return () => {
      s.off(`group:${groupId}:expense`, onExpense);
      leave();
    };
  }, [groupId]);

  const members = useMemo(() => group?.members ?? [], [group]);
  // default payer to current user until explicitly chosen
  const effectivePaidBy =
    paidBy || (userId && members.includes(userId) ? userId : "");

  const unequalTotal = useMemo(
    () =>
      members.reduce(
        (a, m) => a + (Number(unequal[m]) || 0),
        0
      ),
    [members, unequal]
  );
  const percentTotal = useMemo(
    () => members.reduce((a, m) => a + (Number(percent[m]) || 0), 0),
    [members, percent]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !effectivePaidBy) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createExpense({
        groupId: group._id,
        paidBy: effectivePaidBy,
        amount: amt,
        category,
        description: description.trim(),
        splitType,
        splits:
          splitType === "unequal"
            ? members.map((m) => ({
                userId: m,
                amount: Number(unequal[m]) || 0,
              }))
            : splitType === "percent"
              ? members.map((m) => ({
                  userId: m,
                  percent: Number(percent[m]) || 0,
                }))
              : undefined,
      });
      setAmount("");
      setDescription("");
      setUnequal({});
      setPercent({});
      setFormOpen(false);
      // realtime listener also catches it, but refresh to be safe
      const ex = await listExpenses(group._id);
      setExpenses(ex);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <p className="text-sm text-[var(--muted)]">Loading group…</p>;
  if (!group)
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--danger)]">
          {error || "Group not found"}
        </p>
        <Link href="/groups" className="text-sm text-[var(--accent)]">
          ← Back to groups
        </Link>
      </div>
    );

  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[var(--accent-2)] text-black text-sm font-medium px-4 py-2 rounded-lg shadow-lg z-40">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border text-[var(--muted)]">
              {group.type}
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {members.map(shortName).join(", ")} · total{" "}
            <span className="text-white">{formatMoney(total)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/balances?group=${group._id}`}
            className="border rounded-md px-3 py-2 text-sm hover:bg-white/5"
          >
            Balances
          </Link>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="bg-[var(--accent)] text-black font-medium rounded-md px-4 py-2 text-sm hover:opacity-90"
          >
            {formOpen ? "Close" : "+ Add Expense"}
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={submit}
          className="bg-[var(--panel)] border rounded-xl p-5 space-y-4"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)]">Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)]">Paid by</label>
              <select
                className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
                value={effectivePaidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select member
                </option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {shortName(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)]">Category</label>
              <select
                className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)]">
                Split type
              </label>
              <select
                className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
              >
                <option value="equal">Equal</option>
                <option value="unequal">Unequal</option>
                <option value="percent">Percent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--muted)]">Description</label>
            <input
              className="w-full bg-[var(--panel-2)] border rounded-md px-3 py-2 text-sm"
              placeholder="Dinner at beach shack"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {splitType === "unequal" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-sm w-24 truncate">{shortName(m)}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="flex-1 bg-[var(--panel-2)] border rounded-md px-3 py-1.5 text-sm"
                    value={unequal[m] ?? ""}
                    onChange={(e) =>
                      setUnequal({ ...unequal, [m]: e.target.value })
                    }
                  />
                </div>
              ))}
              <p className="text-xs text-[var(--muted)] sm:col-span-2 lg:col-span-3">
                Total: {formatMoney(unequalTotal)}
                {amount && ` / ${formatMoney(Number(amount) || 0)}`}
                {amount &&
                  Math.abs(unequalTotal - Number(amount)) < 0.01 && (
                    <span className="text-[var(--accent-2)] ml-2">✓ matches</span>
                  )}
              </p>
            </div>
          )}

          {splitType === "percent" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-sm w-24 truncate">{shortName(m)}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    className="flex-1 bg-[var(--panel-2)] border rounded-md px-3 py-1.5 text-sm"
                    value={percent[m] ?? ""}
                    onChange={(e) =>
                      setPercent({ ...percent, [m]: e.target.value })
                    }
                  />
                  <span className="text-xs text-[var(--muted)]">%</span>
                </div>
              ))}
              <p className="text-xs text-[var(--muted)] sm:col-span-2 lg:col-span-3">
                Total: {percentTotal}%
                {Math.abs(percentTotal - 100) < 0.01 && (
                  <span className="text-[var(--accent-2)] ml-2">✓ 100%</span>
                )}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--accent-2)] text-black font-medium rounded-md px-4 py-2 text-sm disabled:opacity-50 hover:opacity-90"
          >
            {saving ? "Saving…" : "Save expense"}
          </button>
        </form>
      )}

      <div className="bg-[var(--panel)] border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium">Expenses</h2>
          <span className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-2)] inline-block" />
            live
          </span>
        </div>
        {expenses.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">
            No expenses yet — add the first one.
          </p>
        ) : (
          <div className="px-5 pb-2">
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
              <tbody>
                {expenses.map((e) => (
                  <ExpenseRow key={e._id} e={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
