import { useEffect, useState } from "react";
import { Menu, X, Download } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const GITHUB_URL = "https://github.com/Jack-Sai/omni-novel";
const RELEASE_URL = "https://github.com/Jack-Sai/omni-novel/releases";

const navItems = [
  { label: "功能", href: "#features" },
  { label: "技术", href: "#tech" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHidden(currentScrollY > lastScrollY && currentScrollY > 80);
      setScrolled(currentScrollY > 20);
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 border-b border-line transition-all duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        scrolled ? "bg-surface/95 backdrop-blur-md" : "bg-surface/80 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto max-w-6xl h-full flex items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 no-underline">
          <img src="/logo.png" alt="Omni Novel" className="w-8 h-8" />
          <span className="text-[15px] font-semibold text-ink tracking-tight">
            Omni Novel
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-[14px] text-ink-2 hover:text-ink rounded-lg hover:bg-hover transition-colors duration-150"
            >
              {item.label}
            </a>
          ))}

          <div className="w-px h-5 bg-line mx-2" />

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-ink-2 hover:text-ink rounded-lg hover:bg-hover transition-colors duration-150"
            title="GitHub"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          <ThemeToggle />

          <a
            href={RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-on-primary text-[14px] font-medium hover:bg-primary-hover transition-colors duration-150 no-underline"
          >
            <Download className="w-4 h-4" />
            下载
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-ink-2 hover:text-ink rounded-lg hover:bg-hover transition-colors duration-150"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-line omni-fade-in">
          <nav className="px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2.5 text-[14px] text-ink-2 hover:text-ink rounded-lg hover:bg-hover transition-colors duration-150 no-underline"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}

            <div className="h-px bg-line my-2" />

            <div className="flex items-center justify-between px-3 py-2.5">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-ink-2 hover:text-ink transition-colors duration-150 no-underline"
              >
                GitHub
              </a>
              <ThemeToggle />
            </div>

            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-on-primary text-[14px] font-medium hover:bg-primary-hover transition-colors duration-150 no-underline"
            >
              <Download className="w-4 h-4" />
              下载
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
