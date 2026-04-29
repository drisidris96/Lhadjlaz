import { useLocation } from "wouter";
import { 
  useListOrders, 
  useUpdateOrderStatus,
  useAdminMe,
  getListOrdersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag } from "lucide-react";
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
      onSuccess: () => {
        toast({ title: "تم تحديث حالة الطلب" });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "حدث خطأ", description: "لم نتمكن من تحديث حالة الطلب" });
      }
    }
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({
      id,
      data: { status: status as UpdateOrderStatusBodyStatus }
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الطلبات</h1>
          <p className="text-muted-foreground mt-1">تتبع وتحديث حالات طلبات الزبائن</p>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b">
            <CardTitle>جميع الطلبات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-20">رقم الطلب</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">التاريخ</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">معلومات الزبون</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">المنتج</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">الكمية</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">المجموع</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">ملاحظات</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-40">تحديث الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="p-4 align-middle font-mono font-bold">#{order.id}</td>
                        <td className="p-4 align-middle text-muted-foreground" dir="ltr">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-semibold">{order.firstName} {order.lastName}</div>
                          <div className="text-xs text-muted-foreground mt-1" dir="ltr">{order.phone}</div>
                          <div className="text-xs mt-1">{order.wilaya} - {order.address}</div>
                        </td>
                        <td className="p-4 align-middle font-medium max-w-[200px] truncate" title={order.productName}>
                          {order.productName}
                        </td>
                        <td className="p-4 align-middle font-bold text-center">{order.quantity}</td>
                        <td className="p-4 align-middle font-bold text-primary">{formatDZD(order.totalPrice)}</td>
                        <td className="p-4 align-middle text-xs max-w-[150px] truncate" title={order.notes || ""}>
                          {order.notes || <span className="text-muted-foreground/50">لا يوجد</span>}
                        </td>
                        <td className="p-4 align-middle">
                          <Select 
                            defaultValue={order.status} 
                            onValueChange={(val) => handleStatusChange(order.id, val)}
                          >
                            <SelectTrigger className={`h-8 border-none text-xs font-medium w-[130px] ${getStatusBadgeClass(order.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ORDER_STATUS_ARABIC).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">لا توجد طلبات</h3>
                <p className="text-muted-foreground">لم يتم تسجيل أي طلبات حتى الآن</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
