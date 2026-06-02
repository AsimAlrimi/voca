import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200";

  return (
    <nav className="border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-6 py-4 flex gap-6">
        <NavLink to="/" className={linkClass}>
          Library
        </NavLink>

        <NavLink to="/vocabulary" className={linkClass}>
          Vocabulary
        </NavLink>

        <NavLink to="/practice" className={linkClass}>
          Practice
        </NavLink>
      </div>
    </nav>
  );
}