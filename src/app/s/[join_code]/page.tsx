import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadRecapByJoinCode } from "@/lib/recap";
import { SessionRecapView } from "@/components/session-recap-view";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { ParticipantView } from "./participant-view";

export const metadata: Metadata = {
  title: "参加する",
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ join_code: string }>;
}) {
  const { join_code } = await params;
  const joinCode = join_code.trim().toUpperCase();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("join_code", joinCode)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  const session = sessions?.[0] ?? null;

  if (!session) {
    // 終了後もQRのURLは配られたまま残る。「見つかりません」で突き放すより、
    // その会の記録を見せたほうが体験として素直。
    const recap = await loadRecapByJoinCode(joinCode);
    if (recap) {
      return <SessionRecapView recap={recap} />;
    }

    return (
      <>
        <AmbientBackdrop videoId={null} />
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-3xl" aria-hidden>
            🔍
          </p>
          <h1 className="mt-4 text-xl font-bold">セッションが見つかりません</h1>
          <p className="mt-2 max-w-xs text-sm text-ink-muted">
            参加コードが正しいか、ホストがパーティーを開始しているかご確認ください。
          </p>
          <Link
            href="/"
            className="mt-6 rounded-full bg-surface-strong px-6 py-3 text-sm font-medium"
          >
            参加コードを入力しなおす
          </Link>
        </div>
      </>
    );
  }

  const { data: storeInfo } = await supabase
    .from("session_stores")
    .select("store_name")
    .eq("session_id", session.id)
    .maybeSingle();

  return (
    <ParticipantView
      sessionId={session.id}
      joinCode={joinCode}
      storeName={storeInfo?.store_name ?? ""}
    />
  );
}
