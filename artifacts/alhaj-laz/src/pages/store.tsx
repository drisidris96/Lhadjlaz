import { useState } from "react";
import { useListProducts, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag, Search, Package, CheckCircle2, X,
  Home, Building2, Phone, MapPin, Truck, Tag,
  ArrowRight, LayoutGrid, PackageSearch, Lock,
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
  const categories = [...new Set((products ?? []).map(p => p.category))];

  const qty = parseInt(form.quantity) || 0;
  const productTotal = selectedProduct ? qty * Number(selectedProduct.price) : 0;
  const grandTotal = productTotal + (deliveryPrice ?? 0);

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

  const handleOrder = () => {
    if (!selectedProduct) return;
    if (!form.deliveryType) { toast({ variant: "destructive", title: "الرجاء اختيار نوع التوصيل" }); return; }
    if (!form.firstName || !form.lastName || !form.phone || !form.wilaya) { toast({ variant: "destructive", title: "الرجاء تعبئة جميع الحقول" }); return; }
    if (form.deliveryType === "home" && (!form.commune || !form.address)) { toast({ variant: "destructive", title: "الرجاء تعبئة البلدية والعنوان" }); return; }
    const q = parseInt(form.quantity);
    if (isNaN(q) || q < selectedProduct.minOrderQty) { toast({ variant: "destructive", title: `الحد الأدنى للطلب ${selectedProduct.minOrderQty} قطعة` }); return; }

    const notes = [
      form.deliveryType === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stop Desk)",
      form.size ? `المقاس: ${form.size}` : "",
    ].filter(Boolean).join(" | ");
    const address = form.deliveryType === "home"
      ? `${form.commune} - ${form.address}`
      : `Stop Desk - ${form.wilaya}`;

    createOrder.mutate({
      data: {
        firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        wilaya: form.wilaya, address, productId: selectedProduct.id,
        quantity: q, deliveryPrice: deliveryPrice ?? 0, notes,
      },
    });
  };

  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setForm(prev => ({ ...prev, quantity: String(p.minOrderQty) }));
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Navbar ────────────────────────────────────────── */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Right — logo + name */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <span className="text-xl font-black text-primary tracking-wide">الحاج لاز</span>
              <img src="/logo.png" alt="الحاج لاز" className="w-12 h-12 rounded-full object-cover shadow" />
            </div>
          </Link>

          {/* Center — nav links */}
          <nav className="flex items-center gap-1">
            <Link href="/">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">الرئيسية</span>
              </button>
            </Link>
            <Link href="/store">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-primary text-white shadow-sm">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>المنتجات</span>
              </button>
            </Link>
            <Link href="/track">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
                <PackageSearch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تتبع الطلبات</span>
              </button>
            </Link>
          </nav>

          {/* Left — admin login */}
          <Link href="/admin/login">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors border border-gray-200 hover:border-primary/40 rounded-full px-3 py-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الإدارة</span>
            </button>
          </Link>
        </div>
      </header>

      {/* ── Hero Banner ───────────────────────────────────── */}
      <div className="bg-gradient-to-l from-purple-900 via-primary to-violet-600 text-white">
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-10 h-11 bg-white border-0 rounded-xl shadow-lg text-gray-800 placeholder:text-gray-400 focus-visible:ring-0"
              />
            </div>
            <div className="text-right">
              <p className="text-white/80 text-xs">المورد الأول لتجار الملابس في الجزائر 🇩🇿</p>
              <h1 className="text-xl font-black leading-tight mt-0.5">اطلب بالجملة ونوصل لكل الولايات</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category chips ────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {["", ...categories].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${category === c
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c === "" ? "🛍 الكل" : c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product grid ──────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-3 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-[4/5] bg-gray-100 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-xl animate-pulse mt-2" />
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
          <div className="grid grid-cols-2 gap-3">
            {(products ?? []).map(product => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer"
                onClick={() => openProduct(product)}
              >
                {/* Image */}
                <div className="aspect-[4/5] relative overflow-hidden bg-gray-50">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-200" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <span className="bg-primary text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                      {Number(product.price).toLocaleString("ar-DZ")} د.ج
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-100">
                      min {product.minOrderQty}
                    </span>
                  </div>

                  {/* Out of stock overlay */}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-white text-gray-800 text-xs font-black px-3 py-1.5 rounded-full">نفد المخزون</span>
                    </div>
                  )}

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-bold text-sm text-gray-800 leading-snug line-clamp-2">{product.name}</h3>
                  <button
                    className="w-full bg-primary hover:bg-primary/90 text-white text-sm font-black py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-primary/30"
                    onClick={e => { e.stopPropagation(); openProduct(product); }}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    اطلب الآن
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Order Dialog ──────────────────────────────────── */}
      <Dialog open={!!selectedProduct && !ordered} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl" dir="rtl">

          {/* Product header */}
          <div className="relative">
            {selectedProduct?.imageUrl ? (
              <div className="h-36 overflow-hidden">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
            ) : (
              <div className="h-24 bg-gradient-to-l from-yellow-600 to-primary" />
            )}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 left-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 right-4">
              <h2 className="text-white font-black text-lg leading-tight line-clamp-1">{selectedProduct?.name}</h2>
              <p className="text-primary font-black text-xl mt-0.5">
                {selectedProduct && Number(selectedProduct.price).toLocaleString("ar-DZ")}
                <span className="text-white/70 text-sm font-normal"> د.ج / قطعة</span>
              </p>
            </div>
          </div>

          <div className="p-4 space-y-5">

            {/* STEP 1 — Delivery type */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">1 — نوع التوصيل</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "home" as const, icon: Home, title: "للمنزل", sub: "ولاية + بلدية + عنوان" },
                  { type: "stop_desk" as const, icon: Building2, title: "Stop Desk", sub: "استلام من المكتب" },
                ].map(({ type, icon: Icon, title, sub }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, deliveryType: type, wilaya: "", commune: "", address: "" }))}
                    className={`relative border-2 rounded-xl p-3.5 text-right transition-all ${form.deliveryType === type
                      ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                  >
                    {form.deliveryType === type && (
                      <span className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">✓</span>
                    )}
                    <Icon className={`w-6 h-6 mb-2 ${form.deliveryType === type ? "text-primary" : "text-gray-400"}`} />
                    <p className={`font-black text-sm ${form.deliveryType === type ? "text-primary" : "text-gray-700"}`}>{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.deliveryType && (
              <>
                {/* STEP 2 — Personal info */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">2 — معلوماتك الشخصية</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "firstName", label: "الاسم الأول", type: "text", placeholder: "الاسم" },
                      { key: "lastName", label: "اسم العائلة", type: "text", placeholder: "اللقب" },
                      { key: "phone", label: "رقم الهاتف", type: "tel", placeholder: "05xx xx xx xx" },
                      { key: "quantity", label: `الكمية (min: ${selectedProduct?.minOrderQty})`, type: "number", placeholder: "" },
                    ].map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500">{f.label}</Label>
                        <Input
                          type={f.type}
                          dir={f.type === "tel" ? "ltr" : "rtl"}
                          placeholder={f.placeholder}
                          value={(form as Record<string, string>)[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="h-10 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary/30"
                          min={f.key === "quantity" ? selectedProduct?.minOrderQty : undefined}
                        />
                      </div>
                    ))}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-semibold text-gray-500">المقاس <span className="text-gray-300 font-normal">(اختياري)</span></Label>
                      <Input
                        placeholder="مثال: XL، 42، M ..."
                        value={form.size}
                        onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                        className="h-10 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3 — Wilaya */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    3 — {form.deliveryType === "home" ? "الولاية والبلدية" : "اختر الولاية"}
                  </p>
                  <div className="space-y-2">
                    <select
                      value={form.wilaya}
                      onChange={e => setForm(p => ({ ...p, wilaya: e.target.value, commune: "" }))}
                      className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">اختر الولاية</option>
                      {(form.deliveryType === "stop_desk" ? STOP_DESK_WILAYAS : ALGERIAN_WILAYAS).map((w: string) => {
                        const p = DHD_PRICES[w];
                        const v = form.deliveryType === "home" ? p?.home : p?.stopDesk;
                        return <option key={w} value={w}>{w}{v ? ` — ${v} د.ج` : ""}</option>;
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
                        placeholder="الحي، الشارع، رقم المبنى..."
                        className="h-10 bg-gray-50 border-gray-200 rounded-xl"
                      />
                    )}

                    {form.deliveryType === "stop_desk" && office && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-black text-primary flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" /> عنوان مكتب الاستلام
                        </p>
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
                </div>

                {/* Price summary card */}
                {(deliveryPrice !== null || qty > 0) && (
                  <div className="bg-gray-900 rounded-2xl p-4 text-white space-y-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">ملخص السعر</p>
                    {qty > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{qty} قطعة × {selectedProduct && Number(selectedProduct.price).toLocaleString("ar-DZ")} د.ج</span>
                        <span className="font-bold">{productTotal.toLocaleString("ar-DZ")} د.ج</span>
                      </div>
                    )}
                    {deliveryPrice !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> التوصيل</span>
                        <span className="font-bold text-amber-400">{deliveryPrice.toLocaleString("ar-DZ")} د.ج</span>
                      </div>
                    )}
                    {deliveryPrice !== null && qty > 0 && (
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="font-bold">المجموع</span>
                        <span className="font-black text-xl text-primary">{grandTotal.toLocaleString("ar-DZ")} د.ج</span>
                      </div>
                    )}
                    {form.size && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <Tag className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">المقاس: <span className="text-white font-semibold">{form.size}</span></span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full h-13 py-3.5 font-black text-base rounded-xl shadow-lg shadow-primary/30 gap-2"
                  onClick={handleOrder}
                  disabled={createOrder.isPending}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {createOrder.isPending ? "جاري الإرسال..." : "تأكيد الطلبية"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Success Dialog ────────────────────────────────── */}
      <Dialog open={ordered} onOpenChange={open => !open && setOrdered(false)}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-0" dir="rtl">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">تم استلام طلبيتك!</h2>
            <p className="text-white/70 text-sm mt-1">شكراً لثقتك في الحاج لاز</p>
          </div>

          <div className="p-5 space-y-4 bg-white">
            <div className="bg-gray-50 rounded-2xl border border-gray-100 py-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">رقم الطلبية</p>
              <p className="text-5xl font-black text-primary">#{orderedId}</p>
              <p className="text-xs text-gray-400 mt-1">احتفظ بهذا الرقم للتتبع</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-right">
              <p className="text-sm font-bold text-amber-900">📞 سنتصل بك قريباً لتأكيد الطلبية</p>
              <p className="text-xs text-amber-700 mt-0.5">
                بعد التأكيد يمكنك تتبع طلبيتك برقم <strong>#{orderedId}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href={`/track?id=${orderedId}`}>
                <Button variant="outline" className="w-full h-11 font-bold rounded-xl border-gray-200" onClick={() => setOrdered(false)}>
                  تتبع الطلبية
                </Button>
              </Link>
              <Button className="w-full h-11 font-bold rounded-xl" onClick={() => setOrdered(false)}>
                تسوق أكثر
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
