import { Link, useLocation } from "wouter";
import { Package, ShoppingBag, LayoutDashboard, LogOut, ListChecks, Store, Truck, RefreshCw, Banknote } from "lucide-react";
import { useAdminLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const logout = useAdminLogout({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تسجيل الخروج بنجاح" });
        setLocation("/");
      },
    }
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <aside className="w-full md:w-64 bg-sidebar border-l border-sidebar-border flex-shrink-0">
        <div className="p-6">
          <Link href="/admin">
            <h2 className="text-2xl font-bold text-sidebar-primary tracking-tight cursor-pointer">
              لوحة الإدارة
            </h2>
          </Link>
          <p className="text-sidebar-foreground/70 text-sm mt-1">الحاج لاز</p>
        </div>
        
        <nav className="px-4 py-2 space-y-2">
          <Link href="/admin">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span>الرئيسية</span>
            </div>
          </Link>
          
          <Link href="/admin/products">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/products" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <Package className="w-5 h-5" />
              <span>المنتجات</span>
            </div>
          </Link>
          
          <Link href="/admin/orders">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/orders" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <ShoppingBag className="w-5 h-5" />
              <span>الطلبات</span>
            </div>
          </Link>

          <Link href="/admin/orders-list">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/orders-list" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <ListChecks className="w-5 h-5" />
              <span>قائمة الطلبات</span>
            </div>
          </Link>

          <Link href="/admin/dhd">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/dhd" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <Truck className="w-5 h-5" />
              <span>توصيل DHD</span>
            </div>
          </Link>

          <Link href="/admin/dhd-sync">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/dhd-sync" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <RefreshCw className="w-5 h-5" />
              <span>مزامنة DHD</span>
            </div>
          </Link>

          <Link href="/admin/dhd-orders">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/dhd-orders" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <Truck className="w-5 h-5" />
              <span>طلبيات DHD</span>
            </div>
          </Link>

          <Link href="/admin/dhd-payments">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin/dhd-payments" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
              <Banknote className="w-5 h-5" />
              <span>مدفوعات DHD</span>
            </div>
          </Link>

          <div className="pt-2 mt-2 border-t border-sidebar-border/50">
            <Link href="/">
              <div className="flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent/50">
                <Store className="w-5 h-5" />
                <span>عرض المتجر</span>
              </div>
            </Link>
          </div>
        </nav>
        
        <div className="p-4 mt-auto md:absolute md:bottom-0 md:w-64">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="w-5 h-5 ml-3" />
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
