import { useState } from "react";
import { useListProducts, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag, Search, Package, CheckCircle2, X,
  Home, Building2, Phone, MapPin, Truck, Tag, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { ALGERIAN_WILAYAS, ALGERIAN_BALADIYAT, DHD_PRICES, DHD_OFFICES } from "@/lib/constants";
import type { Product } from "@workspace/api-client-react";

type DeliveryType = "home" | "stop_desk";

const INITIAL_FORM = {
  firstName: "", lastName: "", phone: "",
  wilaya: "", commune: "", address: "",
  quantity: "1", deliveryType: "" as DeliveryType | "",
  size: "",
};

const STOP_DESK_WILAYAS = ALGERIAN_WILAYAS.filter(
  (w) => DHD_OFFICES[w] && DHD_PRICES[w] && DHD_PRICES[w].stopDesk > 0
);

export default function Store() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ordered, setOrdered] = useState(false);
  const [orderedId, setOrderedId] = useState<number | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: products, isLoading } = useListProducts({ category: category || undefined, search: search || undefined });

  const dhdPrice = form.wilaya && form.deliveryType ? DHD_PRICES[form.wilaya] : null;
  const deliveryPrice = dhdPrice
    ? (form.deliveryType === "home" ? dhdPrice.home : dhdPrice.stopDesk)
    : null;
  const office = form.deliveryType === "stop_desk" && form.wilaya ? DHD_OFFICES[form.wilaya] : null;
  const communes: string[] = form.wilaya && form.deliveryType === "home" ? (ALGERIAN_BALADIYAT[form.wilaya] ?? []) : [];

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
    if (!form.deliveryType) { toast({ variant: "destructive", title: "الرجاء اختيار نوع التوصيل" }); return; }
    if (!form.firstName || !form.lastName || !form.phone || !form.wilaya) { toast({ variant: "destructive", title: "الرجاء تعبئة جميع الحقول" }); return; }
    if (form.deliveryType === "home" && (!form.commune || !form.address)) { toast({ variant: "destructive", title: "الرجاء تعبئة البلدية والعنوان" }); return; }
    const qty = parseInt(form.quantity);
    if (isNaN(qty) || qty < selectedProduct.minOrderQty) { toast({ variant: "destructive", title: `الحد الأدنى للطلب ${selectedProduct.minOrderQty} قطعة` }); return; }

    const deliveryLabel = [
      form.deliveryType === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stop Desk)",
      form.size ? `المقاس: ${form.size}` : "",
    ].filter(Boolean).join(" | ");
    const address = form.deliveryType === "home" ? `${form.commune} - ${form.address}` : `Stop Desk - ${form.wilaya}`;

    createOrder.mutate({
      data: {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        wilaya: form.wilaya, address, productId: selectedProduct.id,
        quantity: qty, deliveryPrice: deliveryPrice ?? 0, notes: deliveryLabel,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <span className="text-xl font-black text-primary flex-shrink-0">الحاج لاز</span>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10 h-9 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>
          <Link href="/track">
            <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap rounded-xl border-gray-200">
              تتبع طلبيتي <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory("")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${category === "" ? "bg-primary text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40"}`}
          >الكل</button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${category === c ? "bg-primary text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40"}`}
            >{c}</button>
          ))}
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-gray-200">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(products ?? []).map(product => (
              <div
                key={product.id}
                onClick={() => { setSelectedProduct(product); setForm(p => ({ ...p, quantity: String(product.minOrderQty) })); }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-200" />
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">نفد من المخزون</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
                    min {product.minOrderQty}
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight line-clamp-2">{product.name}</h3>
                  <p className="font-black text-primary">{Number(product.price).toLocaleString("ar-DZ")} <span className="text-xs font-normal text-gray-400">د.ج</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct && !ordered} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl" dir="rtl">
          {/* Dialog header with product info */}
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 border-b p-4">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedProduct?.imageUrl && (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" />
                  )}
                  <div>
                    <DialogTitle className="text-base font-black text-gray-900 leading-tight">{selectedProduct?.name}</DialogTitle>
                    <p className="text-primary font-bold text-sm mt-0.5">{selectedProduct && Number(selectedProduct.price).toLocaleString("ar-DZ")} د.ج<span className="text-gray-400 text-xs font-normal"> / قطعة</span></p>
                  </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-700 transition-colors p-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-4">
            {/* STEP 1 — Delivery type */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">1 — نوع التوصيل</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "home" as const, icon: Home, title: "للمنزل", sub: "ولاية + بلدية + عنوان" },
                  { type: "stop_desk" as const, icon: Building2, title: "Stop Desk", sub: "استلام من المكتب" },
                ].map(({ type, icon: Icon, title, sub }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, deliveryType: type, wilaya: "", commune: "", address: "" }))}
                    className={`relative border-2 rounded-xl p-3 text-right transition-all ${form.deliveryType === type ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                  >
                    {form.deliveryType === type && (
                      <span className="absolute top-1.5 left-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    )}
                    <Icon className={`w-5 h-5 mb-1.5 ${form.deliveryType === type ? "text-primary" : "text-gray-400"}`} />
                    <p className={`font-bold text-sm ${form.deliveryType === type ? "text-primary" : "text-gray-700"}`}>{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.deliveryType && (
              <>
                {/* STEP 2 — Personal info */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">2 — معلوماتك الشخصية</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "firstName", label: "الاسم الأول", type: "text" },
                      { key: "lastName", label: "اسم العائلة", type: "text" },
                      { key: "phone", label: "رقم الهاتف", type: "tel" },
                      { key: "quantity", label: `الكمية (min: ${selectedProduct?.minOrderQty})`, type: "number" },
                    ].map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs text-gray-600">{f.label}</Label>
                        <Input
                          type={f.type}
                          dir={f.type === "tel" ? "ltr" : "rtl"}
                          value={(form as Record<string, string>)[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="h-10 bg-gray-50 border-gray-200 rounded-xl"
                          min={f.key === "quantity" ? selectedProduct?.minOrderQty : undefined}
                        />
                      </div>
                    ))}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-gray-600">المقاس <span className="text-gray-400">(اختياري)</span></Label>
                      <Input
                        value={form.size}
                        onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                        placeholder="XL، 42، M ..."
                        className="h-10 bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3 — Wilaya */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    3 — {form.deliveryType === "home" ? "الولاية والبلدية" : "اختر الولاية"}
                  </p>

                  <select
                    value={form.wilaya}
                    onChange={e => setForm(p => ({ ...p, wilaya: e.target.value, commune: "" }))}
                    className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">اختر الولاية</option>
                    {(form.deliveryType === "stop_desk" ? STOP_DESK_WILAYAS : ALGERIAN_WILAYAS).map((w: string) => {
                      const price = DHD_PRICES[w];
                      const priceVal = form.deliveryType === "home" ? price?.home : price?.stopDesk;
                      return <option key={w} value={w}>{w}{priceVal ? ` — ${priceVal} د.ج` : ""}</option>;
                    })}
                  </select>

                  {form.deliveryType === "home" && form.wilaya && communes.length > 0 && (
                    <select
                      value={form.commune}
                      onChange={e => setForm(p => ({ ...p, commune: e.target.value }))}
                      className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">اختر البلدية</option>
                      {communes.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  {form.deliveryType === "home" && form.wilaya && (
                    <Input
                      value={form.address}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="الحي، الشارع..."
                      className="h-10 bg-gray-50 border-gray-200 rounded-xl"
                    />
                  )}

                  {form.deliveryType === "stop_desk" && office && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-primary flex items-center gap-1"><Building2 className="w-3 h-3" /> عنوان المكتب</p>
                      <div className="flex gap-2 items-start">
                        <MapPin className="w-3.5 h-3.5 text-primary/60 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-700 leading-relaxed">{office.address}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Phone className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                        <p className="text-xs font-mono text-gray-700" dir="ltr">{office.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Size display */}
                {form.size && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">المقاس: <strong className="text-gray-700">{form.size}</strong></span>
                  </div>
                )}

                {/* Delivery cost */}
                {deliveryPrice !== null && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-700 flex-1 font-medium">
                      {form.deliveryType === "home" ? "تكلفة التوصيل للمنزل" : "تكلفة Stop Desk"}
                    </span>
                    <span className="font-black text-amber-800">{deliveryPrice.toLocaleString("ar-DZ")} <span className="text-xs font-normal">د.ج</span></span>
                  </div>
                )}

                <Button
                  className="w-full h-12 font-black text-base rounded-xl shadow-md shadow-primary/20 gap-2"
                  onClick={handleOrder}
                  disabled={createOrder.isPending}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {createOrder.isPending ? "جاري الإرسال..." : "أرسل الطلبية"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={ordered} onOpenChange={open => !open && setOrdered(false)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden" dir="rtl">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">تم استلام طلبيتك!</h2>
              <p className="text-gray-500 text-sm mt-1">شكراً لثقتك في الحاج لاز</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-4 px-5">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">رقم الطلبية</p>
              <p className="text-4xl font-black text-primary">#{orderedId}</p>
              <p className="text-xs text-gray-400 mt-1">احتفظ بهذا الرقم</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-right">
              <p className="text-sm font-bold text-amber-900">📞 سنتصل بك قريباً لتأكيد الطلبية</p>
              <p className="text-xs text-amber-700 mt-0.5">
                بعد التأكيد يمكنك تتبع طلبيتك برقم <strong>#{orderedId}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href={`/track?id=${orderedId}`} className="flex-1">
                <Button variant="outline" className="w-full h-10 font-semibold rounded-xl" onClick={() => setOrdered(false)}>
                  تتبع الطلبية
                </Button>
              </Link>
              <Button className="w-full h-10 font-semibold rounded-xl" onClick={() => setOrdered(false)}>
                متابعة التسوق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
