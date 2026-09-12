import { Header } from "./components/Header";
import { Hero } from "./components/Hero";

function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header />
      <main className="pt-16">
        <Hero />
      </main>
    </div>
  );
}

export default App;
