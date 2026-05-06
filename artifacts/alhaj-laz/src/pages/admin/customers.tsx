import { useState } from "react";
import { useLocation } from "wouter";
import { useListOrders, useAdminMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, Search, ShoppingBag } from "lucide-react";
import { formatDZD } from "@/lib/utils";

interface Customer {
  phone: string;
  firstName: string;
  lastName: string;
  wilaya: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  statuses: string[];
}

export default function AdminCustomers() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data: session, isLoading: sessionLoading } = useAdminMe();
  const { data: orders, isLoading } = useListOrders();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const customerMap = new Map<string, Customer>();
  for (const o of orders ?? []) {
    const existing = customerMap.get(o.phone);
    if (existing) {
      existing.totalOrders++;
      existing.totalSpent += Number(o.totalPrice);
      if (new Date(o.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = o.createdAt;
      }
      existing.statuses.push(o.status);
    } else {
      customerMap.set(o.phone, {
        phone: o.phone,
        firstName: o.firstName,
        lastName: o.lastName,
        wilaya: o.wilaya ?? null,
        totalOrders: 1,
        totalSpent: Number(o.totalPrice),
        lastOrderDate: o.createdAt,
        statuses: [o.status],
      });
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
  );

  const filtered = customers.filter(c =>
    search === "" ||
    c.firstName.includes(search) ||
    c.lastName.includes(search) ||
    c.phone.includes(search) ||
    (c.wilaya ?? "").includes(search)
  );

  const repeatCustomers = customers.filter(c => c.totalOrders > 1).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الزبائن</h1>
          <p className="text-muted-foreground mt-1">جميع الزبائن مرتّبين حسب آخر طلبية</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الزبائن</p><p className="text-2xl font-bold">{customers.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full"><ShoppingBag className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">زبائن متكررون</p><p className="text-2xl font-bold">{repeatCustomers}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full"><Phone className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط الإنفاق</p>
              <p className="text-lg font-bold">{customers.length > 0 ? formatDZD(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : "—"}</p>
            </div>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو الهاتف أو الولاية..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10 h-11"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد نتائج</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      {["الاسم","الهاتف","الولاية","الطلبيات","إجمالي الإنفاق","آخر طلبية"].map(h => (
                        <th key={h} className="h-11 px-4 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.phone} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                        <td className="p-3 font-mono text-xs" dir="ltr">{c.phone}</td>
                        <td className="p-3 text-muted-foreground">{c.wilaya ?? "—"}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.totalOrders > 1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                            {c.totalOrders} طلبية
                          </span>
                        </td>
                        <td className="p-3 font-bold text-primary">{formatDZD(c.totalSpent)}</td>
                        <td className="p-3 text-xs text-muted-foreground" dir="ltr">
                          {new Date(c.lastOrderDate).toLocaleDateString("en-GB")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
