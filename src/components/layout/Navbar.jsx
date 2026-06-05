import { NavLink } from "react-router-dom";

const links = [
  {
    to: "/",
    label: "Library",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-library-icon lucide-library"><path d="m16 6 4 14"/><path d="M12 6v14"/>
        <path d="M8 8v12"/>
        <path d="M4 4v16"/>
      </svg>
    ),
  },
  {
    to: "/vocabulary",
    label: "Vocabulary",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    to: "/practice",
    label: "Practice",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

export default function Navbar() {
  return (
    <>
      {/* ── Desktop: left sidebar ── */}
      <nav
        className="hidden md:flex flex-col gap-1 fixed top-0 left-0 h-screen px-3 py-6 w-52"
        style={{
          background: "var(--color-surface)",
          borderRight: "0.5px solid var(--color-border)",
        }}
      >
        {/* Logo */}
        <div className="px-3 mb-8">
          <span style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            Voca
          </span>
        </div>

        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
            style={({ isActive }) => ({
              background: isActive ? "var(--color-surface-raised)" : "transparent",
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: isActive ? 500 : 400,
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ opacity: isActive ? 1 : 0.5 }}>{icon}</span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Mobile: floating bottom bar ── */}
      <nav
        className="md:hidden fixed bottom-5 left-6 right-6 z-50 rounded-3xl flex items-center justify-around px-1 py-0.3"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(255,255,255,0.05)
          `,
        }}
      >
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className="flex flex-col items-center justify-center flex-1 gap-1 py-1 rounded-xl transition-all duration-150"
          style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
          aria-label={label}
        >
        {({ isActive }) => (
          <div
            className="flex flex-col items-center gap-1 px-5 py-1 rounded-full transition-all duration-200"
            style={{
              background: isActive
                ? "rgba(255,255,255,0.12)"
                : "transparent",
              backdropFilter: isActive ? "blur(8px)" : "none",
              boxShadow: isActive
                ? "0 px 16px rgba(255,255,255,0.08)"
                : "none",
            }}
          >
            <span
              style={{
                opacity: isActive ? 1 : 0.55,
              }}
            >
              {icon}
            </span>

            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                opacity: isActive ? 1 : 0.5,
              }}
            >
              {label}
            </span>
          </div>
        )}
        </NavLink>
      ))}
    </nav>
    </>
  );
}