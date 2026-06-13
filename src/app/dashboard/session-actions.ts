"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("store_id", store.id)
    .eq("status", "active");

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase
      .from("sessions")
      .insert({ store_id: store.id, join_code: generateJoinCode() });
    if (!error || error.code !== "23505") break;
  }

  redirect("/dashboard/session");
}

export async function endSession(sessionId: string) {
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  redirect("/dashboard");
}
