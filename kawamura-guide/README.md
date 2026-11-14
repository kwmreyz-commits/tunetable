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

## 直す場所（`src/data/` だけ）

- `journey.ts` … 道のり4段階の文面と金額
- `modelCases.ts` … 費用の例。院長が決めたら `confirmed: true` に
- `clinic.ts` … 電話・LINE・診療時間・休診日・住所
- 配色は `src/index.css` の `@theme`

## 進み具合

- [x] Phase 1：道のりページ
- [ ] Phase 2：料金マスター＋計画ビルダー＋あなたの計画
- [ ] Phase 3：QRコード・印刷
