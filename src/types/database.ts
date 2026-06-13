export type RequestStatus = "queued" | "playing" | "played" | "removed";
export type SessionStatus = "active" | "ended";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          spotify_user_id: string | null;
          spotify_refresh_token: string | null;
          block_explicit: boolean;
          ng_words: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          spotify_user_id?: string | null;
          spotify_refresh_token?: string | null;
          block_explicit?: boolean;
          ng_words?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          spotify_user_id?: string | null;
          spotify_refresh_token?: string | null;
          block_explicit?: boolean;
          ng_words?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          store_id: string;
          status: SessionStatus;
          join_code: string;
          started_at: string;
          ended_at: string | null;
          now_playing_video_id: string | null;
          now_playing_started_at: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          status?: SessionStatus;
          join_code: string;
          started_at?: string;
          ended_at?: string | null;
          now_playing_video_id?: string | null;
          now_playing_started_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          status?: SessionStatus;
          join_code?: string;
          started_at?: string;
          ended_at?: string | null;
          now_playing_video_id?: string | null;
          now_playing_started_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: {
          id: string;
          session_id: string;
          spotify_track_id: string;
          track_name: string;
          artist_name: string;
          album_art_url: string | null;
          duration_ms: number;
          requested_by: string;
          status: RequestStatus;
          created_at: string;
          video_id: string | null;
          thumbnail_url: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          spotify_track_id: string;
          track_name: string;
          artist_name: string;
          album_art_url?: string | null;
          duration_ms: number;
          requested_by: string;
          status?: RequestStatus;
          created_at?: string;
          video_id?: string | null;
          thumbnail_url?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          spotify_track_id?: string;
          track_name?: string;
          artist_name?: string;
          album_art_url?: string | null;
          duration_ms?: number;
          requested_by?: string;
          status?: RequestStatus;
          created_at?: string;
          video_id?: string | null;
          thumbnail_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "requests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      votes: {
        Row: {
          id: string;
          request_id: string;
          voter_anonymous_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          voter_anonymous_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          voter_anonymous_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      session_stores: {
        Row: {
          session_id: string;
          store_name: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
