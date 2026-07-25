# TuneTable

パーティーや集まりで流す音楽・動画を、参加者みんなの投票で決めるキューアプリ。

ホストが再生ページをテレビにつないでおくと、参加者はQRコードを読むだけで
(アプリのインストールもアカウント登録もなしに)曲をリクエスト・投票できる。
票の多い順に自動で再生される。

- **ホスト**: メール/パスワードで登録。パーティーを開始するとQRと参加コードが出る
- **参加者**: 認証なし。匿名IDはブラウザのlocalStorageに持つ

## 使う場面

ホームパーティー、誕生日会、結婚式の二次会、貸切営業のイベントなど。
「誰か1人がずっとスマホで選曲係をやる」状態を解消するのが狙い。

商用BGMとしての常時利用は想定していない(演奏権の処理が必要になるため)。
背景は [bgm-request-app-spec-v2.md](./bgm-request-app-spec-v2.md) を参照。

## 技術スタック

| 領域 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 + TypeScript strict |
| スタイル | Tailwind CSS v4 |
| DB / 認証 / Realtime | Supabase (Postgres + RLS) |
| 動画検索 | YouTube Data API v3 (`search.list` / `videos.list`) |
| 再生 | YouTube IFrame Player API (ホストのブラウザで再生) |

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # 値を埋める
npm run dev
```

必要な環境変数:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
YOUTUBE_API_KEY=
```

DBは `supabase/migrations/` のSQLを番号順に適用する
(SupabaseダッシュボードのSQL Editorに貼るのが手軽)。
`0006` は任意適用で、適用しなくてもアプリは動く。

## 画面

| パス | 用途 | 認証 |
|---|---|---|
| `/` | 紹介 + 参加コード入力 | 不要 |
| `/s/[join_code]` | 参加者画面。終了後は振り返り表示に変わる | 不要 |
| `/login` `/signup` | ホストの認証 | — |
| `/dashboard` | パーティーの開始/終了、過去の記録、ホスト設定 | 必要 |
| `/dashboard/session` | 再生ページ(テレビに映す) | 必要 |

## 設計方針

UIの判断根拠(誰が・どこで・どう使うか)は [DESIGN.md](./DESIGN.md) にまとめてある。
要点は「ホスト画面は暗い部屋のテレビを2〜5mから見る」「参加者は片手・数秒で操作する」の2つ。

## 知っておくべき制約

- **YouTube Data APIの無料枠は1日10,000ユニット**。`search.list` は1回100ユニットなので
  実質1日100検索しかできない。このため入力中のインクリメンタル検索は実装していない。
  検索結果はプロセス内キャッシュとNext.jsのData Cacheの二段でキャッシュしている。
- **再生はホストのブラウザタブそのもの**。タブを閉じると再生も止まる。
  リロードした場合は `sessions.now_playing_started_at` から経過時間を計算して続きから再生する。
- 参加者の匿名IDはlocalStorage由来なので、厳密な本人確認はできない。
  レート制限や1人1票は「善意前提」の仕組みとして設計している。

## 開発

```bash
npm run dev     # 開発サーバー
npm run build   # 本番ビルド(型チェックを含む)
npm run lint    # ESLint
```
