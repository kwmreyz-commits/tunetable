import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionPlayer } from "./session-player";

export default async function SessionPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_user_id", userData.user!.id)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, join_code, now_playing_video_id")
    .eq("store_id", store!.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  const session = sessions?.[0] ?? null;

  if (!session) {
    redirect("/dashboard");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  const joinUrl = `${protocol}://${host}/s/${session.join_code}`;

  return (
    <SessionPlayer
      sessionId={session.id}
      joinCode={session.join_code}
      joinUrl={joinUrl}
      initialVideoId={session.now_playing_video_id}
    />
  );
}
