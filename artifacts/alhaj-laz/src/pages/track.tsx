import { useState, useEffect } from "react";
import { useTrackOrder } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, ArrowRight, Loader2, MapPin, CalendarDays, Hourglass } from "lucide-react";
import { Link, useSearch } from "wouter";

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

interface DhdEvent {
  date?: string;
  datetime?: string;
  created_at?: string;
  status?: string;
  statut?: string;
  description?: string;
  message?: string;
  lieu?: string;
  location?: string;
  [key: string]: unknown;
}

interface DhdTrackResult {
  status?: string;
  statut?: string;
  etat?: string;
  historique?: DhdEvent[];
  history?: DhdEvent[];
  events?: DhdEvent[];
  tracking_history?: DhdEvent[];
  [key: string]: unknown;
}

function normalizeDhdHistory(data: DhdTrackResult): DhdEvent[] {
  const arr = data.historique ?? data.history ?? data.events ?? data.tracking_history;
  if (Array.isArray(arr)) return arr;
  return [];
}

function formatDhdDate(ev: DhdEvent): string {
  const raw = ev.date ?? ev.datetime ?? ev.created_at ?? "";
  if (!raw) return "";
  try {
    return new Date(String(raw)).toLocaleString("fr-DZ");
  } catch {
    return String(raw);
  }
}

function dhdEventLabel(ev: DhdEvent): string {
  return String(ev.status ?? ev.statut ?? ev.description ?? ev.message ?? "").trim();
}

export default function TrackOrder() {
  const search = useSearch();
  const urlId = new URLSearchParams(search).get("id");
  const initialId = urlId && !isNaN(parseInt(urlId)) ? parseInt(urlId) : null;

  const [orderId, setOrderId] = useState(initialId ? String(initialId) : "");
  const [searchId, setSearchId] = useState<number | null>(initialId);
  const [dhdData, setDhdData] = useState<DhdTrackResult | null>(null);
  const [dhdLoading, setDhdLoading] = useState(false);
  const [dhdError, setDhdError] = useState<string | null>(null);

  const DONE_STATUSES = ["delivered", "cash_ready", "cancelled"];

  const { data, isLoading, isError } = useTrackOrder(
    searchId ?? 0,
    {
      query: {
        enabled: searchId !== null,
        refetchInterval: (query) => {
          const d = query.state.data as typeof data | undefined;
          if (!d) return searchId !== null ? 30000 : false;
          return DONE_STATUSES.includes(d.status) ? false : 30000;
        },
      },
    }
  );

  useEffect(() => {
    if (!data?.trackingNumber) {
      setDhdData(null);
      setDhdError(null);
      return;
    }
    setDhdData(null);
    setDhdError(null);
    setDhdLoading(true);
    fetch(`/api/orders/dhd-status/${encodeURIComponent(data.trackingNumber)}`)
      .then(r => r.json())
      .then(json => {
        if (json?.data) {
          setDhdData(json.data as DhdTrackResult);
        } else if (json?.error) {
          setDhdError(json.error as string);
        }
      })
      .catch(() => setDhdError("تعذّر الاتصال بـ DHD"))
      .finally(() => setDhdLoading(false));
  }, [data?.trackingNumber]);

  const handleSearch = () => {
    const id = parseInt(orderId.trim());
    if (!isNaN(id) && id > 0) setSearchId(id);
  };

  const info = data ? STATUS_INFO[data.status] : null;
  const StatusIcon = info?.icon ?? Package;
  const currentStep = data ? STATUS_STEPS.indexOf(data.status) : -1;
  const dhdHistory = dhdData ? normalizeDhdHistory(dhdData) : [];
  const dhdCurrentStatus = dhdData
    ? String(dhdData.status ?? dhdData.statut ?? dhdData.etat ?? "").trim()
    : "";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-black text-primary cursor-pointer">متجر الفخامة</span>
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
            <p className="text-muted-foreground mt-2">أدخل رقم طلبيتك لمعرفة حالتها لحظةً بلحظة</p>
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
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

                {/* Pending — waiting for confirmation notice */}
                {data.status === "pending" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 items-start">
                    <Hourglass className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">في انتظار التأكيد</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        طلبيتك وصلتنا ✓ — انتظر حتى نتصل بك لتأكيدها ونرفعها على منصة التوصيل DHD، بعدها ستجد هنا تفاصيل الشحن والتتبع.
                      </p>
                    </div>
                  </div>
                )}

                {!DONE_STATUSES.includes(data.status) && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                    تتحدث تلقائياً كل 30 ثانية
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">المنتج</p>
                    <p className="font-medium">{data.productName}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">الولاية</p>
                    <p className="font-medium">{data.wilaya ?? "—"}</p>
                  </div>
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

                {data.trackingNumber && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-primary/5 border-b px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">رقم التتبع DHD</p>
                        <p className="font-mono font-bold text-primary text-sm" dir="ltr">{data.trackingNumber}</p>
                      </div>
                      {dhdLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {dhdCurrentStatus && !dhdLoading && (
                        <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-1 rounded-full">
                          {dhdCurrentStatus}
                        </span>
                      )}
                    </div>

                    {dhdLoading && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        جاري جلب آخر تحديثات التوصيل من DHD...
                      </div>
                    )}

                    {!dhdLoading && dhdError && (
                      <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {dhdError}
                      </div>
                    )}

                    {!dhdLoading && dhdHistory.length > 0 && (
                      <div className="px-4 py-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">سجل التوصيل</p>
                        <ol className="relative border-r border-muted pr-5 space-y-4">
                          {dhdHistory.map((ev, i) => (
                            <li key={i} className="relative">
                              <span className="absolute -right-[1.35rem] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary/60 block" />
                              <p className="text-sm font-medium leading-tight">{dhdEventLabel(ev) || "تحديث"}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                {(ev.lieu ?? ev.location) && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {String(ev.lieu ?? ev.location)}
                                  </span>
                                )}
                                {formatDhdDate(ev) && (
                                  <span className="flex items-center gap-0.5" dir="ltr">
                                    <CalendarDays className="w-3 h-3" />
                                    {formatDhdDate(ev)}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {!dhdLoading && !dhdError && dhdHistory.length === 0 && dhdData && (
                      <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                        لا يوجد سجل تفصيلي بعد — تحقق لاحقاً
                      </div>
                    )}
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
