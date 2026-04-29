import { useLocation } from "wouter";
import { useGetAdminStats, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingBag, Clock, DollarSign, ArrowUpRight } from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { ORDER_STATUS_ARABIC } from "@/lib/constants";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading: sessionLoading } = useAdminMe();
  
  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { enabled: !!session?.isAdmin }
  });

  if (sessionLoading || statsLoading || !stats) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">لوحة الإحصائيات</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">مرحباً بك في لوحة الإدارة</h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على أداء متجر الحاج لاز للجملة</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المنتجات</CardTitle>
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</CardTitle>
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">طلبات قيد الانتظار</CardTitle>
              <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border/60 shadow-sm border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">المبيعات الإجمالية</CardTitle>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-primary">{formatDZD(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>أحدث الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">رقم</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">الزبون</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">المنتج</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">التاريخ</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">المبلغ</th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {stats.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle font-mono font-medium">#{order.id}</td>
                        <td className="p-4 align-middle">
                          <div className="font-semibold">{order.firstName} {order.lastName}</div>
                          <div className="text-xs text-muted-foreground">{order.wilaya} - {order.phone}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-medium line-clamp-1">{order.productName}</div>
                          <div className="text-xs text-muted-foreground">{order.quantity} قطعة</div>
                        </td>
                        <td className="p-4 align-middle text-muted-foreground" dir="ltr">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="p-4 align-middle font-bold">
                          {formatDZD(order.totalPrice)}
                        </td>
                        <td className="p-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                              order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'}`}
                          >
                            {ORDER_STATUS_ARABIC[order.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                لا توجد طلبات حديثة
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
