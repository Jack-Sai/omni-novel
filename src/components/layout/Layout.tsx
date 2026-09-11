import { useState } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState("editor");

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
