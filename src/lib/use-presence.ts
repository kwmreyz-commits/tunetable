"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * セッションに何人つながっているかをSupabase Realtimeのpresenceで数える。
 *
 * ホスト画面に「いま何人が参加中か」が出ると、
 * ホストはQRを配り直すべきか判断できるし、テレビに出ていると
 * 参加していない人が「自分も入れるのか」と気づくきっかけになる。
 *
 * @param selfKey 自分を識別するキー。nullの間は購読しない
 * @param shouldTrack 自分を人数に含めるか(ホスト画面はfalseにする)
 */
export function usePresenceCount(
  sessionId: string,
  selfKey: string | null,
  shouldTrack: boolean,
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!selfKey) return;

    const supabase = createClient();
    const channel = supabase.channel(`party-presence-${sessionId}`, {
      config: { presence: { key: selfKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && shouldTrack) {
          void channel.track({ joinedAt: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, selfKey, shouldTrack]);

  return count;
}
