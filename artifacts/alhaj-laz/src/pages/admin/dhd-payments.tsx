import { useState } from "react";
import { useLocation } from "wouter";
import { useListOrders, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey } from "@workspace/api-client-react";

type Tab = "unrecovered" | "unpaid";

export default function AdminDhdPayments() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("unrecovered");
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useAdminMe();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: orders, isLoading: ordersLoading } = useListOrders();

  const allOrders = orders ?? [];

  const unrecovered = allOrders.filter((o) => o.status === "delivered" && o.trackingNumber);
  const unpaid = allOrders.filter((o) => o.status === "cash_ready" && o.trackingNumber);

  const sumTotal = (list: typeof allOrders) =>
    list.reduce((acc, o) => acc + Number(o.totalPrice), 0);

  const displayed = activeTab === "unrecovered" ? unrecovered : unpaid;
  const total = sumTotal(displayed);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">مدفوعات DHD</h1>
            <p className="text-muted-foreground mt-1">
              متابعة حالة الأموال للطلبيات المشحونة عبر DHD
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all border-2 ${activeTab === "unrecovered" ? "border-orange-400 bg-orange-50" : "border-transparent hover:border-orange-200"}`}
            onClick={() => setActiveTab("unrecovered")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">أموال غير مسترجعة</p>
                  <p className="text-2xl font-bold text-orange-700">{unrecovered.length}</p>
                  <p className="text-sm font-medium text-orange-600">{formatDZD(sumTotal(unrecovered))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${activeTab === "unpaid" ? "border-emerald-500 bg-emerald-50" : "border-transparent hover:border-emerald-200"}`}
            onClick={() => setActiveTab("unpaid")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مسترجعة غير مدفوعة</p>
                  <p className="text-2xl font-bold text-emerald-700">{unpaid.length}</p>
                  <p className="text-sm font-medium text-emerald-600">{formatDZD(sumTotal(unpaid))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              {activeTab === "unrecovered" ? "أموال غير مسترجعة" : "مسترجعة غير مدفوعة"}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">المجموع:</span>
              <span className="text-lg font-bold text-primary">{formatDZD(total)}</span>
              <span className="text-sm font-medium bg-muted text-foreground px-3 py-1 rounded-full">
                {displayed.length} طلبية
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : displayed.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">#</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">رقم التتبع</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">العميل</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">الولاية</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">الطلبية</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">المبلغ</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">التاريخ</th>
                      <th className="h-11 px-4 align-middle font-medium text-muted-foreground">حالة الدفع</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {displayed.map((order) => (
                      <tr key={order.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-4 align-middle font-mono font-bold text-muted-foreground">
                          #{order.id}
                        </td>
                        <td className="p-4 align-middle font-mono text-xs" dir="ltr">
                          {order.trackingNumber ?? "-"}
                        </td>
                        <td className="p-4 align-middle font-medium">
                          {order.firstName} {order.lastName}
                        </td>
                        <td className="p-4 align-middle text-sm text-muted-foreground">
                          {order.wilaya ?? "-"}
                        </td>
                        <td className="p-4 align-middle max-w-[180px] truncate" title={order.productName}>
                          {order.productName}
                          <span className="text-muted-foreground mr-1">×{order.quantity}</span>
                        </td>
                        <td className="p-4 align-middle font-bold text-primary whitespace-nowrap">
                          {formatDZD(order.totalPrice)}
                        </td>
                        <td className="p-4 align-middle text-muted-foreground text-xs" dir="ltr">
                          {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-4 align-middle">
                          {activeTab === "unrecovered" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <Clock className="w-3 h-3" />
                              غير مسترجعة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              في انتظار الدفع
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Banknote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبيات
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeTab === "unrecovered"
                    ? "لا توجد طلبيات في انتظار استرجاع الأموال"
                    : "لا توجد طلبيات في انتظار الدفع"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
