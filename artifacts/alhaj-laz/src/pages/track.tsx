import { useState } from "react";
import { useTrackOrder } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const STATUS_INFO: Record<string, { label: string; icon: typeof Package; color: string; desc: string }> = {
  pending:          { label: "قيد الانتظار",     icon: Clock,        color: "text-gray-500",   desc: "تم استلام طلبيتك وهي قيد المراجعة" },
  confirmed:        { label: "مؤكدة",             icon: CheckCircle2, color: "text-blue-500",   desc: "تم تأكيد طلبيتك وسيتم شحنها قريباً" },
  shipped:          { label: "في انتظار الشحن",   icon: Package,      color: "text-indigo-500", desc: "طلبيتك جاهزة وفي انتظار استلام شركة التوصيل" },
  out_for_delivery: { label: "قيد التوصيل",       icon: Truck,        color: "text-purple-500", desc: "طلبيتك خرجت للتوصيل وستصل قريباً" },
  pending_delivery: { label: "معلّقة",             icon: Clock,        color: "text-amber-500",  desc: "محاولة التوصيل معلّقة — سيتم إعادة المحاولة" },
  delivered:        { label: "تم التسليم",         icon: CheckCircle2, color: "text-green-500",  desc: "تم تسليم طلبيتك بنجاح" },
  cash_ready:       { label: "الدفع جاهز",        icon: CheckCircle2, color: "text-emerald-500", desc: "تم التسليم والمبلغ جاهز للاسترداد" },
  cancelled:        { label: "ملغاة",              icon: XCircle,      color: "text-red-500",    desc: "تم إلغاء هذه الطلبية" },
};

const STATUS_STEPS = ["pending","confirmed","shipped","out_for_delivery","delivered"];

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [searchId, setSearchId] = useState<number | null>(null);

  const { data, isLoading, isError } = useTrackOrder(
    searchId ?? 0,
    { query: { enabled: searchId !== null } }
  );

  const handleSearch = () => {
    const id = parseInt(orderId.trim());
    if (!isNaN(id) && id > 0) setSearchId(id);
  };

  const info = data ? STATUS_INFO[data.status] : null;
  const StatusIcon = info?.icon ?? Package;
  const currentStep = data ? STATUS_STEPS.indexOf(data.status) : -1;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-black text-primary cursor-pointer">الحاج لاز</span>
          </Link>
          <Link href="/products">
            <Button variant="ghost" size="sm" className="gap-1">
              تسوق الآن <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 pt-12 pb-16">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black">تتبع طلبيتك</h1>
            <p className="text-muted-foreground mt-2">أدخل رقم طلبيتك لمعرفة حالتها</p>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="رقم الطلبية (مثال: 42)"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="h-12 text-center text-lg"
              dir="ltr"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="h-12 px-6 gap-2">
              <Search className="w-4 h-4" />
              بحث
            </Button>
          </div>

          {isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                جاري البحث...
              </CardContent>
            </Card>
          )}

          {isError && searchId && (
            <Card className="border-destructive/50">
              <CardContent className="py-10 text-center">
                <XCircle className="w-12 h-12 text-destructive/60 mx-auto mb-3" />
                <p className="font-medium">لم يتم العثور على الطلبية رقم {searchId}</p>
                <p className="text-sm text-muted-foreground mt-1">تأكد من الرقم وحاول مرة أخرى</p>
              </CardContent>
            </Card>
          )}

          {data && info && (
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>طلبية رقم #{data.id}</span>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${info.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {info.label}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{info.desc}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">المنتج</p>
                    <p className="font-medium">{data.productName}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">الولاية</p>
                    <p className="font-medium">{data.wilaya ?? "—"}</p>
                  </div>
                  {data.trackingNumber && (
                    <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">رقم التتبع DHD</p>
                      <p className="font-mono font-bold text-primary" dir="ltr">{data.trackingNumber}</p>
                      <a
                        href={`https://dhd-dz.com/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        تتبع طردك مباشرةً على موقع DHD
                      </a>
                    </div>
                  )}
                  <div className="col-span-2 bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">تاريخ الطلبية</p>
                    <p className="font-medium" dir="ltr">{new Date(data.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                </div>

                {!["cancelled","cash_ready"].includes(data.status) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">مراحل الطلبية</p>
                    <div className="flex items-center gap-0">
                      {STATUS_STEPS.map((s, i) => {
                        const done = currentStep >= i;
                        const current = currentStep === i;
                        return (
                          <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${current ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                              {done ? "✓" : i + 1}
                            </div>
                            {i < STATUS_STEPS.length - 1 && (
                              <div className={`flex-1 h-1 ${done && currentStep > i ? "bg-primary" : "bg-muted"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
