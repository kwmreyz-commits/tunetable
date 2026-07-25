import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * セッションの振り返り(パーティーリワインド)データ。
 *
 * `sessions` のRLSはactiveなセッションしかanonに見せないため、
 * 終了後のページは service role で組み立てて必要な項目だけを返す。
 * 参加コードを知っている人しか到達できないURLなので、
 * 参加者がその場の記録を後から見返せる導線として使う。
 *
 * 「流れた順」は保持していない(再生順を記録する列がない)ので、
 * 得票順=「盛り上がった順」で見せる。順序を捏造するより素直で、
 * 振り返りとしてもこちらのほうが面白い。
 */

export interface RecapTrack {
  id: string;
  trackName: string;
  artistName: string;
  videoId: string | null;
  thumbnailUrl: string | null;
  voteCount: number;
  requestedBy: string;
  durationSeconds: number;
}

export interface RecapRequester {
  anonymousId: string;
  requestCount: number;
  votesReceived: number;
}

export interface SessionRecap {
  joinCode: string;
  storeName: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  playedTracks: RecapTrack[];
  totalPlayed: number;
  totalRequested: number;
  totalVotes: number;
  participantCount: number;
  playedSeconds: number;
  topRequesters: RecapRequester[];
}

export async function loadRecapByJoinCode(
  joinCode: string,
): Promise<SessionRecap | null> {
  const supabase = createServiceRoleClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, store_id, status, join_code, started_at, ended_at")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (!session) return null;

  const [{ data: store }, { data: requests }] = await Promise.all([
    supabase.from("stores").select("name").eq("id", session.store_id).maybeSingle(),
    supabase
      .from("requests")
      .select(
        "id, track_name, artist_name, video_id, thumbnail_url, status, requested_by, duration_ms",
      )
      .eq("session_id", session.id),
  ]);

  const rows = requests ?? [];
  const ids = rows.map((row) => row.id);

  let votes: { request_id: string; voter_anonymous_id: string }[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("votes")
      .select("request_id, voter_anonymous_id")
      .in("request_id", ids);
    votes = data ?? [];
  }

  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    voteCounts.set(vote.request_id, (voteCounts.get(vote.request_id) ?? 0) + 1);
  }

  const playedTracks: RecapTrack[] = rows
    .filter((row) => row.status === "played" || row.status === "playing")
    .map((row) => ({
      id: row.id,
      trackName: row.track_name,
      artistName: row.artist_name,
      videoId: row.video_id,
      thumbnailUrl: row.thumbnail_url,
      voteCount: voteCounts.get(row.id) ?? 0,
      requestedBy: row.requested_by,
      durationSeconds: Math.round(row.duration_ms / 1000),
    }))
    .sort((a, b) => b.voteCount - a.voteCount || a.trackName.localeCompare(b.trackName));

  const requesterStats = new Map<string, RecapRequester>();
  for (const row of rows) {
    if (row.status === "removed") continue;
    const current = requesterStats.get(row.requested_by) ?? {
      anonymousId: row.requested_by,
      requestCount: 0,
      votesReceived: 0,
    };
    current.requestCount += 1;
    current.votesReceived += voteCounts.get(row.id) ?? 0;
    requesterStats.set(row.requested_by, current);
  }

  // 参加者数は「曲を入れた人」と「投票した人」の和集合で数える。
  // 聴いているだけの人は把握できないので、あくまで参加した人数。
  const participants = new Set<string>([
    ...rows.map((row) => row.requested_by),
    ...votes.map((vote) => vote.voter_anonymous_id),
  ]);

  return {
    joinCode: session.join_code,
    storeName: store?.name ?? "パーティー",
    startedAt: session.started_at,
    endedAt: session.ended_at,
    isActive: session.status === "active",
    playedTracks,
    totalPlayed: playedTracks.length,
    totalRequested: rows.filter((row) => row.status !== "removed").length,
    totalVotes: votes.length,
    participantCount: participants.size,
    playedSeconds: playedTracks.reduce((total, track) => total + track.durationSeconds, 0),
    topRequesters: [...requesterStats.values()]
      .sort(
        (a, b) => b.requestCount - a.requestCount || b.votesReceived - a.votesReceived,
      )
      .slice(0, 5),
  };
}
