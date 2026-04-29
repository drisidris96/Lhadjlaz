import { useLocation } from "wouter";
import { useListOrders, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, ShoppingBag } from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { ORDER_STATUS_ARABIC } from "@/lib/constants";

export default function AdminOrdersList() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading: sessionLoading } = useAdminMe();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: orders, isLoading: ordersLoading } = useListOrders();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const allOrders = orders ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">قائمة الطلبات النهائية</h1>
          <p className="text-muted-foreground mt-1">
            عرض شامل لجميع الطلبات بدون إمكانية التعديل
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              جميع الطلبات
            </CardTitle>
            <span className="text-sm font-medium bg-muted text-foreground px-3 py-1 rounded-full">
              {allOrders.length} طلب
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : allOrders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-20">
                        رقم الطلب
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        التاريخ
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الاسم
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        اللقب
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        العنوان
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        رقم الهاتف
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الطلبية
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الكمية
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        المجموع
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        ملاحظات
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-32">
                        حالة الطلب
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {allOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-4 align-middle font-mono font-bold">
                          #{order.id}
                        </td>
                        <td
                          className="p-4 align-middle text-muted-foreground"
                          dir="ltr"
                        >
                          {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-4 align-middle font-medium">
                          {order.firstName}
                        </td>
                        <td className="p-4 align-middle font-medium">
                          {order.lastName}
                        </td>
                        <td className="p-4 align-middle text-sm">
                          {order.wilaya ? `${order.wilaya} - ` : ""}
                          {order.address}
                        </td>
                        <td className="p-4 align-middle text-sm" dir="ltr">
                          {order.phone}
                        </td>
                        <td
                          className="p-4 align-middle max-w-[200px] truncate"
                          title={order.productName}
                        >
                          {order.productName}
                        </td>
                        <td className="p-4 align-middle font-bold text-center">
                          {order.quantity}
                        </td>
                        <td className="p-4 align-middle font-bold text-primary">
                          {formatDZD(order.totalPrice)}
                        </td>
                        <td
                          className="p-4 align-middle text-xs max-w-[150px] truncate"
                          title={order.notes || ""}
                        >
                          {order.notes || (
                            <span className="text-muted-foreground/50">
                              لا يوجد
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                              order.status,
                            )}`}
                          >
                            {ORDER_STATUS_ARABIC[order.status] ?? order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبات
                </h3>
                <p className="text-muted-foreground">
                  لم يتم تسجيل أي طلبات حتى الآن
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
