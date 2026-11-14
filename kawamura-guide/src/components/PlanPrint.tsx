import { clinic } from "../data/clinic";
import { phases, settings } from "../data/settings";
import type { Plan, Treatment } from "../data/types";
import { moneyText, type PlanSummary } from "../lib/plan";

// 印刷専用（A4縦 1〜2枚）。画面には出ない。
export function PlanPrint({
  plan,
  summary: s,
  maint,
  qr,
}: {
  plan: Plan;
  summary: PlanSummary;
  maint: Treatment | undefined;
  qr: string;
}) {
  const used = phases.filter((ph) => s.rows.some((r) => r.item.phase === ph.no));
  const n = settings.maintenance.timesPerYear;
  return (
    <div className="plan-print hidden print:block">
      <header className="flex items-end justify-between border-b-2 border-ink pb-1">
        <div>
          <p>{clinic.name}</p>
          <h1 className="text-[16pt] font-bold leading-tight">あなたの治療計画</h1>
        </div>
        <p>作成日 {plan.createdAt}</p>
      </header>

      <section className="mt-3 flex gap-4">
        <div className="flex-1 border-2 border-ink p-2">
          <p className="font-bold">合計（税込）</p>
          <p className="text-[18pt] font-bold leading-tight">{moneyText(s.total)}</p>
          {(plan.months || plan.visits) && (
            <p className="font-bold">
              {[plan.months && `約${plan.months}か月`, plan.visits && `通院 約${plan.visits}回`]
                .filter(Boolean)
                .join("／")}
            </p>
          )}
        </div>
        <table className="flex-1">
          <caption className="text-left font-bold">段階ごとの内訳（税込）</caption>
          <tbody>
            {used.map((ph) => (
              <tr key={ph.no}>
                <th className="text-left font-normal">
                  <span className="font-bold">
                    {ph.mark} {ph.name}
                  </span>
                </th>
                <td className="text-right font-bold">{moneyText(s.byPhase[ph.no])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="mt-1 text-[9pt]">
        {phases.map((ph) => `${ph.mark}${ph.name}：${ph.why}`).join("　")}
      </p>

      <table className="mt-3">
        <thead>
          <tr>
            <th className="w-[13%] text-left">段階</th>
            <th className="text-left">治療の内容 ／ 主なリスク・注意点</th>
            <th className="w-[8%] text-right">数</th>
            <th className="w-[24%] text-right">金額（税込）</th>
          </tr>
        </thead>
        <tbody>
          {used.flatMap((ph) =>
            s.rows
              .filter((r) => r.item.phase === ph.no)
              .map(({ item, treatment: t, amount }, i) => (
                <tr key={`${ph.no}-${i}`}>
                  <td>
                    {ph.mark}
                    {ph.name}
                  </td>
                  <td>
                    <span className="font-bold">{t.name}</span>
                    {t.formalName && `（${t.formalName}）`}
                    {t.visits && `　通院の目安 ${t.visits}`}
                    <br />
                    {t.purpose}
                    <br />
                    <span className="text-[9pt]">リスク・注意点：{t.risks}</span>
                  </td>
                  <td className="text-right">
                    {item.qty}
                    {t.unit === "一式" ? "式" : t.unit.slice(1)}
                  </td>
                  <td className="text-right font-bold">{moneyText(amount)}</td>
                </tr>
              )),
          )}
        </tbody>
      </table>

      <section className="avoid-break mt-3">
        <p>
          <span className="font-bold">お支払い：</span>
          {[
            settings.payment.lumpSum && "一括",
            settings.payment.perPhase && "段階ごと",
            settings.payment.installment && "分割・ローン（医院でご相談ください）",
          ]
            .filter(Boolean)
            .join("／")}
          からお選びいただけます。
        </p>
        {maint && (
          <p>
            <span className="font-bold">治療のあと（メンテナンス）：</span>
            年{n}回で {moneyText({ min: maint.priceMin * n, max: maint.priceMax * n })}
            （税込・年間の目安。上の合計には含まれていません）
          </p>
        )}
        {plan.note && (
          <p className="whitespace-pre-wrap">
            <span className="font-bold">メモ：</span>
            {plan.note}
          </p>
        )}
      </section>

      <footer className="avoid-break mt-3 flex items-center gap-4 border-t-2 border-ink pt-2">
        {qr && (
          <div
            className="h-[30mm] w-[30mm] shrink-0"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        )}
        <div>
          <p className="font-bold">
            この内容は相談用の概算です。正式な見積書は医院でお渡しします。
          </p>
          <p>
            スマホのカメラで左のQRコードを読み取ると、同じ内容をご家族と一緒にご覧いただけます。
          </p>
          <p>
            ご不明な点は、何でもお尋ねください。納得されてから治療に進みます。
          </p>
          <p className="text-[9pt]">
            当院は自由診療（保険のきかない診療）です。金額はすべて税込です。治療の結果には個人差があります。
          </p>
          <p className="font-bold">
            {clinic.name}　電話 {clinic.tel}
          </p>
        </div>
      </footer>
    </div>
  );
}
