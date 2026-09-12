import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";

function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header />
      <main className="pt-16">
        <Hero />
        <Features />
      </main>
    </div>
  );
}

export default App;
