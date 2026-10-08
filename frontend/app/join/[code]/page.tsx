"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiError, joinGroup } from "@/lib/api";
import { useUser } from "@/lib/user";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code ?? "";
  const { userId, ready } = useUser();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !userId) return;
    let active = true;
    joinGroup(code, userId)
      .then((group) => {
        if (active) router.replace(`/group/${group._id}`);
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      });
    return () => {
      active = false;
    };
  }, [ready, userId, code, router]);

  return (
    <div className="max-w-sm mx-auto mt-16 text-center space-y-3">
      <h1 className="text-xl font-semibold">Invite link</h1>
      <p className="text-sm text-[var(--muted)]">
        {error ||
          (!ready
            ? "Loading…"
            : !userId
              ? "Set your identity first, then reopen this invite link."
              : "Joining…")}
      </p>
    </div>
  );
}
