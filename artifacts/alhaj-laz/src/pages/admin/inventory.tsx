import { useState } from "react";
import { useLocation } from "wouter";
import { useListProducts, useUpdateProduct, useAdminMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Package, AlertTriangle, CheckCircle2, XCircle, Pencil, Check, X } from "lucide-react";

export default function AdminInventory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: session, isLoading: sessionLoading } = useAdminMe();
  const { data: products, isLoading } = useListProducts();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تحديث المخزون" });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setEditingId(null);
      },
      onError: () => toast({ variant: "destructive", title: "فشل تحديث المخزون" }),
    },
  });

  const handleSave = (id: number) => {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) {
      toast({ variant: "destructive", title: "أدخل رقماً صحيحاً >= 0" });
      return;
    }
    updateProduct.mutate({ id, data: { stock: val } });
  };

  const all = products ?? [];
  const outOfStock = all.filter(p => p.stock === 0).length;
  const lowStock = all.filter(p => p.stock > 0 && p.stock <= 5).length;
  const inStock = all.filter(p => p.stock > 5).length;

  const sorted = [...all].sort((a, b) => a.stock - b.stock);

  const stockBadge = (stock: number) => {
    if (stock === 0) return { cls: "bg-red-100 text-red-800", label: "نفد المخزون", icon: XCircle };
    if (stock <= 5) return { cls: "bg-amber-100 text-amber-800", label: "مخزون منخفض", icon: AlertTriangle };
    return { cls: "bg-green-100 text-green-800", label: "متوفر", icon: CheckCircle2 };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المخزون</h1>
          <p className="text-muted-foreground mt-1">تتبع مستويات المخزون وتحديثها</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-muted-foreground">نفد المخزون</p><p className="text-2xl font-bold">{outOfStock}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">مخزون منخفض</p><p className="text-2xl font-bold">{lowStock}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">متوفر</p><p className="text-2xl font-bold">{inStock}</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> المنتجات ({all.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      {["المنتج","التصنيف","السعر","الحد الأدنى","المخزون","الحالة",""].map(h => (
                        <th key={h} className="h-11 px-4 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(p => {
                      const badge = stockBadge(p.stock);
                      const Icon = badge.icon;
                      return (
                        <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-medium max-w-[180px] truncate" title={p.name}>{p.name}</td>
                          <td className="p-3 text-muted-foreground text-xs">{p.category}</td>
                          <td className="p-3 font-medium">{Number(p.price).toLocaleString("ar-DZ")} د.ج</td>
                          <td className="p-3 text-center">{p.minOrderQty}</td>
                          <td className="p-3">
                            {editingId === p.id ? (
                              <Input
                                type="number"
                                min={0}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="h-8 w-24 text-center"
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") handleSave(p.id); if (e.key === "Escape") setEditingId(null); }}
                              />
                            ) : (
                              <span className={`font-bold text-lg ${p.stock === 0 ? "text-red-600" : p.stock <= 5 ? "text-amber-600" : "text-green-600"}`}>
                                {p.stock}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                              <Icon className="w-3 h-3" />{badge.label}
                            </span>
                          </td>
                          <td className="p-3">
                            {editingId === p.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 px-2" onClick={() => handleSave(p.id)} disabled={updateProduct.isPending}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingId(p.id); setEditValue(String(p.stock)); }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
