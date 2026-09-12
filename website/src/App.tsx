import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { TechStack } from "./components/TechStack";
import { DownloadSection } from "./components/DownloadSection";
import { Footer } from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header />
      <main className="pt-16">
        <Hero />
        <Features />
        <TechStack />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
