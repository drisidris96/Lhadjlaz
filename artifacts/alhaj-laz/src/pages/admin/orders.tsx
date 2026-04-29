import { useLocation } from "wouter";
import {
  useListOrders,
  useUpdateOrderStatus,
  useAdminMe,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Check, X, Inbox, Archive } from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { ORDER_STATUS_ARABIC } from "@/lib/constants";
import type { UpdateOrderStatusBodyStatus } from "@workspace/api-client-react/generated";

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useAdminMe();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: orders, isLoading: ordersLoading } = useListOrders();

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: (_data, variables) => {
        const newStatus = (variables.data as { status: string })?.status;
        const msg =
          newStatus === "confirmed"
            ? "تم قبول الطلب"
            : newStatus === "cancelled"
            ? "تم رفض الطلب"
            : "تم تحديث حالة الطلب";
        toast({ title: msg });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "حدث خطأ",
          description: "لم نتمكن من تحديث حالة الطلب",
        });
      },
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({
      id,
      data: { status: status as UpdateOrderStatusBodyStatus },
    });
  };

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

  const pendingOrders = (orders ?? []).filter((o) => o.status === "pending");
  const processedOrders = (orders ?? []).filter(
    (o) => o.status === "confirmed" || o.status === "cancelled",
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الطلبات</h1>
          <p className="text-muted-foreground mt-1">
            راجع الطلبات الجديدة وأكّدها أو ارفضها، وتابع الطلبات المؤكَّدة والملغاة
          </p>
        </div>

        {/* ============== الطلبات الجديدة (قيد الانتظار) ============== */}
        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" />
              الطلبات الجديدة
            </CardTitle>
            <span className="text-sm font-medium bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              {pendingOrders.length} طلب
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingOrders.length > 0 ? (
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
                        معلومات الزبون
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        المنتج
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
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-56">
                        إجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {pendingOrders.map((order) => (
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
                        <td className="p-4 align-middle">
                          <div className="font-semibold">
                            {order.firstName} {order.lastName}
                          </div>
                          <div
                            className="text-xs text-muted-foreground mt-1"
                            dir="ltr"
                          >
                            {order.phone}
                          </div>
                          <div className="text-xs mt-1">
                            {order.wilaya} - {order.address}
                          </div>
                        </td>
                        <td
                          className="p-4 align-middle font-medium max-w-[200px] truncate"
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
                          <div className="flex items-center gap-2">
                            <Button
                              size="default"
                              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold shadow-md hover:shadow-lg transition-all"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                handleStatusChange(order.id, "confirmed")
                              }
                              data-testid={`button-accept-${order.id}`}
                            >
                              <Check className="w-5 h-5 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="default"
                              variant="destructive"
                              className="font-bold shadow-md hover:shadow-lg transition-all"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                handleStatusChange(order.id, "cancelled")
                              }
                              data-testid={`button-reject-${order.id}`}
                            >
                              <X className="w-5 h-5 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبات جديدة
                </h3>
                <p className="text-muted-foreground">
                  جميع الطلبات الواردة تم التعامل معها
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============== الطلبات المؤكَّدة والملغاة ============== */}
        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              الطلبات المؤكَّدة والملغاة
            </CardTitle>
            <span className="text-sm font-medium bg-muted text-foreground px-3 py-1 rounded-full">
              {processedOrders.length} طلب
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : processedOrders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
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
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-40">
                        حالة الطلب
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {processedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
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
                          className="p-4 align-middle max-w-[220px] truncate"
                          title={order.productName}
                        >
                          {order.productName}
                        </td>
                        <td className="p-4 align-middle font-bold text-center">
                          {order.quantity}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={
                                updateStatus.isPending ||
                                order.status === "confirmed"
                              }
                              onClick={() =>
                                handleStatusChange(order.id, "confirmed")
                              }
                              className={
                                order.status === "confirmed"
                                  ? "bg-blue-600 text-white font-bold shadow cursor-default opacity-100 disabled:opacity-100"
                                  : "bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 font-medium shadow-sm"
                              }
                              data-testid={`button-set-confirmed-${order.id}`}
                            >
                              <Check className="w-4 h-4 ml-1" />
                              {ORDER_STATUS_ARABIC.confirmed}
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                updateStatus.isPending ||
                                order.status === "cancelled"
                              }
                              onClick={() =>
                                handleStatusChange(order.id, "cancelled")
                              }
                              className={
                                order.status === "cancelled"
                                  ? "bg-red-600 text-white font-bold shadow cursor-default opacity-100 disabled:opacity-100"
                                  : "bg-white border border-red-600 text-red-700 hover:bg-red-50 font-medium shadow-sm"
                              }
                              data-testid={`button-set-cancelled-${order.id}`}
                            >
                              <X className="w-4 h-4 ml-1" />
                              {ORDER_STATUS_ARABIC.cancelled}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبات مُعالَجة بعد
                </h3>
                <p className="text-muted-foreground">
                  ستظهر هنا الطلبات بعد قبولها أو رفضها
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
