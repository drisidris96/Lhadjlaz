import { Link, useLocation } from "wouter";
import {
  Package, ShoppingBag, LayoutDashboard, LogOut, ListChecks,
  Store, Truck, RefreshCw, Banknote, BarChart2, Users, Warehouse, Tag,
} from "lucide-react";
import { useAdminLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

const NAV = [
  { href: "/admin",            label: "الرئيسية",       icon: LayoutDashboard },
  { href: "/admin/reports",    label: "التقارير",        icon: BarChart2 },
  { href: "/admin/customers",  label: "الزبائن",         icon: Users },
  { href: "/admin/products",   label: "المنتجات",        icon: Package },
  { href: "/admin/categories", label: "الفئات",           icon: Tag },
  { href: "/admin/inventory",  label: "المخزون",         icon: Warehouse },
  { href: "/admin/orders",     label: "الطلبات",         icon: ShoppingBag },
  { href: "/admin/orders-list",label: "قائمة الطلبات",   icon: ListChecks },
  { href: "/admin/dhd",        label: "توصيل DHD",       icon: Truck },
  { href: "/admin/dhd-sync",   label: "مزامنة DHD",      icon: RefreshCw },
  { href: "/admin/dhd-orders", label: "طلبيات DHD",      icon: Truck },
  { href: "/admin/dhd-payments",label: "مدفوعات DHD",    icon: Banknote },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const logout = useAdminLogout({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تسجيل الخروج بنجاح" });
        setLocation("/");
      },
    },
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <aside className="w-full md:w-64 bg-sidebar border-l border-sidebar-border flex-shrink-0">
        <div className="p-6 flex items-center justify-between">
          <div>
            <Link href="/admin">
              <h2 className="text-2xl font-bold text-sidebar-primary tracking-tight cursor-pointer">
                لوحة الإدارة
              </h2>
            </Link>
            <p className="text-sidebar-foreground/70 text-sm mt-1">متجر الفخامة</p>
          </div>
          <NotificationBell />
        </div>

        <style>{`
          @keyframes nav-icon-bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25%      { transform: translateY(-3px) rotate(-8deg); }
            50%      { transform: translateY(0) rotate(0deg); }
            75%      { transform: translateY(-2px) rotate(8deg); }
          }
          @keyframes nav-icon-glow {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.6)); }
            50%      { filter: drop-shadow(0 0 6px rgba(250,204,21,0.9)); }
          }
          .nav-icon-anim {
            animation: nav-icon-bounce 2.4s ease-in-out infinite,
                       nav-icon-glow   2.4s ease-in-out infinite;
            transform-origin: center;
          }
          .nav-item:hover .nav-icon-anim {
            animation-duration: 0.8s;
          }
        `}</style>
        <nav className="px-4 py-2 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className="nav-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all"
                  style={{
                    backgroundColor: "transparent",
                    color: "#ffffff",
                    border: active ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.6)",
                    fontWeight: 600,
                  }}
                >
                  <Icon className="nav-icon-anim w-4 h-4 flex-shrink-0" style={{ color: "#ffffff" }} />
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span
                      style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: "linear-gradient(135deg,#fde047,#facc15)",
                        boxShadow: "0 0 4px rgba(250,204,21,0.8)",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}

          <div className="pt-2 mt-2 border-t border-sidebar-border/50 space-y-2">
            {[
              { href: "/store", label: "المتجر", Icon: Store },
              { href: "/track", label: "تتبع الطلبية", Icon: Truck },
            ].map(({ href, label, Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}>
                  <div
                    className="nav-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all"
                    style={{
                      backgroundColor: "transparent",
                      color: "#ffffff",
                      border: active ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.6)",
                      fontWeight: 600,
                    }}
                  >
                    <Icon className="nav-icon-anim w-4 h-4 flex-shrink-0" style={{ color: "#ffffff" }} />
                    <span className="flex-1">{label}</span>
                    {active && (
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: "linear-gradient(135deg,#fde047,#facc15)",
                          boxShadow: "0 0 4px rgba(250,204,21,0.8)",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 mt-auto md:absolute md:bottom-0 md:w-64">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 text-sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4 ml-3" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
