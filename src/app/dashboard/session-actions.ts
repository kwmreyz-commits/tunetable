"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 見間違いやすい文字(0/O, 1/I/L)を除いた集合。
// 参加コードは口頭で伝えられることも多い。
const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

export async function startSession() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_user_id", userData.user!.id)
    .single();

  if (!store) {
    redirect("/dashboard");
  }

  // 開始前に前回のセッションを必ず閉じる。これを忘れると同一storeに
  // activeな行が積み上がり、アクティブセッションの取得が壊れる。
  await endActiveSessions(store.id);

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase
      .from("sessions")
      .insert({ store_id: store.id, join_code: generateJoinCode() });
    if (!error || error.code !== "23505") break;
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/session");
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();

  // 再生中だった曲を played に落としてから終了する。
  // playing のまま残すと振り返りの集計にも「まだ流れている」ように見える。
  await supabase
    .from("requests")
    .update({ status: "played" })
    .eq("session_id", sessionId)
    .eq("status", "playing");

  await supabase
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      now_playing_video_id: null,
      now_playing_started_at: null,
    })
    .eq("id", sessionId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

async function endActiveSessions(storeId: string) {
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("sessions")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "active");

  for (const session of active ?? []) {
    await supabase
      .from("requests")
      .update({ status: "played" })
      .eq("session_id", session.id)
      .eq("status", "playing");
  }

  await supabase
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      now_playing_video_id: null,
      now_playing_started_at: null,
    })
    .eq("store_id", storeId)
    .eq("status", "active");
}

/**
 * ホストのプロフィールとNGワード設定。
 * `stores.ng_words` は初期スキーマから存在していたが使われていなかった列で、
 * 二次会などで露骨なタイトルの動画を弾きたいという実際の要求に応える。
 */
export async function updateHostSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const ngWordsRaw = String(formData.get("ngWords") ?? "");
  const ngWords = ngWordsRaw
    .split(/[\n,、]/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .slice(0, 50);

  const update: { name?: string; ng_words: string[] } = { ng_words: ngWords };
  if (name.length > 0) update.name = name;

  await supabase.from("stores").update(update).eq("owner_user_id", userData.user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard?saved=1");
}
