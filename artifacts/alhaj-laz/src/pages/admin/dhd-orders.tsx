import { useLocation } from "wouter";
import { useListOrders, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, RefreshCw, Clock } from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { ORDER_STATUS_ARABIC } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  shipped: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  pending_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cash_ready: "bg-emerald-100 text-emerald-800",
};

const SHIPPED_STATUSES = [
  "shipped",
  "out_for_delivery",
  "pending_delivery",
  "delivered",
  "cash_ready",
] as const;

const STATUS_ORDER = [...SHIPPED_STATUSES];

export default function AdminDhdOrders() {
  const [, setLocation] = useLocation();

  const { data: session, isLoading: sessionLoading } = useAdminMe();
  const { data: orders, isLoading, dataUpdatedAt } = useListOrders({
    query: { refetchInterval: 30000 },
  });

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const dhdOrders = (orders ?? []).filter((o) =>
    (SHIPPED_STATUSES as readonly string[]).includes(o.status)
  );

  const byStatus: Record<string, typeof dhdOrders> = {};
  for (const s of STATUS_ORDER) byStatus[s] = [];
  for (const o of dhdOrders) {
    const s = o.status;
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(o);
  }

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("ar-DZ", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              طلبيات DHD
            </h1>
            <p className="text-muted-foreground mt-1">
              جميع الطلبيات المشحونة عبر DHD — تتحدث تلقائياً كل 30 ثانية
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>آخر تحديث: {updatedAt ?? "..."}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUS_ORDER.map((s) => (
            <Card key={s} className="text-center">
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{byStatus[s]?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ORDER_STATUS_ARABIC[s] ?? s}
                </p>
                <p className="text-xs font-medium text-primary mt-1">
                  {formatDZD(
                    (byStatus[s] ?? []).reduce(
                      (a, o) => a + Number(o.totalPrice),
                      0
                    )
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : dhdOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">لا توجد طلبيات DHD</h3>
              <p className="text-muted-foreground text-sm mt-1">
                لم يتم شحن أي طلبية عبر DHD حتى الآن
              </p>
            </CardContent>
          </Card>
        ) : (
          STATUS_ORDER.filter((s) => byStatus[s]?.length > 0).map((s) => (
            <Card key={s}>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        STATUS_COLORS[s]?.split(" ")[0] ?? "bg-gray-300"
                      }`}
                    />
                    {ORDER_STATUS_ARABIC[s] ?? s}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {byStatus[s].length} طلبية —{" "}
                    {formatDZD(
                      byStatus[s].reduce((a, o) => a + Number(o.totalPrice), 0)
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm text-right">
                    <thead className="bg-muted/40 [&_tr]:border-b">
                      <tr>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">#</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">رقم التتبع</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">العميل</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">الولاية</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">الطلبية</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">المبلغ</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">التاريخ</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {byStatus[s].map((order) => (
                        <tr
                          key={order.id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="p-3 align-middle font-mono text-xs text-muted-foreground">
                            #{order.id}
                          </td>
                          <td className="p-3 align-middle font-mono text-xs" dir="ltr">
                            {order.trackingNumber}
                          </td>
                          <td className="p-3 align-middle font-medium text-sm">
                            {order.firstName} {order.lastName}
                          </td>
                          <td className="p-3 align-middle text-sm text-muted-foreground">
                            {order.wilaya ?? "-"}
                          </td>
                          <td
                            className="p-3 align-middle text-sm max-w-[160px] truncate"
                            title={order.productName}
                          >
                            {order.productName}
                            <span className="text-muted-foreground mr-1">
                              ×{order.quantity}
                            </span>
                          </td>
                          <td className="p-3 align-middle font-bold text-primary whitespace-nowrap">
                            {formatDZD(order.totalPrice)}
                          </td>
                          <td
                            className="p-3 align-middle text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                STATUS_COLORS[order.status] ??
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {ORDER_STATUS_ARABIC[order.status] ?? order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
