import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetProduct, useCreateOrder } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ShoppingBag, CheckCircle2, Home, Building2, MapPin, Phone, Package } from "lucide-react";
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
    if (!form.deliveryType) {
      toast({ variant: "destructive", title: "الرجاء اختيار نوع التوصيل" });
      return;
    }
    if (!form.firstName || !form.lastName || !form.phone || !form.wilaya) {
      toast({ variant: "destructive", title: "الرجاء تعبئة جميع الحقول المطلوبة" });
      return;
    }
    if (form.deliveryType === "home" && (!form.commune || !form.address)) {
      toast({ variant: "destructive", title: "الرجاء إدخال البلدية والعنوان" });
      return;
    }
    if (!product || qty < product.minOrderQty) {
      toast({ variant: "destructive", title: `الحد الأدنى للطلب ${product?.minOrderQty ?? 1} قطعة` });
      return;
    }

    const address = form.deliveryType === "home"
      ? `${form.commune} - ${form.address}`
      : `Stop Desk - ${form.wilaya}`;
    const notes = [
      form.deliveryType === "home" ? "توصيل للمنزل" : "توصيل للمكتب (Stop Desk)",
      form.size ? `المقاس: ${form.size}` : "",
    ].filter(Boolean).join(" | ");

    createOrder.mutate({
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        wilaya: form.wilaya,
        address,
        productId,
        quantity: qty,
        deliveryPrice: deliveryPrice ?? 0,
        notes,
      },
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

  /* ── Success screen ─────────────────────────────────────────── */
  if (orderId !== null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-md text-center space-y-5" dir="rtl">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          <h2 className="text-3xl font-black">تم استلام طلبيتك!</h2>

          <div className="bg-primary/10 border border-primary/30 rounded-2xl py-4 px-6">
            <p className="text-sm text-muted-foreground mb-1">رقم طلبيتك</p>
            <p className="text-4xl font-black text-primary">#{orderId}</p>
            <p className="text-xs text-muted-foreground mt-1">احتفظ بهذا الرقم</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-right space-y-1">
            <p className="text-sm font-semibold text-amber-900">📞 سنتصل بك قريباً لتأكيد الطلبية</p>
            <p className="text-xs text-amber-700">
              بعد التأكيد يمكنك تتبع طلبيتك برقم <span className="font-bold">#{orderId}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Link href={`/track?id=${orderId}`} className="flex-1">
              <Button variant="outline" className="w-full">تتبع الطلبية</Button>
            </Link>
            <Link href="/products" className="flex-1">
              <Button className="w-full">متابعة التسوق</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── Order form ─────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="bg-muted/30 py-3 border-b">
        <div className="container mx-auto px-4">
          <Link href={`/products/${productId}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              <ArrowRight className="w-4 h-4" />
              العودة للمنتج
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
        <h1 className="text-2xl font-black mb-6">إتمام الطلب</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── Left: form ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* STEP 1 — Delivery type */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-bold">1. اختر نوع التوصيل</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, deliveryType: "home", wilaya: "", commune: "", address: "" }))}
                    className={`border rounded-xl p-4 text-right transition-all space-y-1 ${form.deliveryType === "home" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-primary" />
                      <span className="font-bold">للمنزل</span>
                    </div>
                    <p className="text-xs text-muted-foreground">ولاية + بلدية + عنوان</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, deliveryType: "stop_desk", wilaya: "", commune: "", address: "" }))}
                    className={`border rounded-xl p-4 text-right transition-all space-y-1 ${form.deliveryType === "stop_desk" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-bold">Stop Desk</span>
                    </div>
                    <p className="text-xs text-muted-foreground">استلام من المكتب</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {form.deliveryType && (
              <>
                {/* STEP 2 — Personal info */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-sm font-bold">2. معلوماتك الشخصية</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "firstName", label: "الاسم الأول" },
                        { key: "lastName", label: "اسم العائلة" },
                      ].map(f => (
                        <div key={f.key} className="space-y-1">
                          <Label className="text-xs">{f.label}</Label>
                          <Input
                            value={(form as Record<string, string>)[f.key]}
                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="h-10"
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label className="text-xs">رقم الهاتف</Label>
                        <Input
                          type="tel"
                          dir="ltr"
                          placeholder="05xx xx xx xx"
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الكمية (min: {product?.minOrderQty ?? 1})</Label>
                        <Input
                          type="number"
                          min={product?.minOrderQty ?? 1}
                          value={form.quantity}
                          onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">المقاس <span className="text-muted-foreground">(اختياري)</span></Label>
                        <Input
                          value={form.size}
                          onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
                          placeholder="مثال: XL، 42، M ..."
                          className="h-10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 3 — Wilaya / address */}
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm font-bold">
                      3. {form.deliveryType === "home" ? "الولاية والبلدية" : "اختر الولاية"}
                    </p>

                    <select
                      value={form.wilaya}
                      onChange={e => setForm(p => ({ ...p, wilaya: e.target.value, commune: "" }))}
                      className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
                    >
                      <option value="">اختر الولاية</option>
                      {(form.deliveryType === "stop_desk" ? STOP_DESK_WILAYAS : ALGERIAN_WILAYAS).map((w: string) => {
                        const price = DHD_PRICES[w];
                        const priceVal = form.deliveryType === "home" ? price?.home : price?.stopDesk;
                        return (
                          <option key={w} value={w}>
                            {w}{priceVal ? ` — ${priceVal} د.ج` : ""}
                          </option>
                        );
                      })}
                    </select>

                    {/* Commune — home only */}
                    {form.deliveryType === "home" && form.wilaya && communes.length > 0 && (
                      <select
                        value={form.commune}
                        onChange={e => setForm(p => ({ ...p, commune: e.target.value }))}
                        className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
                      >
                        <option value="">اختر البلدية</option>
                        {communes.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}

                    {/* Address — home only */}
                    {form.deliveryType === "home" && form.wilaya && (
                      <Input
                        value={form.address}
                        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="العنوان التفصيلي (الحي، الشارع...)"
                        className="h-10"
                      />
                    )}

                    {/* Office card — stop desk only */}
                    {form.deliveryType === "stop_desk" && office && (
                      <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-primary uppercase tracking-wide">عنوان المكتب</p>
                        <div className="flex gap-2 items-start">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed">{office.address}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                          <p className="text-xs font-mono" dir="ltr">{office.phone}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery cost banner */}
                {deliveryPrice !== null && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-sm text-amber-800">
                      {form.deliveryType === "home" ? "تكلفة التوصيل للمنزل" : "تكلفة Stop Desk"}
                    </span>
                    <span className="font-bold text-amber-900">{deliveryPrice.toLocaleString("ar-DZ")} د.ج</span>
                  </div>
                )}

                <Button
                  className="w-full h-14 text-lg font-bold gap-2"
                  onClick={handleSubmit}
                  disabled={createOrder.isPending || isLoading}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {createOrder.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
                </Button>
              </>
            )}
          </div>

          {/* ── Right: order summary ──────────────────────── */}
          <div className="sticky top-24">
            <Card className="border-primary/20 bg-primary/5 overflow-hidden">
              <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2 font-bold">
                <ShoppingBag className="w-4 h-4" />
                ملخص الطلبية
              </div>
              <CardContent className="p-4 space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ) : product ? (
                  <>
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-background border shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{Number(product.price).toLocaleString("ar-DZ")} د.ج / قطعة</p>
                      </div>
                    </div>

                    <div className="border-t border-primary/10 pt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">سعر الوحدة</span>
                        <span className="font-medium">{Number(product.price).toLocaleString("ar-DZ")} د.ج</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الكمية</span>
                        <span className="font-medium">{qty || "—"} قطعة</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">التوصيل</span>
                        <span className="font-medium">
                          {deliveryPrice !== null ? `${deliveryPrice.toLocaleString("ar-DZ")} د.ج` : "تحدد لاحقاً"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-primary/20 pt-3 flex justify-between items-center">
                      <span className="font-bold">المجموع</span>
                      <span className="font-black text-xl text-primary">
                        {deliveryPrice !== null && qty > 0
                          ? `${grandTotal.toLocaleString("ar-DZ")} د.ج`
                          : qty > 0 ? `${productTotal.toLocaleString("ar-DZ")} د.ج` : "—"}
                      </span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
