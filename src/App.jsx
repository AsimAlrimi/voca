import { NavLink } from "react-router-dom";
import AppRouter from "./router/AppRouter";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "text-zinc-400"
            }
          >
            Library
          </NavLink>

          <NavLink
            to="/vocabulary"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "text-zinc-400"
            }
          >
            Vocabulary
          </NavLink>

          <NavLink
            to="/practice"
            className={({ isActive }) =>
              isActive ? "text-blue-400" : "text-zinc-400"
            }
          >
            Practice
          </NavLink>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        <AppRouter />
      </main>
    </div>
  );
}

export default App;