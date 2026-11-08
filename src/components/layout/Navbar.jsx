import { NavLink } from "react-router-dom";
import Icon from "../common/Icon";

const LINKS = [
  { to: "/", label: "Library", icon: "library" },
  { to: "/vocabulary", label: "Vocabulary", icon: "vocabulary" },
  { to: "/practice", label: "Practice", icon: "practice" },
];

export default function Navbar() {
  return (
    <>
      {/* Desktop: left sidebar */}
      <nav
        aria-label="Main"
        className="fixed left-0 top-0 hidden h-dvh w-52 flex-col gap-1 border-r border-border bg-surface px-3 py-6 md:flex"
      >
        <div className="mb-8 flex items-center gap-2.5 px-3">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width="24" height="24" className="rounded-md" />
          <span className="text-lg font-semibold tracking-tight text-text-primary">Voca</span>
        </div>

        {LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm no-underline transition-colors ${
                isActive
                  ? "bg-surface-raised font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={icon} size={20} className={isActive ? "opacity-100" : "opacity-60"} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Mobile: floating bottom bar, lifted above the iOS home indicator */}
      <nav
        aria-label="Main"
        className="fixed inset-x-4 z-40 flex items-center justify-around rounded-3xl border border-white/10 p-1 md:hidden"
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          background: "rgba(24,24,24,0.72)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex flex-1 justify-center rounded-2xl text-text-primary no-underline"
          >
            {({ isActive }) => (
              <span
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                  isActive ? "bg-white/10" : ""
                }`}
              >
                <Icon name={icon} size={22} className={isActive ? "opacity-100" : "opacity-55"} />
                <span className={`text-[10px] ${isActive ? "font-semibold" : "opacity-60"}`}>{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
