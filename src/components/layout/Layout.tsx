import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeTab = location.pathname.split("/")[1] || "editor";

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/${tab}`)} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
