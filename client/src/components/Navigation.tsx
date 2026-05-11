import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Globe, Bell, LogOut, Upload, Sparkles, History as HistoryIcon, FolderOpen, Star, Settings as SettingsIcon, CheckCircle2, Zap, Key, Code2 } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Navigation() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const navItems = [
    { path: "/projects", label: "Projects", icon: FolderOpen },
    { path: "/analysis", label: "Analysis", icon: Sparkles },
    { path: "/domain-checker", label: "Domain Checker", icon: CheckCircle2 },
    { path: "/affiliate-intelligence", label: "Affiliate Intel", icon: Zap },
    { path: "/history", label: "History", icon: HistoryIcon },
    { path: "/watchlist", label: "Watchlist", icon: Star },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/domains", label: "Domains", icon: Globe },
    { path: "/alerts", label: "Alerts", icon: Bell },
    { path: "/bulk-import", label: "Import", icon: Upload },
    { path: "/api-keys", label: "API Keys", icon: Key },
    { path: "/developer", label: "Developer", icon: Code2 },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  // Add admin link for admin users
  if (user?.role === "admin") {
    navItems.push({ path: "/admin", label: "Admin", icon: LayoutDashboard });
  }

  return (
    <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <h2 className="text-2xl font-bold cursor-pointer" style={{ fontFamily: "'Playfair Display', serif" }}>
                FlipandSift
              </h2>
            </Link>
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    asChild
                  >
                    <Link href={item.path}>
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
