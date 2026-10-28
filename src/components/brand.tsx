import Link from "next/link";

// Знакът на MiCA Guard — същият като на micaguard.eu: щит с редове в градиентен квадрат.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        display: "grid",
        placeItems: "center",
        flex: "none",
        background: "linear-gradient(45deg, #2563EB, #22D3EE)",
        boxShadow: "0 0 25px rgba(59,130,246,0.35)",
      }}
    >
      <svg width={size * 0.5} height={size * 0.55} viewBox="0 0 28 30">
        <path d="M14 1 26 5.5v9.2c0 7.2-5 12.3-12 14.3C7 27 2 21.9 2 14.7V5.5L14 1Z" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M9 12h10M9 16h10M9 20h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M16.5 20h3" stroke="#F5E663" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Знак + име, като линк (по подразбиране към началната страница) */
export function Logo({ href = "/", size = 40, className = "" }: { href?: string; size?: number; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-3 whitespace-nowrap font-extrabold tracking-tight text-white no-underline ${className}`}
      style={{ fontSize: Math.round(size / 2) }}
    >
      <LogoMark size={size} />
      MiCA Guard
    </Link>
  );
}
