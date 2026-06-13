# プロジェクト仕様書 v2: TuneTable(仮称)— みんなで選ぶ音楽・動画キューアプリ(身内/プライベートイベント向け)

## 1. v1からの変更点(重要)

v1は「飲食店BGM」を前提にしていたが、以下の理由でv2では身内・プライベートイベント向けの選曲投票アプリにピボットする。

- 商用BGMには演奏権処理(JASRAC等)が必要で、個人開発のアプリでは解決できない
- 個人がSpotify/YouTubeの自分のアカウントで、自宅や友人間で音楽・動画を流す行為は通常の利用範囲内であり、権利面のハードルがほぼゼロ
- まずは「投票でキューが変わる体験」というコア機能をリスクなく検証することが目的

将来的に店舗展開する場合は、USENのOTORAKU等、権利処理済みの既存BGMサービスとの提携が前提になる。これは別トラック(ビジネス検証)として扱い、本仕様書のスコープには含めない。

### 用語の変更(ステップ1・2の実装との互換性)

- 既存テーブル名(`stores`, `sessions`, `requests`, `votes`)はそのまま使う(スキーマ変更コストを避ける)
- UI上の表現は「店舗」→「ホスト」、「お客さん」→「参加者」に変更する
- `stores`テーブルは実質「ホストのプロフィール」として扱う(必要なら将来`hosts`にリネームしてもよいが、MVPでは不要)

## 2. プロダクト概要

ホスト(主催者)が再生デバイス(自分のPC/タブレットのブラウザ)で「再生ページ」を開いておくと、
参加者はQRコードを読み取って「投票ページ」にアクセスし、流したい曲・動画をリクエスト・投票できる。
投票数の多いものから順に再生キューに反映される。

### ユースケース例

- ホームパーティーで、みんなが見たい/聴きたい動画をテレビに流す
- 個人店の貸切営業(友人限定イベント)でBGMを参加者が決める
- 結婚式の二次会、誕生日会などのプライベートイベント

## 3. 開発フェーズ

### Phase 1 (MVP) — 今回実装する範囲

- ホスト: アカウント登録/ログイン(実装済み・ステップ2)、セッション開始/終了、QRコード発行
- 参加者: QR参加(認証不要)、YouTube動画検索、リクエスト、投票
- 再生ページ(ホストのブラウザ): YouTube IFrame Playerを埋め込み、投票結果に応じて自動でキューを更新
- 課金機能なし

### Phase 2 — 構想のみ

- 他の音楽プロバイダー対応(Spotify等)— `MusicProvider`抽象化により後から追加可能にしておく
- ブースト機能、視聴履歴に基づくレコメンド

## 4. 技術スタック(変更点)

- フロントエンド/バックエンド: Next.js 16 + TypeScript + Tailwind(ステップ1で構築済み)
- DB/Auth: Supabase(ステップ1・2で構築済み)
- 動画検索: YouTube Data API v3 — `search.list`(APIキーのみ、OAuth不要)
  - クォータ: 無料枠1日10,000ユニット、検索1回100ユニット(=1日約100回)。サーバー側でキャッシュして消費を抑える
- 再生制御: YouTube IFrame Player API(公式・JS)
  - `cuePlaylist` / `loadVideoById` 等でホスト側ブラウザの再生を直接制御
  - 再生デバイス = ホストのブラウザタブそのもの(Spotify連携・OAuth・トークン管理は不要)
- 再生制御の抽象化: `MusicProvider`インターフェースを定義し、`YouTubeProvider`として実装。将来Spotify等を追加する場合はこのインターフェースの別実装として追加する

```ts
interface MusicProvider {
  search(query: string): Promise<TrackResult[]>
  // クライアント側で実行される再生制御はProvider固有のため、
  // ここでは検索のみを共通化し、再生ロジックはプロバイダー別コンポーネントとする
}
```

## 5. データモデルの追加・変更

既存テーブル(`stores`, `sessions`, `requests`, `votes`)はそのまま使用。以下を追加する。

```sql
-- requestsテーブルに追加
alter table requests add column if not exists video_id text; -- YouTube動画ID
alter table requests add column if not exists thumbnail_url text;

-- sessionsテーブルに追加(現在再生中の動画を全参加者に同期表示するため)
alter table sessions add column if not exists now_playing_video_id text;
alter table sessions add column if not exists now_playing_started_at timestamptz;
```

`spotify_track_id`列・`stores.spotify_refresh_token`列は今回使用しない(残しておいても害はないが、将来削除可)。

## 6. 主要な画面(変更点)

### ホスト側

- `/dashboard` — ログイン後のトップ(既存)
- `/dashboard/session` — 再生ページ(新規・最重要)
  - YouTube IFrame Playerを埋め込み(最小表示でOK、完全非表示は規約上避ける)
  - キュー(投票数降順)を表示
  - 現在再生中の動画が終わったら、自動で次の動画(キュー1位)を`loadVideoById`で再生し、`sessions.now_playing_video_id`を更新
  - 初回はホストが「再生開始」ボタンを押す(ブラウザの自動再生制限のため)
- `/dashboard` から `/dashboard/session` への遷移、QRコード表示(既存実装をベースに流用)

### 参加者側(認証不要、既存の`/s/[join_code]`を流用)

- 現在再生中の動画情報(`sessions.now_playing_video_id`から取得したタイトル/サムネイル)を表示
- キュー一覧(投票数降順)、投票ボタン
- 「リクエスト」ボタン → YouTube検索モーダル → リクエスト追加

## 7. コアロジック

### キュー → 再生ページへの反映

- `/dashboard/session`ページが`sessions`テーブルをRealtime購読
- 現在の動画の`onStateChange`イベントで`ENDED`を検知したら:
  1. `requests`から投票数最多の`queued`を取得
  2. YouTube IFrame Playerで`loadVideoById`を実行
  3. 該当requestを`playing`に、前の動画を`played`に更新
  4. `sessions.now_playing_video_id` / `now_playing_started_at`を更新(参加者側の表示同期用)
- キューが空の場合は、ホストが設定したデフォルトプレイリスト(任意・Phase 2)を再生、もしくは何もしない

### 不正・荒らし対策(MVPレベル、既存方針を維持)

- 同一匿名IDからのリクエストは5分間に3曲まで
- ホストダッシュボードからワンタップで削除可能

## 8. 環境変数(変更点)

```
NEXT_PUBLIC_SUPABASE_URL=        # 設定済み
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # 設定済み
SUPABASE_SERVICE_ROLE_KEY=       # 設定済み
YOUTUBE_API_KEY=                 # 新規: YouTube Data API v3用(APIキーのみ、OAuth不要)
```

`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REDIRECT_URI`は不要になった。

## 9. 実装の進め方(Claude Codeへの指示・ステップ3以降を再定義)

ステップ1・2は完了済み。ステップ3以降を以下に置き換える。

### ステップ3': YouTube動画検索

- Google Cloud ConsoleでAPIキーを取得(YouTube Data API v3を有効化)
- サーバー側Route Handlerで`search.list`をプロキシ(APIキーをクライアントに露出させない)
- 検索結果のキャッシュ(同一クエリは一定時間再利用してクォータを節約)
- `requests`テーブルへの追加時に`video_id`/`thumbnail_url`を保存

### ステップ4': 参加者側の参加ページ更新

- `/s/[join_code]`にYouTube検索モーダルを追加
- キュー一覧・投票機能(v1の設計をそのまま流用)
- 現在再生中の動画情報をRealtimeで表示

### ステップ5': 再生ページ(ホスト側)

- `/dashboard/session`を新規作成
- YouTube IFrame Player埋め込み、`onPlayerStateChange`でキュー進行ロジックを実装
- セッション開始/終了とQRコード表示(v1の設計を流用)

### ステップ6': 投票機能の仕上げとレート制限

- 匿名ID生成、unique制約による1人1票
- レート制限(5分3曲)

### コーディング方針(変更なし)

- TypeScript strictモード
- Supabase RLSを維持
- UIは日本語、モバイルファースト

## 10. MVPで検証したい仮説(変更点)

- ホストが1台のブラウザタブを開きっぱなしにする運用は、実際のパーティーで成立するか
- 投票で動画が切り替わる体験は、参加者にとって楽しいか
- YouTube検索結果の精度・速度は十分か(音楽動画の検索精度)

→ まず開発者自身の友人間のホームパーティーや、貸切営業中の知人の店で試験導入し、フィードバックを集める。
