"use client";

import { formatMoney, shortName } from "@/lib/user";
import type { Expense } from "@/lib/types";

const CATEGORIES = ["food", "travel", "groceries", "rent", "fun", "general"];

export function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    food: "bg-orange-500/20 text-orange-300",
    travel: "bg-sky-500/20 text-sky-300",
    groceries: "bg-emerald-500/20 text-emerald-300",
    rent: "bg-violet-500/20 text-violet-300",
    fun: "bg-pink-500/20 text-pink-300",
    general: "bg-slate-500/20 text-slate-300",
  };
  return map[cat] || map.general;
}

export function ExpenseRow({ e }: { e: Expense }) {
  return (
    <tr className="border-t text-sm hover:bg-white/5">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${categoryColor(
              e.category
            )}`}
          >
            {e.category}
          </span>
          {e.description && (
            <span className="text-[var(--muted)] truncate max-w-[180px]">
              {e.description}
            </span>
          )}
        </div>
      </td>
      <td className="py-2.5 pr-3">{shortName(e.paidBy)}</td>
      <td className="py-2.5 pr-3 text-right font-medium">
        {formatMoney(e.amount)}
      </td>
      <td className="py-2.5 pr-3 text-[var(--muted)] hidden sm:table-cell">
        {e.splitType} · {e.splits.length}
      </td>
      <td className="py-2.5 text-right text-xs text-[var(--muted)] whitespace-nowrap">
        {new Date(e.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}

export { CATEGORIES };
