import { useRef, useState } from "react";
import { PriceInput } from "../components/PriceInput";
import { Stepper } from "../components/Stepper";
import { Switch } from "../components/Switch";
import { clinic } from "../data/clinic";
import type { Settings, Treatment, TreatmentKind, Variant } from "../data/types";
import { unitLabel } from "../lib/plan";
import { builtin, newId, normalizeSettings, resetSettings, useSettings } from "../lib/settings";

const inp = "h-12 w-full rounded-xl border-2 border-line bg-card px-3 focus:border-main focus:outline-none";
const area = "w-full rounded-xl border-2 border-line bg-card p-3 focus:border-main focus:outline-none";
const ghost = "min-h-12 rounded-xl border-2 border-line bg-card px-4";
const addBtn =
  "min-h-12 rounded-xl border-2 border-dashed border-main bg-card px-4 font-bold text-main-dark";

const KINDS: { kind: TreatmentKind; name: string; text: string }[] = [
  { kind: "perTooth", name: "歯1本ごと", text: "かぶせ物・インプラントなど。えらんだ歯の本数ぶん" },
  { kind: "teethSet", name: "えらんだ歯をまとめて一式", text: "入れ歯・ブリッジなど。何本えらんでも1つの値段" },
  { kind: "mouth", name: "お口全体", text: "歯ぐきの治療・矯正など。歯はえらばない" },
];
const TABS = [
  { id: "menu", name: "治療と値段" },
  { id: "segments", name: "区分（大人・子ども）" },
  { id: "findings", name: "ドックでわかる状態" },
  { id: "other", name: "支払い・メンテナンス" },
  { id: "backup", name: "保存と読み込み" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [s, save] = useSettings();
  const [tab, setTab] = useState<Tab>("menu");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (next: Settings) => {
    save(next);
    setMessage("保存しました");
  };
  const setTreatments = (treatments: Treatment[]) => update({ ...s, treatments });
  const patchT = (id: string, patch: Partial<Treatment>) =>
    setTreatments(s.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const patchV = (t: Treatment, vid: string, patch: Partial<Variant>) =>
    patchT(t.id, { variants: t.variants.map((v) => (v.id === vid ? { ...v, ...patch } : v)) });
  const move = (i: number, by: number) => {
    const list = [...s.treatments];
    const [x] = list.splice(i, 1);
    list.splice(i + by, 0, x);
    setTreatments(list);
  };
  const addTreatment = () => {
    const t: Treatment = {
      id: newId("t"),
      name: "",
      formalName: "",
      purpose: "",
      risks: "",
      visits: "",
      kind: "perTooth",
      unit: "一式",
      variants: [{ id: newId("v"), name: "", prices: {} }],
      enabled: true,
      confirmed: false,
    };
    setTreatments([...s.treatments, t]);
    setOpenId(t.id);
  };

  const unconfirmed = s.treatments.filter((t) => t.enabled && !t.confirmed).length;

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-24 pt-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sub">{clinic.name}・院内用</p>
          <h1 className="text-[1.5rem] font-bold leading-snug">料金の設定</h1>
        </div>
        <a
          href="/plan/new"
          className="inline-flex min-h-12 items-center rounded-xl bg-main px-5 font-bold text-white no-underline"
        >
          見積もりをつくる →
        </a>
      </header>
      <p className="mt-2">
        直したところは、その場で保存されます。
        <span role="status" className="ml-2 font-bold text-main-dark">
          {message && `✓ ${message}`}
        </span>
      </p>

      <nav aria-label="設定の種類" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
            className={`min-h-12 shrink-0 rounded-xl border-2 px-4 ${
              tab === t.id ? "border-main bg-main font-bold text-white" : "border-line bg-card"
            }`}
          >
            {t.name}
          </button>
        ))}
      </nav>

      {/* ───── 治療と値段 ───── */}
      {tab === "menu" && (
        <section aria-label="治療と値段" className="mt-4">
          <p className="text-sub">
            値段はすべて税込です。
            {s.segments.length > 1 &&
              `「${s.segments[0].name}」以外の値段が空欄のときは、「${s.segments[0].name}」と同じ値段になります。`}
          </p>
          {unconfirmed > 0 && (
            <p className="mt-2 rounded-xl border-2 border-warn bg-warn-soft px-3 py-2 font-bold text-warn">
              院長の確認がまだの治療が {unconfirmed} 件あります。見積もりに使うと「サンプル金額です」の帯が出ます。
            </p>
          )}
          <ul className="mt-3 space-y-4">
            {s.treatments.map((t, i) => {
              const open = openId === t.id;
              return (
                <li
                  key={t.id}
                  className={`rounded-2xl border-2 bg-card p-3 sm:p-4 ${
                    t.enabled ? "border-line" : "border-dashed border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      aria-label="治療の名前"
                      placeholder="治療の名前（例：ホワイトニング）"
                      maxLength={30}
                      autoFocus={open && !t.name}
                      className={`${inp} min-w-48 flex-1 text-[1.15rem] font-bold`}
                      value={t.name}
                      onChange={(e) => patchT(t.id, { name: e.target.value })}
                    />
                    <Switch
                      label={`${t.name || "この治療"}を扱う`}
                      checked={t.enabled}
                      onChange={(v) => patchT(t.id, { enabled: v })}
                      onText="扱う"
                      offText="扱わない"
                    />
                  </div>

                  {t.enabled ? (
                    <>
                      <p className="mt-2 text-sub">
                        値段のつけ方：{KINDS.find((k) => k.kind === t.kind)!.name}（{unitLabel(t)}あたり）
                      </p>
                      <ul className="mt-1 space-y-2">
                        {t.variants.map((v) => (
                          <li key={v.id} className="flex flex-wrap items-end gap-2 rounded-xl bg-paper p-2">
                            {(t.variants.length > 1 || v.name) && (
                              <label className="min-w-40 flex-1">
                                <span className="block text-sub">種類</span>
                                <input
                                  type="text"
                                  placeholder="種類の名前（例：セラミック）"
                                  maxLength={30}
                                  className={inp}
                                  value={v.name}
                                  onChange={(e) => patchV(t, v.id, { name: e.target.value })}
                                />
                              </label>
                            )}
                            {s.segments.map((seg, k) => (
                              <label key={seg.id} className="w-36 flex-1 sm:flex-none">
                                <span className="block text-sub">{seg.name}</span>
                                <PriceInput
                                  label={`${t.name} ${v.name} ${seg.name}の値段`}
                                  value={v.prices[seg.id]}
                                  placeholder={k === 0 ? "0" : `${s.segments[0].name}と同じ`}
                                  onChange={(n) => {
                                    const prices = { ...v.prices };
                                    if (n === undefined) delete prices[seg.id];
                                    else prices[seg.id] = n;
                                    patchV(t, v.id, { prices });
                                  }}
                                />
                              </label>
                            ))}
                            {t.variants.length > 1 && (
                              <button
                                type="button"
                                aria-label={`種類「${v.name || "名前なし"}」を消す`}
                                onClick={() =>
                                  patchT(t.id, { variants: t.variants.filter((x) => x.id !== v.id) })
                                }
                                className="h-12 w-12 shrink-0 rounded-xl border-2 border-line bg-card text-[1.2rem] text-sub"
                              >
                                ×
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={addBtn}
                          onClick={() =>
                            patchT(t.id, {
                              variants: [...t.variants, { id: newId("v"), name: "", prices: {} }],
                            })
                          }
                        >
                          ＋ 種類を足す
                        </button>
                        <button
                          type="button"
                          aria-expanded={open}
                          className={ghost}
                          onClick={() => setOpenId(open ? null : t.id)}
                        >
                          {open ? "くわしい設定をとじる" : "説明・注意点など"}
                        </button>
                        <span className="ml-auto">
                          <Switch
                            label={`${t.name}は院長が確認済み`}
                            checked={t.confirmed}
                            onChange={(v) => patchT(t.id, { confirmed: v })}
                            onText="院長確認済み"
                            offText="未確認"
                          />
                        </span>
                      </div>
                      {!t.risks.trim() && (
                        <p className="mt-2 font-bold text-danger">
                          リスク・注意点がまだ書かれていません（「説明・注意点など」から入れてください）
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sub">
                      この医院では扱わない治療です。見積もりの画面には出ません。
                      <button type="button" className="ml-2 underline" onClick={() => setOpenId(open ? null : t.id)}>
                        {open ? "とじる" : "消す・くわしい設定"}
                      </button>
                    </p>
                  )}

                  {open && (
                    <div className="mt-3 space-y-3 border-t border-line pt-3">
                      <fieldset>
                        <legend className="font-bold">値段のつけ方</legend>
                        <div className="mt-1 grid gap-2 sm:grid-cols-3">
                          {KINDS.map((k) => (
                            <button
                              key={k.kind}
                              type="button"
                              aria-pressed={t.kind === k.kind}
                              onClick={() => patchT(t.id, { kind: k.kind })}
                              className={`rounded-xl border-2 p-3 text-left leading-snug ${
                                t.kind === k.kind ? "border-main bg-main-soft" : "border-line bg-card"
                              }`}
                            >
                              <span className="block font-bold">
                                {t.kind === k.kind ? "● " : "○ "}
                                {k.name}
                              </span>
                              <span className="block text-sub">{k.text}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      {t.kind === "mouth" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">値段の単位</span>
                          {(["1回", "一式"] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              aria-pressed={t.unit === u}
                              onClick={() => patchT(t.id, { unit: u })}
                              className={`min-h-12 rounded-xl border-2 px-4 ${
                                t.unit === u ? "border-main bg-main font-bold text-white" : "border-line bg-card"
                              }`}
                            >
                              {u === "1回" ? "1回ごと" : "一式（全部で）"}
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="block">
                        <span className="font-bold">何のための治療か（患者さんに見せる説明）</span>
                        <textarea
                          rows={2}
                          maxLength={200}
                          className={area}
                          value={t.purpose}
                          onChange={(e) => patchT(t.id, { purpose: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="font-bold">主なリスク・注意点（必ず書く）</span>
                        <textarea
                          rows={2}
                          maxLength={300}
                          className={area}
                          value={t.risks}
                          onChange={(e) => patchT(t.id, { risks: e.target.value })}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="font-bold">正式な名前（なくてもよい）</span>
                          <input
                            type="text"
                            maxLength={40}
                            placeholder="例：根管治療"
                            className={inp}
                            value={t.formalName}
                            onChange={(e) => patchT(t.id, { formalName: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="font-bold">通院の目安（なくてもよい）</span>
                          <input
                            type="text"
                            maxLength={40}
                            placeholder="例：2〜3回"
                            className={inp}
                            value={t.visits}
                            onChange={(e) => patchT(t.id, { visits: e.target.value })}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">ならび順</span>
                        <button type="button" className={ghost} disabled={i === 0} onClick={() => move(i, -1)}>
                          ↑ 上へ
                        </button>
                        <button
                          type="button"
                          className={ghost}
                          disabled={i === s.treatments.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          ↓ 下へ
                        </button>
                        <button
                          type="button"
                          className="ml-auto min-h-12 rounded-xl border-2 border-danger px-4 font-bold text-danger"
                          onClick={() => {
                            if (window.confirm(`「${t.name || "名前なし"}」を消しますか？`)) {
                              setOpenId(null);
                              setTreatments(s.treatments.filter((x) => x.id !== t.id));
                            }
                          }}
                        >
                          この治療を消す
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="button" className={`${addBtn} mt-4 min-h-14 w-full text-[1.1rem]`} onClick={addTreatment}>
            ＋ 新しい治療を足す
          </button>
        </section>
      )}

      {/* ───── 区分 ───── */}
      {tab === "segments" && (
        <section aria-label="区分" className="mt-4">
          <p>
            値段を分けたい区分です。区分を足すと、「治療と値段」の画面に値段の欄が増えます。
          </p>
          <p className="text-sub">
            いちばん上の区分が基準です。ほかの区分で値段が空欄の治療は、基準と同じ値段になります。
          </p>
          <ul className="mt-3 space-y-2">
            {s.segments.map((seg, i) => (
              <li key={seg.id} className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3">
                <input
                  type="text"
                  aria-label={`区分${i + 1}の名前`}
                  maxLength={20}
                  className={`${inp} flex-1 font-bold`}
                  value={seg.name}
                  onChange={(e) =>
                    update({
                      ...s,
                      segments: s.segments.map((x) => (x.id === seg.id ? { ...x, name: e.target.value } : x)),
                    })
                  }
                />
                {i === 0 && <span className="shrink-0 text-sub">基準</span>}
                <button
                  type="button"
                  disabled={s.segments.length === 1}
                  className={`${ghost} shrink-0 disabled:text-line`}
                  onClick={() => {
                    if (!window.confirm(`区分「${seg.name}」と、その値段を消しますか？`)) return;
                    update({
                      ...s,
                      segments: s.segments.filter((x) => x.id !== seg.id),
                      treatments: s.treatments.map((t) => ({
                        ...t,
                        variants: t.variants.map((v) => {
                          const prices = { ...v.prices };
                          delete prices[seg.id];
                          return { ...v, prices };
                        }),
                      })),
                    });
                  }}
                >
                  消す
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`${addBtn} mt-3`}
            onClick={() => update({ ...s, segments: [...s.segments, { id: newId("seg"), name: "新しい区分" }] })}
          >
            ＋ 区分を足す（例：学生、シニア）
          </button>
        </section>
      )}

      {/* ───── ドックでわかる状態 ───── */}
      {tab === "findings" && (
        <section aria-label="ドックでわかる状態" className="mt-4">
          <p>
            見積もりで「なぜこの治療が必要か」として患者さんに見せる言葉です。やさしい言葉で書いてください。
          </p>
          <ul className="mt-3 space-y-2">
            {s.findings.map((f) => {
              const patch = (p: Partial<typeof f>) =>
                update({ ...s, findings: s.findings.map((x) => (x.id === f.id ? { ...x, ...p } : x)) });
              return (
                <li key={f.id} className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-card p-3">
                  <label className="w-full sm:w-56">
                    <span className="block text-sub">状態の名前</span>
                    <input
                      type="text"
                      maxLength={30}
                      className={`${inp} font-bold`}
                      value={f.name}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </label>
                  <label className="min-w-56 flex-1">
                    <span className="block text-sub">ひとこと説明</span>
                    <input
                      type="text"
                      maxLength={120}
                      className={inp}
                      value={f.note}
                      onChange={(e) => patch({ note: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className={`${ghost} shrink-0`}
                    onClick={() => {
                      if (window.confirm(`「${f.name}」を消しますか？`))
                        update({ ...s, findings: s.findings.filter((x) => x.id !== f.id) });
                    }}
                  >
                    消す
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className={`${addBtn} mt-3`}
            onClick={() =>
              update({ ...s, findings: [...s.findings, { id: newId("f"), name: "新しい状態", note: "" }] })
            }
          >
            ＋ 状態を足す
          </button>
        </section>
      )}

      {/* ───── 支払い・メンテナンス ───── */}
      {tab === "other" && (
        <section aria-label="支払い・メンテナンス" className="mt-4 space-y-6">
          <div>
            <h2 className="text-[1.2rem] font-bold">見積もりに出す支払い方法</h2>
            <ul className="mt-2 space-y-2">
              {(
                [
                  ["lumpSum", "一括"],
                  ["perPhase", "段階ごとに支払い"],
                  ["installment", "分割・ローン（扱うと決めた場合のみ）"],
                ] as const
              ).map(([key, name]) => (
                <li key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3">
                  <span className="font-bold">{name}</span>
                  <Switch
                    label={name}
                    checked={s.payment[key]}
                    onChange={(v) => update({ ...s, payment: { ...s.payment, [key]: v } })}
                    onText="出す"
                    offText="出さない"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[1.2rem] font-bold">治療のあとのメンテナンス</h2>
            <p className="text-sub">見積もりの最後に「年間の目安」として出ます。合計には入りません。</p>
            <div className="mt-2 space-y-3 rounded-2xl border border-line bg-card p-3">
              <label className="block">
                <span className="font-bold">どの治療を使うか</span>
                <select
                  className={inp}
                  value={s.maintenance.treatmentId}
                  onChange={(e) => update({ ...s, maintenance: { ...s.maintenance, treatmentId: e.target.value } })}
                >
                  <option value="">（出さない）</option>
                  {s.treatments
                    .filter((t) => t.kind === "mouth" && t.name)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">1年に何回か</span>
                <Stepper
                  label="メンテナンスの回数"
                  value={s.maintenance.timesPerYear}
                  unit="回"
                  max={12}
                  onChange={(v) => update({ ...s, maintenance: { ...s.maintenance, timesPerYear: v ?? 1 } })}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───── 保存と読み込み ───── */}
      {tab === "backup" && (
        <section aria-label="保存と読み込み" className="mt-4 space-y-4">
          <p>
            この設定は、<span className="font-bold">この端末（このブラウザ）の中</span>
            に保存されています。インターネット上には送られません。
          </p>
          <div className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">ファイルに書き出す</h2>
            <p className="text-sub">控えを取るとき、別の iPad やパソコンでも同じ設定を使いたいときに。</p>
            <button
              type="button"
              className="mt-2 min-h-12 rounded-xl bg-main px-5 font-bold text-white"
              onClick={() => {
                const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `料金設定-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                setMessage("ファイルに書き出しました");
              }}
            >
              書き出す
            </button>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">ファイルから読み込む</h2>
            <p className="text-sub">書き出したファイルをえらぶと、いまの設定と入れ替わります。</p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="設定ファイルをえらぶ"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                let next: Settings | null = null;
                try {
                  next = normalizeSettings(JSON.parse(await file.text()));
                } catch {
                  next = null;
                }
                if (!next) return window.alert("このファイルは読み込めませんでした。");
                if (window.confirm(`治療 ${next.treatments.length} 件の設定を読み込み、いまの設定と入れ替えますか？`)) {
                  update(next);
                  setMessage("読み込みました");
                }
              }}
            />
            <button type="button" className={`${ghost} mt-2 font-bold`} onClick={() => fileRef.current?.click()}>
              ファイルをえらぶ
            </button>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-bold">最初の状態に戻す</h2>
            <p className="text-sub">この端末で直した内容をすべて消して、最初から入っている設定に戻します。</p>
            <button
              type="button"
              className="mt-2 min-h-12 rounded-xl border-2 border-danger px-4 font-bold text-danger"
              onClick={() => {
                if (window.confirm("この端末で直した設定をすべて消して、最初の状態に戻しますか？")) {
                  resetSettings();
                  save(builtin);
                  resetSettings();
                  setMessage("最初の状態に戻しました");
                }
              }}
            >
              最初の状態に戻す
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
