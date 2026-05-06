import { useLocation } from "wouter";
import { useListOrders, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, MapPin, Download } from "lucide-react";
import { formatDZD } from "@/lib/utils";
const WILAYA_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#f97316"];

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading: sessionLoading } = useAdminMe();
  const { data: orders, isLoading } = useListOrders();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const allOrders = orders ?? [];
  const delivered = allOrders.filter(o => ["delivered","cash_ready"].includes(o.status));
  const totalRevenue = delivered.reduce((s, o) => s + Number(o.totalPrice), 0);
  const avgOrderValue = allOrders.length > 0 ? allOrders.reduce((s, o) => s + Number(o.totalPrice), 0) / allOrders.length : 0;

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  const dailyMap: Record<string, { orders: number; revenue: number }> = {};
  for (const d of last30Days) dailyMap[d] = { orders: 0, revenue: 0 };
  for (const o of allOrders) {
    const d = new Date(o.createdAt).toISOString().split("T")[0];
    if (dailyMap[d]) {
      dailyMap[d].orders++;
      dailyMap[d].revenue += Number(o.totalPrice);
    }
  }
  const dailyData = last30Days.map(d => ({
    date: d.slice(5),
    orders: dailyMap[d].orders,
    revenue: dailyMap[d].revenue,
  }));

  const productMap: Record<string, number> = {};
  for (const o of allOrders) {
    productMap[o.productName] = (productMap[o.productName] ?? 0) + o.quantity;
  }
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, qty]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, qty }));

  const wilayaMap: Record<string, number> = {};
  for (const o of allOrders) {
    const w = o.wilaya ?? "غير محدد";
    wilayaMap[w] = (wilayaMap[w] ?? 0) + 1;
  }
  const wilayaData = Object.entries(wilayaMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const handleExportExcel = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };
    const rows = [
      ["#", "الاسم", "الهاتف", "الولاية", "المنتج", "الكمية", "المبلغ", "الحالة", "التاريخ"],
      ...allOrders.map(o => [
        o.id,
        `${o.firstName} ${o.lastName}`,
        o.phone,
        o.wilaya ?? "",
        o.productName,
        o.quantity,
        Number(o.totalPrice),
        o.status,
        new Date(o.createdAt).toLocaleDateString("en-GB"),
      ]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-الطلبيات-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">تقارير المبيعات</h1>
            <p className="text-muted-foreground mt-1">إحصائيات شاملة عن أداء المتجر</p>
          </div>
          <Button onClick={handleExportExcel} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "إجمالي الطلبيات", value: allOrders.length, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-100" },
                { label: "الإيرادات المحصّلة", value: formatDZD(totalRevenue), icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
                { label: "متوسط قيمة الطلبية", value: formatDZD(avgOrderValue), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
                { label: "ولايات مختلفة", value: Object.keys(wilayaMap).length, icon: MapPin, color: "text-orange-600", bg: "bg-orange-100" },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`${kpi.bg} p-3 rounded-full`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">الطلبيات اليومية (آخر 30 يوم)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "طلبيات"]} />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">أكثر المنتجات طلباً</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart layout="vertical" data={topProducts} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip formatter={(v: number) => [v, "قطعة"]} />
                      <Bar dataKey="qty" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">توزيع الطلبيات حسب الولاية</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={wilayaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {wilayaData.map((_, i) => (
                          <Cell key={i} fill={WILAYA_COLORS[i % WILAYA_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "طلبية"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {wilayaData.map((w, i) => (
                      <div key={w.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: WILAYA_COLORS[i % WILAYA_COLORS.length] }} />
                        <span className="flex-1 truncate">{w.name}</span>
                        <span className="font-bold">{w.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
