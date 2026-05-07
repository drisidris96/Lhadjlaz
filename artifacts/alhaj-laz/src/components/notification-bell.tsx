import { useEffect, useRef, useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "lhadjlaz_last_order_id";

export function NotificationBell() {
  const { toast } = useToast();
  const [newCount, setNewCount] = useState(0);
  const initialized = useRef(false);

  const { data: orders } = useListOrders({ query: { refetchInterval: 30000 } });

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const maxId = Math.max(...orders.map(o => o.id));
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0");

    if (!initialized.current) {
      initialized.current = true;
      localStorage.setItem(STORAGE_KEY, String(maxId));
      return;
    }

    if (maxId > stored) {
      const newOrders = orders.filter(o => o.id > stored);
      setNewCount(n => n + newOrders.length);
      localStorage.setItem(STORAGE_KEY, String(maxId));

      toast({
        title: `🛍️ ${newOrders.length > 1 ? `${newOrders.length} طلبيات جديدة` : "طلبية جديدة!"}`,
        description: newOrders.length === 1 ? `${newOrders[0].firstName} ${newOrders[0].lastName} — ${newOrders[0].productName}` : "تحقق من لوحة الطلبيات",
      });

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("متجر الفخامة — طلبية جديدة!", {
          body: newOrders.length === 1 ? `${newOrders[0].firstName} — ${newOrders[0].productName}` : `${newOrders.length} طلبيات جديدة`,
          icon: "/favicon.ico",
        });
      }
    }
  }, [orders]);

  const handleClick = () => {
    setNewCount(0);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  return (
    <button onClick={handleClick} className="relative p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
      <Bell className="w-5 h-5" />
      {newCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
          {newCount > 9 ? "9+" : newCount}
        </span>
      )}
    </button>
  );
}
