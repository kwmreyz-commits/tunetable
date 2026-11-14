import { clinic } from "../data/clinic";
import { phases } from "../data/phases";
import type { Phase, Quote, QuoteTreatment } from "../data/types";
import { unitWord, yen, type QuoteSummary } from "../lib/plan";
import { teethLabel, type Dentition } from "../lib/teeth";
import { ToothChart } from "./ToothChart";

// 印刷専用（A4縦 1〜2枚）。画面には出ない。
export function PlanPrint({
  quote,
  summary: s,
  marks,
  charts,
  qr,
}: {
  quote: Quote;
  summary: QuoteSummary;
  marks: Record<number, Phase>;
  charts: Dentition[];
  qr: string;
}) {
  const used = phases.filter((ph) => s.rows.some((r) => r.line.phase === ph.no));
  const mt = quote.maintenance;
  // 同じ治療の説明は1回だけ載せる
  const unique: QuoteTreatment[] = [];
  for (const { line } of s.rows)
    if (!unique.some((t) => t.id === line.t.id && t.risks === line.t.risks)) unique.push(line.t);

  return (
    <div className="plan-print hidden print:block">
      <header className="flex items-end justify-between border-b-2 border-ink pb-1">
        <div>
          <p>{clinic.name}</p>
          <h1 className="text-[16pt] font-bold leading-tight">あなたの治療計画とお見積もり</h1>
        </div>
        <p>
          作成日 {quote.createdAt}（{quote.segment.name}）
        </p>
      </header>

      <section className="mt-3 flex items-start gap-4">
        <div className="flex-1">
          <div className="border-2 border-ink p-2">
            <p className="font-bold">合計（税込）</p>
            <p className="text-[20pt] font-bold leading-tight">{yen(s.total)}</p>
            {(quote.months || quote.visits) && (
              <p className="font-bold">
                {[quote.months && `約${quote.months}か月`, quote.visits && `通院 約${quote.visits}回`]
                  .filter(Boolean)
                  .join("／")}
              </p>
            )}
          </div>
          <table className="mt-2">
            <tbody>
              {used.map((ph) => (
                <tr key={ph.no}>
                  <th className="text-left">
                    {ph.mark} {ph.name}
                    <span className="block text-[8.5pt] font-normal">{ph.why}</span>
                  </th>
                  <td className="w-[34%] text-right font-bold">{yen(s.byPhase[ph.no])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {charts.length > 0 && (
          <div className="w-[42mm] shrink-0 text-center text-[8.5pt]">
            {charts.map((d) => (
              <ToothChart key={d} dentition={d} marks={marks} />
            ))}
            色のついた歯が、治療する歯です
          </div>
        )}
      </section>

      <table className="mt-3">
        <thead>
          <tr>
            <th className="w-[19%] text-left">歯</th>
            <th className="text-left">ドックでわかったこと → 治療</th>
            <th className="w-[21%] text-right">計算</th>
            <th className="w-[16%] text-right">金額（税込）</th>
          </tr>
        </thead>
        {used.map((ph) => (
          <tbody key={ph.no}>
            <tr>
              <th colSpan={4} className="bg-[#eee] text-left">
                {ph.mark} {ph.name}
              </th>
            </tr>
            {s.rows
              .filter((r) => r.line.phase === ph.no)
              .map(({ line: l, count, amount }, i) => (
                <tr key={i}>
                  <td>{l.teeth.length > 0 ? teethLabel(l.teeth) : "お口全体"}</td>
                  <td>
                    {(l.finding || l.reason) && (
                      <>
                        {[l.finding?.name, l.reason].filter(Boolean).join("：")}
                        {" → "}
                      </>
                    )}
                    <span className="font-bold">
                      {l.t.name}
                      {l.variantName && `（${l.variantName}）`}
                    </span>
                  </td>
                  <td className="text-right">
                    {yen(l.unitPrice)} × {count}
                    {unitWord(l.t)}
                  </td>
                  <td className="text-right font-bold">{yen(amount)}</td>
                </tr>
              ))}
            <tr>
              <td colSpan={3} className="text-right">
                {ph.mark} の小計
              </td>
              <td className="text-right font-bold">{yen(s.byPhase[ph.no])}</td>
            </tr>
          </tbody>
        ))}
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right font-bold">
              合計（税込）
            </td>
            <td className="text-right text-[12pt] font-bold">{yen(s.total)}</td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-3">
        <h2 className="font-bold">治療の説明と、主なリスク・注意点</h2>
        <ul className="text-[9pt]">
          {unique.map((t) => (
            <li key={t.id} className="avoid-break">
              <span className="font-bold">
                {t.name}
                {t.formalName && `（${t.formalName}）`}
              </span>
              ：{t.purpose}
              {t.visits && ` 通院の目安 ${t.visits}。`}
              <span className="font-bold"> 注意点：</span>
              {t.risks}
            </li>
          ))}
        </ul>
      </section>

      <section className="avoid-break mt-2">
        <p>
          <span className="font-bold">お支払い：</span>
          {[
            quote.payment.lumpSum && "一括",
            quote.payment.perPhase && "段階ごと",
            quote.payment.installment && "分割・ローン（医院でご相談ください）",
          ]
            .filter(Boolean)
            .join("／")}
          からお選びいただけます。
        </p>
        {mt && (
          <p>
            <span className="font-bold">治療のあと（{mt.t.name}）：</span>
            年{mt.timesPerYear}回で {yen(mt.price * mt.timesPerYear)}
            （税込・年間の目安。上の合計には含まれていません）
          </p>
        )}
        {quote.note && (
          <p className="whitespace-pre-wrap">
            <span className="font-bold">メモ：</span>
            {quote.note}
          </p>
        )}
      </section>

      <footer className="avoid-break mt-2 flex items-center gap-4 border-t-2 border-ink pt-2">
        {qr && (
          <div className="h-[26mm] w-[26mm] shrink-0" dangerouslySetInnerHTML={{ __html: qr }} />
        )}
        <div>
          <p className="font-bold">この内容は相談用の概算です。正式な見積書は医院でお渡しします。</p>
          <p>スマホのカメラで左のQRコードを読み取ると、同じ内容をご家族と一緒にご覧いただけます。</p>
          <p>ご不明な点は、何でもお尋ねください。納得されてから治療に進みます。</p>
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
