import { NavLink } from "react-router-dom";

const links = [
  {
    to: "/",
    label: "Library",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: "/vocabulary",
    label: "Vocabulary",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    to: "/practice",
    label: "Practice",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 rounded-2xl flex items-center justify-around px-2 py-2"
        style={{
          background: "var(--color-surface)",
          border: "0.5px solid var(--color-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl transition-all duration-150"
            style={({ isActive }) => ({
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
              textDecoration: "none",
              background: isActive ? "var(--color-surface-raised)" : "transparent",
            })}
            aria-label={label}
          >
            {({ isActive }) => (
              <span style={{ opacity: isActive ? 1 : 0.45 }}>{icon}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}