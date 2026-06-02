import Navbar from "./components/layout/Navbar";
import AppRouter from "./router/AppRouter";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6">
        <AppRouter />
      </main>
    </div>
  );
}

export default App;