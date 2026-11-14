// 小さな線画アイコン（外部の画像やライブラリは使わない）
const paths: Record<string, React.ReactNode> = {
  tooth: (
    <path d="M8 3C5.2 3 3.5 5 3.5 7.8c0 2 .7 3.4 1.1 5.2.5 2.3.6 7 2.3 7 1.6 0 1.4-4.5 3-4.5h4.2c1.6 0 1.4 4.5 3 4.5 1.7 0 1.8-4.7 2.3-7 .4-1.8 1.1-3.2 1.1-5.2C20.5 5 18.8 3 16 3c-1.4 0-2.4.8-4 .800S9.4 3 8 3z" />
  ),
  gum: (
    <>
      <path d="M3 10c0-3 2-5 4.5-5S12 7 12 7s2-2 4.5-2S21 7 21 10" />
      <path d="M5 10.500v3.500c0 2 1 4.5 2.5 4.500S10 15 10 14v-3.500M14 10.500v3.500c0 1 .5 4.5 2.5 4.500S19 16 19 14v-3.5" />
    </>
  ),
  bite: (
    <>
      <path d="M3 9h18M3 15h18" />
      <path d="M5 9V6.500h3.500V9M10.2 9V6.500h3.600V9M15.5 9V6.500H19V9M5 15v2.500h3.500V15M10.2 15v2.500h3.600V15M15.5 15v2.500H19V15" />
    </>
  ),
  xray: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M9.5 8c-1.2 0-2 .9-2 2.1 0 1.8.9 2.4 1.1 6.1.1.9 1.1.9 1.3 0l.5-2.400c.3-1.1 2.9-1.1 3.2 0l.5 2.400c.2.9 1.2.9 1.3 0 .2-3.7 1.1-4.3 1.1-6.1 0-1.2-.8-2.1-2-2.1-.9 0-1.4.5-2.5.500S10.4 8 9.5 8z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.500L21 21" />
    </>
  ),
  cause: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.500a2.5 2.5 0 1 1 3.6 2.200c-.7.4-1.1.9-1.1 1.8" />
      <circle cx="12" cy="16.7" r=".6" fill="currentColor" />
    </>
  ),
  plan: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10l1.5 1.500L12.5 9M8.5 15.500l1.5 1.5 2.5-2.500M14.5 10.500h2M14.5 16h2" />
    </>
  ),
  chat: <path d="M4 5.500h16v10.500H10l-4.5 3.500V16H4z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.5 12H21M5.6 5.600l1.8 1.800M16.6 16.600l1.8 1.800M5.6 18.400l1.8-1.800M16.6 7.400l1.8-1.8" />
    </>
  ),
};

export function Icon({ name, className = "h-8 w-8" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  );
}
