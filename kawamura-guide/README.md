# 川村歯科「治療と費用の道のりガイド」

tunetable とは**別のプロジェクト**です（一時的に同じリポジトリに置いています）。
このフォルダだけを取り出せば、そのまま独立したリポジトリになります。

## 動かし方

```bash
cd kawamura-guide
npm install
npm run dev          # 確認用（サンプルも表示）
npm test             # テスト
npm run build:public # 公開用ビルド。未確認・未入力があると止まる → dist/ を Cloudflare Pages へ
```

## 画面

- `/` … 道のりページ（公開版）
- `/plan/new` … 計画ビルダー（院内用）
- `/plan#…` … あなたの計画（内容は URL の # 以降に圧縮。サーバーには保存しません）

## 直す場所（`src/data/` だけ）

- `treatments.ts` … 料金マスター（今はすべて仮の金額。決まったら金額と risks を直して `confirmed: true` に）
- `settings.ts` … 支払い方法の表示オン・オフ、メンテナンスの年間回数、段階の名前
- `journey.ts` … 道のり4段階の文面と金額
- `modelCases.ts` … 費用の例。院長が決めたら `confirmed: true` に
- `clinic.ts` … 電話・LINE・診療時間・休診日・住所
- 配色は `src/index.css` の `@theme`

## 進み具合

- [x] Phase 1：道のりページ
- [x] Phase 2：料金マスター＋計画ビルダー（`/plan/new`）＋あなたの計画（`/plan#データ`）
- [x] Phase 3：QRコード・印刷（「あなたの計画」の「持ち帰る」ボタン）
