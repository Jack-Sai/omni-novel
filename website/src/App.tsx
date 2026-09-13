import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { TechStack } from "./components/TechStack";
import { FAQ } from "./components/FAQ";
import { DownloadSection } from "./components/DownloadSection";
import { Roadmap } from "./components/Roadmap";
import { Footer } from "./components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header />
      <main className="pt-16">
        <Hero />
        <Features />
        <HowItWorks />
        <TechStack />
        <FAQ />
        <DownloadSection />
        <Roadmap />
      </main>
      <Footer />
    </div>
  );
}

export default App;
