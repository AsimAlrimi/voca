import Navbar from "./components/layout/Navbar";
import AppRouter from "./router/AppRouter";

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 md:pl-52">
        <AppRouter />
      </main>
    </div>
  );
}

export default App;