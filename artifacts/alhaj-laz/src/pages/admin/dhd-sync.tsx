import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminMe,
  useSyncDhdStatuses,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bookmark,
  Smartphone,
} from "lucide-react";

type SyncResult = {
  updated: number;
  unmatched: string[];
  byStatus: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  shipped: "في انتظار الشحن (إلى المركز)",
  out_for_delivery: "قيد التسليم",
  pending_delivery: "معلّق",
  delivered: "تم التسليم",
  cash_ready: "مسترجعة غير مدفوعة",
};

function buildBookmarklet(receiverUrl: string): string {
  const code = `(async function(){var T={shipped:['/valid/orders/list'],out_for_delivery:['/livraisons/list','/stopdesk/list'],pending_delivery:['/livraisons/suspendu/list'],delivered:['/livraison/non/encaisse/list','/livraison/cashOut/list','/livraison/cashin/list','/livraison/cashin/history/list'],cash_ready:['/livraison/cashOut/list']};var out={};var errs=[];for(var k of Object.keys(T)){var all=new Set();for(var p of T[k]){try{var r=await fetch('https://platform.dhd-dz.com'+p,{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest','Accept':'application/json'},body:'draw=1&start=0&length=10000'});if(!r.ok){errs.push(p+' HTTP '+r.status);continue}var j=await r.json();var txt=JSON.stringify(j.data||[]);var m,re=/DHD[A-Z0-9]{12,}/g;while((m=re.exec(txt))!==null)all.add(m[0])}catch(e){errs.push(p+' '+e.message)}}out[k]=[...all]}var total=Object.values(out).reduce(function(s,a){return s+a.length},0);if(total===0){alert('Aucun colis trouvé. Erreurs: '+errs.join(', '));return}var d=btoa(unescape(encodeURIComponent(JSON.stringify(out))));window.open('${receiverUrl}#data='+d,'_blank')})();`;
  return "javascript:" + code;
}

export default function AdminDhdSync() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useAdminMe();

  const [autoSyncTriggered, setAutoSyncTriggered] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [copied, setCopied] = useState(false);

  const receiverUrl = useMemo(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${window.location.origin}${base}/admin/dhd-sync`;
  }, []);

  const bookmarklet = useMemo(() => buildBookmarklet(receiverUrl), [receiverUrl]);

  const sync = useSyncDhdStatuses({
    mutation: {
      onSuccess: (data) => {
        const d = data as SyncResult;
        setResult(d);
        toast({
          title: `تمت المزامنة: ${d.updated} طلبية محدّثة`,
          description:
            d.unmatched.length > 0
              ? `${d.unmatched.length} رقم تتبع غير معروف عندنا`
              : "كل أرقام التتبع تم العثور عليها",
        });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "فشلت المزامنة",
          description: err instanceof Error ? err.message : "تحقّق من تسجيل الدخول",
        });
      },
    },
  });

  useEffect(() => {
    if (!session?.isAdmin || autoSyncTriggered) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#data=")) return;
    setAutoSyncTriggered(true);
    try {
      const b64 = decodeURIComponent(hash.slice("#data=".length));
      const json = decodeURIComponent(escape(atob(b64)));
      const parsed = JSON.parse(json);
      sync.mutate({ data: { statuses: parsed } });
    } catch {
      toast({
        variant: "destructive",
        title: "بيانات غير صالحة في الرابط",
        description: "أعد تشغيل الـ bookmarklet من DHD",
      });
      setAutoSyncTriggered(true);
    }
  }, [session, autoSyncTriggered, sync, toast]);

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopied(true);
      toast({ title: "تم نسخ الـ Bookmarklet" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "تعذّر النسخ",
        description: "انسخ الكود يدوياً من المربع",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary" />
            مزامنة حالات DHD
          </h1>
          <p className="text-muted-foreground mt-1">
            استخرج حالات الطلبيات من منصة DHD على هاتفك بضغطة واحدة (Bookmarklet)
          </p>
        </div>

        {sync.isPending && (
          <Card className="border-2 border-primary">
            <CardContent className="p-6 flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-medium">جاري تطبيق المزامنة...</span>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card
            className={
              result.unmatched.length > 0
                ? "border-amber-300 bg-amber-50/50"
                : "border-green-300 bg-green-50/50"
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {result.unmatched.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                نتيجة آخر مزامنة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {result.updated} طلبية تم تحديثها
              </div>
              {Object.keys(result.byStatus).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.byStatus).map(([s, count]) => (
                    <span
                      key={s}
                      className="text-xs bg-white border border-border px-3 py-1 rounded-full"
                    >
                      {STATUS_LABELS[s] ?? s}: <b>{count}</b>
                    </span>
                  ))}
                </div>
              )}
              {result.unmatched.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-amber-800 font-medium">
                    {result.unmatched.length} رقم تتبع غير موجود في النظام
                  </summary>
                  <div
                    className="mt-2 max-h-40 overflow-auto bg-white p-2 rounded font-mono text-xs"
                    dir="ltr"
                  >
                    {result.unmatched.join(", ")}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              التثبيت لمرة واحدة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <ol className="list-decimal pr-5 space-y-2 text-sm">
              <li>
                انسخ كود الـ <strong>Bookmarklet</strong> أدناه (زر النسخ الأخضر).
              </li>
              <li>
                افتح <strong>Kiwi Browser</strong> أو Chrome، أنشئ إشارة مرجعية جديدة:
                <ul className="list-disc pr-5 mt-1 text-muted-foreground">
                  <li>الاسم: <code className="bg-muted px-1 rounded">DHD Sync</code></li>
                  <li>الرابط: الصق الكود المنسوخ كاملاً (يبدأ بـ <code>javascript:</code>)</li>
                </ul>
              </li>
              <li>احفظ الإشارة.</li>
            </ol>

            <div className="bg-muted rounded-md p-3">
              <textarea
                readOnly
                value={bookmarklet}
                className="w-full h-32 font-mono text-xs bg-background border rounded p-2 resize-none"
                dir="ltr"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                data-testid="bookmarklet-code"
              />
            </div>

            <Button
              onClick={handleCopy}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-copy-bookmarklet"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  تم النسخ ✓
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  نسخ الـ Bookmarklet
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              الاستخدام اليومي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-sm">
            <ol className="list-decimal pr-5 space-y-2">
              <li>
                افتح <code className="bg-muted px-1 rounded">platform.dhd-dz.com</code> وسجّل دخولك.
              </li>
              <li>افتح أي صفحة في DHD (مثلاً الرئيسية أو "إلى المركز").</li>
              <li>
                في شريط العنوان اكتب <code className="bg-muted px-1 rounded">DHD Sync</code> واختر
                الإشارة من الاقتراحات.
              </li>
              <li>
                سيفتح تبويب جديد على لوحة الإدارة ويُحدّث حالات كل الطلبيات تلقائياً.
              </li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-900 text-xs">
              <strong>ملاحظة:</strong> يجب أن تكون مسجّل دخول هنا (لوحة الإدارة)
              في نفس المتصفح، حتى تُقبل المزامنة.
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
