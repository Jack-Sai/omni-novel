import { Header } from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header />
      <main className="pt-16">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h1 className="text-3xl font-semibold">Omni Novel 官网</h1>
        </div>
      </main>
    </div>
  );
}

export default App;
