import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetProduct, useCreateOrder } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight, ShoppingBag, CheckCircle2, Home, Building2,
  MapPin, Phone, Package, ChevronRight, Truck, Tag,
} from "lucide-react";
import { ALGERIAN_WILAYAS, ALGERIAN_BALADIYAT, DHD_PRICES, DHD_OFFICES } from "@/lib/constants";

type DeliveryType = "home" | "stop_desk";

const STOP_DESK_WILAYAS = ALGERIAN_WILAYAS.filter(
  (w) => DHD_OFFICES[w] && DHD_PRICES[w] && DHD_PRICES[w].stopDesk > 0
);

const INITIAL_FORM = {
  firstName: "", lastName: "", phone: "",
  wilaya: "", commune: "", address: "",
  quantity: "", deliveryType: "" as DeliveryType | "",
  size: "",
};

export default function OrderPage() {
  const [, params] = useRoute("/order/:productId");
  const productId = parseInt(params?.productId || "0");
  const { toast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: product, isLoading, isError } = useGetProduct(productId, {
    query: { enabled: !!productId },
  });

  const dhdPrice = form.wilaya && form.deliveryType ? DHD_PRICES[form.wilaya] : null;
  const deliveryPrice = dhdPrice
    ? form.deliveryType === "home" ? dhdPrice.home : dhdPrice.stopDesk
    : null;
  const office = form.deliveryType === "stop_desk" && form.wilaya ? DHD_OFFICES[form.wilaya] : null;
  const communes: string[] = form.wilaya && form.deliveryType === "home" ? (ALGERIAN_BALADIYAT[form.wilaya] ?? []) : [];

  const qty = parseInt(form.quantity) || 0;
  const productTotal = product ? qty * Number(product.price) : 0;
  const grandTotal = productTotal + (deliveryPrice ?? 0);

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (data) => setOrderId((data as { id: number }).id),
      onError: () => toast({ variant: "destructive", title: "فشل إرسال الطلبية، حاول مرة أخرى" }),
    },
  });

  const handleSubmit = () => {
    if (!form.deliveryType) { toast({ variant: "destructive", title: "الرجاء اختيار نوع التوصيل" }); return; }
    if (!form.firstName || !form.lastName || !form.phone || !form.wilaya) { toast({ variant: "destructive", title: "الرجاء تعبئة جميع الحقول المطلوبة" }); return; }
    if (form.deliveryType === "home" && (!form.commune || !form.address)) { toast({ variant: "destructive", title: "الرجاء إدخال البلدية والعنوان" }); return; }
    if (!product || qty < product.minOrderQty) { toast({ variant: "destructive", title: `الحد الأدنى للطلب ${product?.minOrderQty ?? 1} قطعة` }); return; }

    const address = form.deliveryType === "home" ? `${form.commune} - ${form.address}` : `Stop Desk - ${form.wilaya}`;
    const notes = [
      form.deliveryType === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stop Desk)",
      form.size ? `المقاس: ${form.size}` : "",
    ].filter(Boolean).join(" | ");

    createOrder.mutate({
      data: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, wilaya: form.wilaya, address, productId, quantity: qty, deliveryPrice: deliveryPrice ?? 0, notes },
    });
  };

  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">المنتج غير موجود</h2>
          <Link href="/products"><Button>العودة للمنتجات</Button></Link>
        </div>
      </Layout>
    );
  }

  /* ── Success ─────────────────────────────────── */
  if (orderId !== null) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4" dir="rtl">
          <div className="w-full max-w-sm space-y-5 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">تم استلام طلبيتك!</h2>
              <p className="text-gray-500 mt-1">شكراً لثقتك في متجر الفخامة</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-5 px-6">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">رقم الطلبية</p>
              <p className="text-5xl font-black text-primary">#{orderId}</p>
              <p className="text-xs text-gray-400 mt-2">احتفظ بهذا الرقم للتتبع</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-right">
              <p className="text-sm font-bold text-amber-900">📞 سنتصل بك قريباً لتأكيد الطلبية</p>
              <p className="text-xs text-amber-700 mt-1">بعد التأكيد يمكنك تتبع طلبيتك برقم <strong>#{orderId}</strong></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/track?id=${orderId}`}><Button variant="outline" className="w-full h-11 font-semibold">تتبع الطلبية</Button></Link>
              <Link href="/products"><Button className="w-full h-11 font-semibold">تسوق أكثر</Button></Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── Form ────────────────────────────────────── */
  const step = !form.deliveryType ? 1 : (!form.firstName || !form.phone) ? 2 : 3;

  return (
    <Layout>
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <Link href={`/products/${productId}`}>
            <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors">
              <ArrowRight className="w-4 h-4" />
              العودة للمنتج
            </button>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-sm font-semibold text-gray-800">إتمام الطلب</span>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 justify-center" dir="ltr">
            {[
              { n: 1, label: "نوع التوصيل" },
              { n: 2, label: "معلوماتك" },
              { n: 3, label: "الولاية" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${step >= s.n ? "text-primary" : "text-gray-300"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > s.n ? "bg-primary text-white" : step === s.n ? "bg-primary/10 text-primary border-2 border-primary" : "bg-gray-100 text-gray-400"}`}>
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < arr.length - 1 && <div className={`w-8 h-px ${step > s.n ? "bg-primary" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-4xl" dir="rtl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* ── Form column ── */}
            <div className="lg:col-span-3 space-y-4">

              {/* STEP 1 — Delivery type */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-l from-primary/5 to-transparent px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</span>
                    <p className="font-bold text-gray-800">اختر نوع التوصيل</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { type: "home" as const, icon: Home, title: "للمنزل", sub: "ولاية + بلدية + عنوان" },
                    { type: "stop_desk" as const, icon: Building2, title: "Stop Desk", sub: "استلام من المكتب" },
                  ].map(({ type, icon: Icon, title, sub }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, deliveryType: type, wilaya: "", commune: "", address: "" }))}
                      className={`relative rounded-xl p-4 text-right transition-all border-2 ${form.deliveryType === type ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"}`}
                    >
                      {form.deliveryType === type && (
                        <span className="absolute top-2 left-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </span>
                      )}
                      <Icon className={`w-6 h-6 mb-2 ${form.deliveryType === type ? "text-primary" : "text-gray-400"}`} />
                      <p className={`font-bold text-sm ${form.deliveryType === type ? "text-primary" : "text-gray-700"}`}>{title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.deliveryType && (
                <>
                  {/* STEP 2 — Personal info */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-l from-primary/5 to-transparent px-5 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                        <p className="font-bold text-gray-800">معلوماتك الشخصية</p>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {[
                        { key: "firstName", label: "الاسم الأول", type: "text", placeholder: "الاسم" },
                        { key: "lastName", label: "اسم العائلة", type: "text", placeholder: "اللقب" },
                      ].map(f => (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-600">{f.label}</Label>
                          <Input
                            placeholder={f.placeholder}
                            value={(form as Record<string, string>)[f.key]}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                          />
                        </div>
                      ))}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600">رقم الهاتف</Label>
                        <Input
                          type="tel" dir="ltr" placeholder="05xx xx xx xx"
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600">الكمية <span className="text-gray-400 font-normal">(min: {product?.minOrderQty ?? 1})</span></Label>
                        <Input
                          type="number" min={product?.minOrderQty ?? 1}
                          value={form.quantity}
                          onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold text-gray-600">
                          المقاس <span className="text-gray-400 font-normal">(اختياري)</span>
                        </Label>
                        <Input
                          placeholder="مثال: XL، 42، M ..."
                          value={form.size}
                          onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                          className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3 — Location */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-l from-primary/5 to-transparent px-5 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</span>
                        <p className="font-bold text-gray-800">
                          {form.deliveryType === "home" ? "الولاية والبلدية" : "اختر الولاية"}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600">الولاية</Label>
                        <select
                          value={form.wilaya}
                          onChange={e => setForm(p => ({ ...p, wilaya: e.target.value, commune: "" }))}
                          className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        >
                          <option value="">اختر الولاية</option>
                          {(form.deliveryType === "stop_desk" ? STOP_DESK_WILAYAS : ALGERIAN_WILAYAS).map((w: string) => {
                            const price = DHD_PRICES[w];
                            const priceVal = form.deliveryType === "home" ? price?.home : price?.stopDesk;
                            return <option key={w} value={w}>{w}{priceVal ? ` — ${priceVal} د.ج` : ""}</option>;
                          })}
                        </select>
                      </div>

                      {form.deliveryType === "home" && form.wilaya && communes.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-600">البلدية</Label>
                          <select
                            value={form.commune}
                            onChange={e => setForm(p => ({ ...p, commune: e.target.value }))}
                            className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                          >
                            <option value="">اختر البلدية</option>
                            {communes.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}

                      {form.deliveryType === "home" && form.wilaya && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-600">العنوان التفصيلي</Label>
                          <Input
                            value={form.address}
                            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                            placeholder="الحي، الشارع، رقم المبنى..."
                            className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                          />
                        </div>
                      )}

                      {form.deliveryType === "stop_desk" && office && (
                        <div className="bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/20 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-primary" />
                            <p className="text-xs font-bold text-primary">عنوان مكتب الاستلام</p>
                          </div>
                          <div className="flex gap-2 items-start">
                            <MapPin className="w-4 h-4 text-primary/60 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700 leading-relaxed">{office.address}</p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Phone className="w-4 h-4 text-primary/60 flex-shrink-0" />
                            <p className="text-xs font-mono text-gray-700" dir="ltr">{office.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery cost pill */}
                  {deliveryPrice !== null && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <Truck className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-700 font-medium">
                          {form.deliveryType === "home" ? "تكلفة التوصيل للمنزل" : "تكلفة Stop Desk"}
                        </p>
                      </div>
                      <span className="font-black text-amber-800 text-lg">{deliveryPrice.toLocaleString("ar-DZ")} <span className="text-xs font-normal">د.ج</span></span>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    className="w-full h-14 text-base font-black rounded-xl shadow-lg shadow-primary/25 gap-2"
                    onClick={handleSubmit}
                    disabled={createOrder.isPending || isLoading}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {createOrder.isPending ? "جاري الإرسال..." : "تأكيد الطلبية"}
                  </Button>
                </>
              )}
            </div>

            {/* ── Summary sidebar ── */}
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-primary px-4 py-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <p className="text-white font-bold text-sm">ملخص الطلبية</p>
                </div>
                <div className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : product ? (
                    <>
                      {/* Product card */}
                      <div className="flex gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
                          <p className="text-primary font-bold mt-1">{Number(product.price).toLocaleString("ar-DZ")} <span className="text-xs text-gray-400 font-normal">د.ج / قطعة</span></p>
                        </div>
                      </div>

                      {/* Pricing breakdown */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center text-gray-500">
                          <span>سعر الوحدة</span>
                          <span className="font-semibold text-gray-800">{Number(product.price).toLocaleString("ar-DZ")} د.ج</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500">
                          <span>الكمية</span>
                          <span className="font-semibold text-gray-800">{qty || "—"} قطعة</span>
                        </div>
                        {qty > 0 && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span>مجموع المنتج</span>
                            <span className="font-semibold text-gray-800">{productTotal.toLocaleString("ar-DZ")} د.ج</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-gray-500">
                          <span>التوصيل</span>
                          <span className={`font-semibold ${deliveryPrice !== null ? "text-amber-600" : "text-gray-400"}`}>
                            {deliveryPrice !== null ? `${deliveryPrice.toLocaleString("ar-DZ")} د.ج` : "اختر الولاية"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">المجموع الكلي</span>
                          <div className="text-left">
                            {deliveryPrice !== null && qty > 0 ? (
                              <p className="font-black text-2xl text-primary">{grandTotal.toLocaleString("ar-DZ")} <span className="text-sm font-normal text-gray-400">د.ج</span></p>
                            ) : (
                              <p className="text-gray-400 text-sm">تحدد لاحقاً</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {form.size && (
                        <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">المقاس: <strong className="text-gray-700">{form.size}</strong></span>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
