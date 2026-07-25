"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * 参加コードでの合流。
 *
 * v2はQRコードしか入口が無かったが、実際にはQRを読めない場面が多い
 * (カメラアプリが起動しない、席が遠い、URLをLINEで転送された、など)。
 * ホストが口頭で伝えたコードでも入れるようにしておく。
 */
export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) return;
    setIsNavigating(true);
    router.push(`/s/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label
        htmlFor="join-code"
        className="block text-center text-xs font-medium text-ink-muted"
      >
        参加コードを入力
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="join-code"
          name="join-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          className="min-w-0 flex-1 rounded-full border border-hairline bg-white/5 px-5 py-3.5 text-center font-mono text-xl tracking-[0.25em] placeholder:text-ink-faint focus:border-accent-soft focus:outline-none"
        />
        <button
          type="submit"
          disabled={code.trim().length < 4 || isNavigating}
          className="shrink-0 rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          参加
        </button>
      </div>
    </form>
  );
}
