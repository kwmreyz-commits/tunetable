import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { startSession, endSession } from "./session-actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_user_id", userData.user!.id)
    .single();

  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, join_code")
    .eq("store_id", store!.id)
    .eq("status", "active")
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {store?.name ?? "ホスト"} ダッシュボード
          </h1>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              ログアウト
            </button>
          </form>
        </div>

        <p className="mt-2 text-sm text-zinc-600">{userData.user?.email}</p>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          {activeSession ? (
            <div>
              <p className="text-sm text-zinc-600">
                セッション開催中です。参加コード:{" "}
                <span className="font-mono font-bold">{activeSession.join_code}</span>
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/dashboard/session"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  再生ページを開く
                </Link>
                <form action={endSession.bind(null, activeSession.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                  >
                    セッションを終了
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-600">
                セッションを開始すると、参加者用のQRコードが発行されます。
              </p>
              <form action={startSession} className="mt-4">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  セッションを開始
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
