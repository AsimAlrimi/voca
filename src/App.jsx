import { useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import AppRouter from "./router/AppRouter";

function App() {
  const { pathname } = useLocation();
  const isReader = pathname.startsWith("/read/");

  // The reader is full-screen: no navbar, no page padding.
  if (isReader) return <AppRouter />;

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="md:pl-52">
        <main className="app-main mx-auto max-w-5xl px-4 sm:px-6 md:px-10">
          <AppRouter />
        </main>
      </div>
    </div>
  );
}

export default App;
