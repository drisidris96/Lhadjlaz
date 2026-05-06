import { useState } from "react";
import { useListProducts, useCreateOrder } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Search, Package, CheckCircle2, ArrowRight, X, Home, Building2, Truck } from "lucide-react";
import { Link } from "wouter";
import { ALGERIAN_WILAYAS, ALGERIAN_BALADIYAT, DHD_PRICES } from "@/lib/constants";
import type { Product } from "@workspace/api-client-react";

type DeliveryType = "home" | "stop_desk";

const INITIAL_FORM = {
  firstName: "", lastName: "", phone: "",
  wilaya: "", commune: "", address: "",
  quantity: "1", deliveryType: "home" as DeliveryType,
};

export default function Store() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ordered, setOrdered] = useState(false);
  const [orderedId, setOrderedId] = useState<number | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: products, isLoading } = useListProducts({ category: category || undefined, search: search || undefined });

  const dhdPrice = form.wilaya ? DHD_PRICES[form.wilaya] : null;
  const deliveryPrice = dhdPrice
    ? (form.deliveryType === "home" ? dhdPrice.home : dhdPrice.stopDesk)
    : null;
  const stopDeskAvailable = dhdPrice ? dhdPrice.stopDesk > 0 : true;

  const communes: string[] = form.wilaya ? (ALGERIAN_BALADIYAT[form.wilaya] ?? []) : [];

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (data) => {
        setOrderedId((data as { id: number }).id);
        setOrdered(true);
        setSelectedProduct(null);
        setForm(INITIAL_FORM);
      },
      onError: () => toast({ variant: "destructive", title: "فشل إرسال الطلبية، حاول مرة أخرى" }),
    },
  });

  const categories = [...new Set((products ?? []).map(p => p.category))];

  const handleOrder = () => {
    if (!selectedProduct) return;
    if (!form.firstName || !form.lastName || !form.phone || !form.wilaya || !form.commune || !form.address) {
      toast({ variant: "destructive", title: "الرجاء تعبئة جميع الحقول" });
      return;
    }
    if (form.deliveryType === "stop_desk" && !stopDeskAvailable) {
      toast({ variant: "destructive", title: "التوصيل للمكتب غير متاح لهذه الولاية" });
      return;
    }
    const qty = parseInt(form.quantity);
    if (isNaN(qty) || qty < selectedProduct.minOrderQty) {
      toast({ variant: "destructive", title: `الحد الأدنى للطلب ${selectedProduct.minOrderQty} قطعة` });
      return;
    }
    const deliveryLabel = form.deliveryType === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stop Desk)";
    const priceNote = deliveryPrice ? ` - ${deliveryPrice} د.ج` : "";
    const notes = `${deliveryLabel}${priceNote}`;

    createOrder.mutate({
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        wilaya: form.wilaya,
        address: `${form.commune} - ${form.address}`,
        productId: selectedProduct.id,
        quantity: qty,
        notes,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="text-xl font-black text-primary">الحاج لاز</span>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 h-9" />
          </div>
          <Link href="/track">
            <Button variant="outline" size="sm" className="gap-1 whitespace-nowrap">
              تتبع طلبيتي <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={category === "" ? "default" : "outline"} onClick={() => setCategory("")}>الكل</Button>
          {categories.map(c => (
            <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">لا توجد منتجات</h3>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(products ?? []).map(product => (
              <Card key={product.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedProduct(product)}>
                <div className="aspect-square bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2 space-y-1">
                  <h3 className="font-semibold text-xs leading-tight line-clamp-2">{product.name}</h3>
                  <p className="font-bold text-primary text-xs">{Number(product.price).toLocaleString("ar-DZ")} د.ج</p>
                  <p className="text-xs text-muted-foreground">الحد الأدنى: {product.minOrderQty} قطعة</p>
                  {product.stock === 0 && <p className="text-xs text-red-500 font-medium">نفد</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct && !ordered} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedProduct?.name}</span>
              <button onClick={() => setSelectedProduct(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">السعر للقطعة</span>
              <span className="font-bold text-xl text-primary">{selectedProduct && Number(selectedProduct.price).toLocaleString("ar-DZ")} د.ج</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "firstName", label: "الاسم الأول", type: "text" },
                { key: "lastName", label: "اسم العائلة", type: "text" },
                { key: "phone", label: "رقم الهاتف", type: "tel" },
                { key: "quantity", label: `الكمية (min: ${selectedProduct?.minOrderQty})`, type: "number" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type={f.type}
                    dir={f.type === "tel" ? "ltr" : "rtl"}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="h-10"
                    min={f.key === "quantity" ? selectedProduct?.minOrderQty : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Wilaya */}
            <div className="space-y-1">
              <Label className="text-xs">الولاية</Label>
              <select
                value={form.wilaya}
                onChange={e => setForm(p => ({ ...p, wilaya: e.target.value, commune: "" }))}
                className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
              >
                <option value="">اختر الولاية</option>
                {(ALGERIAN_WILAYAS ?? []).map((w: string) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            {/* Commune */}
            {form.wilaya && communes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">البلدية</Label>
                <select
                  value={form.commune}
                  onChange={e => setForm(p => ({ ...p, commune: e.target.value }))}
                  className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
                >
                  <option value="">اختر البلدية</option>
                  {communes.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-xs">العنوان التفصيلي</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="الحي، الشارع..." className="h-10" />
            </div>

            {/* Delivery Type */}
            {form.wilaya && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> نوع التوصيل
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {/* Home delivery */}
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, deliveryType: "home" }))}
                    className={`border rounded-xl p-3 text-right transition-all ${form.deliveryType === "home" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">توصيل للمنزل</span>
                    </div>
                    {dhdPrice && (
                      <p className="font-bold text-primary text-sm">{dhdPrice.home.toLocaleString("ar-DZ")} د.ج</p>
                    )}
                  </button>

                  {/* Stop desk */}
                  <button
                    type="button"
                    onClick={() => stopDeskAvailable && setForm(p => ({ ...p, deliveryType: "stop_desk" }))}
                    disabled={!stopDeskAvailable}
                    className={`border rounded-xl p-3 text-right transition-all ${!stopDeskAvailable ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed" : form.deliveryType === "stop_desk" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">مكتب Stop Desk</span>
                    </div>
                    {dhdPrice && (
                      <p className="font-bold text-primary text-sm">
                        {stopDeskAvailable ? `${dhdPrice.stopDesk.toLocaleString("ar-DZ")} د.ج` : "غير متاح"}
                      </p>
                    )}
                  </button>
                </div>

                {/* Delivery price summary */}
                {deliveryPrice !== null && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                    <span className="text-amber-800">تكلفة التوصيل</span>
                    <span className="font-bold text-amber-900">{deliveryPrice.toLocaleString("ar-DZ")} د.ج</span>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full h-12 gap-2 text-base font-bold" onClick={handleOrder} disabled={createOrder.isPending}>
              <ShoppingBag className="w-5 h-5" />
              {createOrder.isPending ? "جاري الإرسال..." : "أرسل الطلبية"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={ordered} onOpenChange={open => !open && setOrdered(false)}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <div className="py-4 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">تم استلام طلبيتك!</h2>
            <p className="text-muted-foreground">رقم طلبيتك هو <span className="font-bold text-foreground text-lg">#{orderedId}</span></p>
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              📞 سنتصل بك قريباً لتأكيد الطلبية، ثم يمكنك تتبعها بهذا الرقم
            </p>
            <div className="flex gap-2">
              <Link href={`/track?id=${orderedId}`} className="flex-1">
                <Button variant="outline" className="w-full gap-1" onClick={() => setOrdered(false)}>
                  تتبع الطلبية
                </Button>
              </Link>
              <Button className="flex-1" onClick={() => setOrdered(false)}>متابعة التسوق</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
