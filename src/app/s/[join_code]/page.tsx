import { createClient } from "@/lib/supabase/server";
import { ParticipantView } from "./participant-view";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ join_code: string }>;
}) {
  const { join_code } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("join_code", join_code)
    .eq("status", "active")
    .single();

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-xl font-bold text-zinc-900">セッションが見つかりません</h1>
        <p className="mt-2 text-sm text-zinc-600">
          QRコードまたはURLが正しいかご確認ください。
        </p>
      </div>
    );
  }

  const { data: storeInfo } = await supabase
    .from("session_stores")
    .select("store_name")
    .eq("session_id", session.id)
    .single();

  return <ParticipantView sessionId={session.id} storeName={storeInfo?.store_name ?? ""} />;
}
