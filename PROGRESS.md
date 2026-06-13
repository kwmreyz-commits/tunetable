# TuneTable 実装進捗

## ステータス概要

**ステップ1〜5'は完了済み。次のタスクはステップ6'(投票機能の仕上げ: 5分3曲のレート制限、ホスト側でのキュー削除機能)。**

- ステップ1・2: 完了(プロジェクト基盤・DBスキーマ、ホスト account登録/ログイン)
- ステップ3: Spotify版は破棄。YouTube版(ステップ3')に変更し、実装完了。
- ステップ3'(YouTube動画検索): 完了
- ステップ4'(参加者側ページ更新): 完了
- ステップ5'(再生ページ): 完了
- マイグレーション 0001〜0005 はすべてSupabaseに適用済み

## 完了したステップ

### ステップ1: プロジェクト基盤・DBスキーマ
- Next.js 16.2.9 (App Router, Turbopack) プロジェクト作成
- Supabaseプロジェクト作成、`.env.local`に接続情報を設定
- `supabase/migrations/0001_init.sql` 適用済み
  - `stores` / `sessions` / `requests` / `votes` テーブル、RLSポリシー一式

### ステップ2: ホスト(店舗)アカウント登録・ログイン
- Supabase Authを使った signup / login / logout を実装
- `supabase/migrations/0002_store_signup_trigger.sql` 適用済み
  - `auth.users` への insert で `public.stores` 行を自動作成するトリガー
- サインアップ→ログイン→ダッシュボード表示→ログアウト→ルート保護まで動作確認済み

## 変更: v2仕様への方向転換

途中から方針変更。詳細は [bgm-request-app-spec-v2.md](./bgm-request-app-spec-v2.md) を参照。

- 対象をレストランのBGMリクエスト(Spotify連携・JASRAC等の制約あり)から、
  プライベートな集まり・パーティー向けの「みんなで選ぶ音楽・動画キューアプリ」に変更
- 音楽プロバイダをSpotify(OAuth)からYouTube Data API v3(APIキーのみ)に変更
- 用語変更: 店舗→ホスト、お客さん/客→参加者(DBのテーブル名は変更なし)
- ステップ3(Spotify連携・検索)は破棄し、ステップ3'(YouTube動画検索)として再実装

### 実施済みのクリーンアップ
- `.env.local` / `.env.local.example`: Spotify関連の環境変数(SPOTIFY_CLIENT_ID等、ENCRYPTION_KEY)を削除し、`YOUTUBE_API_KEY`を追加
- `next.config.ts`: 画像remotePatternsのhostnameを `i.scdn.co` → `i.ytimg.com` に変更
- `src/app/page.tsx`: トップページの文言を参加者/ホスト向けに更新
- `src/app/layout.tsx`: メタデータのdescriptionを更新
- `src/app/dashboard/page.tsx`: 文言を「店舗」→「ホスト」に更新、Spotify連携への言及を削除
- `src/types/database.ts`: `spotify_*` 列は仕様書の指示により残置(将来削除可)

## 完了: ステップ3' (YouTube動画検索)

- `supabase/migrations/0003_youtube_columns.sql` を作成
  - `requests.video_id` / `requests.thumbnail_url`
  - `sessions.now_playing_video_id` / `now_playing_started_at`
  - Supabase側に適用済み
- `src/types/database.ts` を新カラムに対応させて更新
- `src/lib/music-provider/types.ts`: `MusicProvider` / `TrackResult` インターフェースを定義(将来Spotify等の追加にも対応できる抽象化)
- `src/lib/music-provider/youtube.ts`: `YouTubeProvider` を実装。YouTube Data API v3 の `search.list` を呼び出し、結果を10分間メモリキャッシュ(クォータ節約)
- `src/app/api/search/route.ts`: `/api/search?q=...` のRoute Handler。APIキーはサーバー側のみで使用し、クライアントには露出しない
- `.env.local` に `YOUTUBE_API_KEY` 設定済み、`npm run build` 成功、`/api/search?q=test` で実際に検索結果が返ることを確認済み

## 完了: ステップ4' (参加者側ページ更新)

- `src/app/s/[join_code]/page.tsx`: join_codeからアクティブなセッションを取得するServer Component(認証不要)
  - セッションが見つからない場合は「セッションが見つかりません」を表示
- `src/app/s/[join_code]/participant-view.tsx`: 参加者UI(Client Component)
  - 現在再生中の動画(サムネイル・タイトル・アーティスト)を表示
  - キュー一覧を投票数降順で表示、投票ボタン(トグルで投票/取消)
  - 匿名ID(`src/lib/anonymous-id.ts`、localStorageにUUIDを保存)で投票・リクエストを識別
  - `sessions` / `requests` / `votes` テーブルをRealtime購読し自動更新
- `src/app/s/[join_code]/search-modal.tsx`: `/api/search`を呼び出すYouTube検索モーダル。選択した動画を`requests`にinsert(`video_id`/`thumbnail_url`を保存)
- `supabase/migrations/0004_enable_realtime.sql`: `sessions`/`requests`/`votes`をRealtime publicationに追加(参加者ページの自動更新に必要)
- `supabase/migrations/0005_session_store_view.sql`: `session_stores`ビューを追加
  - `stores`テーブルはオーナー専用RLSのため、anonユーザーはホスト名を取得できない
  - アクティブセッションに紐づく店舗名のみを限定公開するビューを作成し、`database.ts`の`Views`に型を追加
- 検証: `tsc`/`eslint`/`npm run build`成功。テスト用のホスト・セッションを作成し、anonキーで以下を確認:
  - リクエスト追加(insert)、投票(insert)、同一動画の重複リクエスト防止(unique制約)が正常動作
  - 参加者ページ(`/s/TEST1234`)が正しくレンダリングされ、`session_stores`ビュー経由でホスト名も表示されることを確認

## 完了: ステップ5' (再生ページ)

- `src/app/dashboard/session-actions.ts`: `startSession`(セッション開始・join_code発行)/`endSession`(セッション終了)のServer Action
- `src/app/dashboard/page.tsx`: アクティブなセッションの有無に応じて「セッションを開始」または「参加コード表示・再生ページへのリンク・セッション終了」を表示
- `src/app/dashboard/session/page.tsx`: アクティブセッションを取得し、QRコード用URL(`/s/[join_code]`、`headers()`からホスト名を取得して構築)を`SessionPlayer`に渡す。アクティブセッションがなければ`/dashboard`にリダイレクト
- `src/app/dashboard/session/session-player.tsx`: 再生ページ本体(Client Component)
  - YouTube IFrame Player APIを動的ロードして埋め込み
  - `qrcode.react`の`QRCodeSVG`で参加者用QRコードを表示
  - キュー一覧を投票数降順で表示(`requests`/`votes`をRealtime購読)
  - 「再生開始」ボタン(初回はホストの操作が必要、自動再生制限への対応)
  - `onStateChange`で`ENDED`を検知 → 投票数最多のキュー先頭を`loadVideoById`で再生し、前の動画を`played`・新しい動画を`playing`に更新、`sessions.now_playing_video_id`/`now_playing_started_at`を更新
- `src/types/youtube.d.ts`: YouTube IFrame Player APIの型定義を追加
- 検証: `tsc`/`eslint`/`npm run build`成功。テスト用ホスト・セッション・キュー(投票付き)を作成し、
  - `/dashboard`にアクティブセッションの参加コード・操作ボタンが表示されることを確認
  - `/dashboard/session`にQRコード(`/s/[join_code]`へのURL)・プレイヤー枠・再生開始ボタンが表示されることを確認
  - ホスト権限でのrequests/sessions更新(再生進行ロジックのDB操作)がRLS上問題なく行えることを確認
  - `session_stores`ビューがanonから正しくホスト名を返すことを確認
  - テストデータは削除済み

## 次のステップ: ステップ6' (投票機能の仕上げ)

未着手。以下の2点を実装する。

1. **レート制限**: 同一匿名ID(`anonymous-id.ts`で発行するUUID)からのリクエストを、5分間に3曲までに制限する。参加者ページ(`participant-view.tsx`の`handleSelectTrack`)でリクエスト追加前にチェックする想定。
2. **ホストからのキュー削除機能**: 再生ページ(`session-player.tsx`のキュー一覧)に削除ボタンを追加し、`requests.status`を`"removed"`に更新できるようにする(`RequestStatus`型には`"removed"`が既に定義済み)。
