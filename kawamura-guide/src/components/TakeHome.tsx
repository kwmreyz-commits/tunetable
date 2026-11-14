import { useRef } from "react";

// 「持ち帰る」：QRコードと印刷ボタン
export function TakeHome({ qr }: { qr: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const btn = "min-h-14 rounded-xl px-6 text-[1.1rem] font-bold";
  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 border-t-2 border-main bg-card px-4 py-3">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4">
          <p className="leading-snug text-sub">ご自宅でも、ご家族と一緒に見られます。</p>
          <button
            type="button"
            className={`${btn} shrink-0 bg-main text-white`}
            onClick={() => ref.current?.showModal()}
          >
            持ち帰る
          </button>
        </div>
      </div>

      <dialog
        ref={ref}
        aria-labelledby="takehome-h"
        className="no-print m-auto max-h-[94dvh] w-[min(92vw,34rem)] overflow-y-auto rounded-2xl border-2 border-main bg-card p-5 text-ink backdrop:bg-black/50"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <h2 id="takehome-h" className="text-[1.35rem] font-bold">
          この見積もりを持ち帰る
        </h2>

        <h3 className="mt-4 font-bold">① スマホで持ち帰る</h3>
        <p>スマホのカメラをQRコードに向けると、この画面と同じ内容が開きます。</p>
        <div
          role="img"
          aria-label="この見積もりを開くQRコード"
          className="mx-auto mt-3 w-[min(60vw,13rem)] rounded-xl border border-line bg-white p-2"
          dangerouslySetInnerHTML={{ __html: qr }}
        />

        <h3 className="mt-4 font-bold">② 紙で持ち帰る</h3>
        <p>A4の紙に印刷します。紙にも同じQRコードが入ります。</p>
        <button
          type="button"
          className={`${btn} mt-3 w-full bg-main text-white`}
          onClick={() => {
            ref.current?.close();
            window.print();
          }}
        >
          印刷する
        </button>

        <p className="mt-4 leading-normal text-sub">
          この見積もりは医院にもインターネット上にも保存されません。内容はQRコード（リンク）の中に入っています。お名前や連絡先は入っていません。
        </p>
        <button
          type="button"
          className={`${btn} mt-4 w-full border-2 border-line bg-card text-ink`}
          onClick={() => ref.current?.close()}
        >
          閉じる
        </button>
      </dialog>
    </>
  );
}
