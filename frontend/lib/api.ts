import axios from "axios";
import type {
  BalancesResponse,
  Expense,
  Group,
  Settlement,
  SplitType,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({ baseURL: `${API_URL}/api` });

export async function createGroup(input: {
  name: string;
  type: string;
  members: string[];
  createdBy: string;
}): Promise<Group> {
  const { data } = await api.post("/groups/create", input);
  return data;
}

export async function listGroups(userId: string): Promise<Group[]> {
  const { data } = await api.get("/groups/list", { params: { userId } });
  return data;
}

export async function getGroup(id: string): Promise<Group> {
  const { data } = await api.get(`/groups/${id}`);
  return data;
}

export async function joinGroup(inviteCode: string, userId: string) {
  const { data } = await api.post("/groups/join", { inviteCode, userId });
  return data as Group;
}

export async function createExpense(input: {
  groupId: string;
  paidBy: string;
  amount: number;
  category?: string;
  description?: string;
  splitType: SplitType;
  splits?: { userId: string; amount?: number; percent?: number }[];
}): Promise<Expense> {
  const { data } = await api.post("/expenses/create", input);
  return data;
}

export async function listExpenses(groupId: string): Promise<Expense[]> {
  const { data } = await api.get("/expenses/list", { params: { groupId } });
  return data;
}

export async function expenseHistory(params: {
  userId?: string;
  groupId?: string;
  category?: string;
}): Promise<Expense[]> {
  const { data } = await api.get("/expenses/history", { params });
  return data;
}

export async function getBalances(groupId: string): Promise<BalancesResponse> {
  const { data } = await api.get(`/balances/${groupId}`);
  return data;
}

export async function createSettlement(input: {
  groupId: string;
  from: string;
  to: string;
  amount: number;
}): Promise<Settlement> {
  const { data } = await api.post("/settle/create", input);
  return data;
}

export async function listSettlements(groupId: string): Promise<Settlement[]> {
  const { data } = await api.get("/settle/list", { params: { groupId } });
  return data;
}

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err))
    return err.response?.data?.error || err.message;
  return err instanceof Error ? err.message : "Something went wrong";
}
