import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListOrders,
  useAdminMe,
  useImportDhdTracking,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  Truck,
  Package2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { formatDZD } from "@/lib/utils";

const READY_TO_SHIP_STATUSES = ["confirmed"] as const;
const SHIPPED_STATUSES = ["shipped", "out_for_delivery", "delivered"] as const;

export default function AdminDhd() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{
    updated: number;
    notFound: number[];
  } | null>(null);

  const { data: session, isLoading: sessionLoading } = useAdminMe();

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: orders, isLoading: ordersLoading } = useListOrders();

  const importTracking = useImportDhdTracking({
    mutation: {
      onSuccess: (data) => {
        const d = data as { updated: number; notFound: number[] };
        setLastImport(d);
        toast({
          title: `تم تحديث ${d.updated} طلبية بنجاح`,
          description:
            d.notFound.length > 0
              ? `لم يتم العثور على ${d.notFound.length} طلبية`
              : "كل الأرقام تم استيرادها",
        });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "فشل الاستيراد",
          description: "تأكد من صيغة الملف وحاول مرة أخرى",
        });
      },
      onSettled: () => setImporting(false),
    },
  });

  const handleExportCsv = () => {
    const url = `${import.meta.env.BASE_URL}api/admin/dhd/export`;
    window.location.href = url;
    toast({
      title: "جاري تحميل ملف CSV",
      description: "ارفع الملف في منصة DHD",
    });
  };

  const parseTrackingFile = async (
    file: File
  ): Promise<{ orderId: number; trackingNumber: string }[]> => {
    const text = await file.text();
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => l.trim());
    if (lines.length === 0) return [];
    const header = lines[0].toLowerCase();
    const sep = header.includes(";") ? ";" : ",";
    const cols = header.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const refIdx = cols.findIndex((c) =>
      /reference|ref|cmd|commande|order/i.test(c)
    );
    const trackIdx = cols.findIndex((c) =>
      /tracking|tracker|colis|tracking_number|num_colis/i.test(c)
    );
    if (refIdx === -1 || trackIdx === -1) {
      throw new Error("Missing reference or tracking column");
    }
    const items: { orderId: number; trackingNumber: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i]
        .split(sep)
        .map((c) => c.trim().replace(/^"|"$/g, ""));
      const ref = parts[refIdx] || "";
      const tn = parts[trackIdx] || "";
      const idMatch = ref.match(/(\d+)/);
      if (!idMatch || !tn) continue;
      items.push({ orderId: parseInt(idMatch[1], 10), trackingNumber: tn });
    }
    return items;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setLastImport(null);
    try {
      const items = await parseTrackingFile(file);
      if (items.length === 0) {
        toast({
          variant: "destructive",
          title: "الملف فارغ أو غير صالح",
          description: "تأكد من وجود أعمدة reference و tracking",
        });
        setImporting(false);
        return;
      }
      importTracking.mutate({ data: { items } });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ في قراءة الملف",
        description: "تأكد من أن الملف بصيغة CSV صحيحة",
      });
      setImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const allOrders = orders ?? [];
  const readyToShip = allOrders.filter(
    (o) =>
      (READY_TO_SHIP_STATUSES as readonly string[]).includes(o.status) &&
      !o.trackingNumber
  );
  const shippedOrders = allOrders.filter((o) =>
    (SHIPPED_STATUSES as readonly string[]).includes(o.status)
  );
  const totalRevenuePending = readyToShip.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* العنوان */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            توصيل DHD
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة الشحنات عبر DHD: تصدير الطلبيات الجديدة واستيراد أرقام التتبع
          </p>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <Package2 className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">جاهزة للشحن</p>
                <p className="text-2xl font-bold">{readyToShip.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Truck className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيد الشحن</p>
                <p className="text-2xl font-bold">{shippedOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">قيمة قيد التحصيل</p>
                <p className="text-2xl font-bold">
                  {formatDZD(totalRevenuePending)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* خطوات سير العمل */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* الخطوة 1: التصدير */}
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <Download className="w-5 h-5 text-primary" />
                تصدير الطلبيات لـ DHD
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  حمّل ملف CSV يحتوي على كل الطلبيات المؤكَّدة الجاهزة للشحن
                  (التي ليس لها رقم تتبع بعد).
                </p>
                <ul className="list-disc pr-5 space-y-1">
                  <li>الصيغة متوافقة مع منصة DHD / Ecotrack</li>
                  <li>تحتوي على: المرجع، الزبون، العنوان، البلدية، الولاية، المبلغ</li>
                  <li>ارفع الملف في DHD من قسم "Importer des colis"</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  جاهزة للتصدير الآن:{" "}
                  <span className="font-bold">{readyToShip.length}</span> طلبية
                </p>
              </div>
              <Button
                className="w-full gap-2 h-12 text-base"
                onClick={handleExportCsv}
                disabled={readyToShip.length === 0}
                data-testid="button-export-dhd"
              >
                <Download className="w-5 h-5" />
                تنزيل ملف CSV ({readyToShip.length} طلبية)
              </Button>
            </CardContent>
          </Card>

          {/* الخطوة 2: الاستيراد */}
          <Card className="border-2 border-primary/30">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <Upload className="w-5 h-5 text-primary" />
                استيراد أرقام التتبع
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  بعد ما تعالج DHD الطرود، حمّل من منصتها ملف CSV يحتوي على
                  أرقام التتبع وارفعه هنا.
                </p>
                <ul className="list-disc pr-5 space-y-1">
                  <li>يجب أن يحتوي الملف على عمود "reference" وعمود "tracking"</li>
                  <li>الطلبيات ستنتقل تلقائياً إلى حالة "في انتظار الشحن"</li>
                  <li>يقبل صيغ CSV مفصولة بـ , أو ;</li>
                </ul>
              </div>
              {lastImport && (
                <div
                  className={`rounded-md p-3 flex gap-2 border ${
                    lastImport.notFound.length > 0
                      ? "bg-amber-50 border-amber-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  {lastImport.notFound.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">
                      آخر استيراد: تم تحديث {lastImport.updated} طلبية
                    </p>
                    {lastImport.notFound.length > 0 && (
                      <p className="text-amber-900 mt-1">
                        لم يتم العثور على: {lastImport.notFound.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full gap-2 h-12 text-base border-primary text-primary hover:bg-primary/10"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-import-tracking"
              >
                <Upload className="w-5 h-5" />
                {importing ? "جاري الاستيراد..." : "اختر ملف CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
                data-testid="input-tracking-file"
              />
            </CardContent>
          </Card>
        </div>

        {/* جدول الطلبيات المشحونة */}
        <Card>
          <CardHeader className="pb-4 border-b">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              الطلبيات المشحونة عبر DHD
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full mr-auto">
                {shippedOrders.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : shippedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد طلبيات مشحونة بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr className="text-right">
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        رقم الطلب
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        الزبون
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        الهاتف
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        الولاية
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        المبلغ
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        رقم التتبع
                      </th>
                      <th className="h-12 px-4 font-medium text-muted-foreground">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4 font-mono text-xs">
                          CMD-{order.id}
                        </td>
                        <td className="p-4">
                          {order.firstName} {order.lastName}
                        </td>
                        <td className="p-4 font-mono text-xs" dir="ltr">
                          {order.phone}
                        </td>
                        <td className="p-4">{order.wilaya || "—"}</td>
                        <td className="p-4 font-bold">
                          {formatDZD(order.totalPrice)}
                        </td>
                        <td className="p-4">
                          {order.trackingNumber ? (
                            <span
                              className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block"
                              dir="ltr"
                            >
                              {order.trackingNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              order.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : order.status === "out_for_delivery"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {order.status === "delivered"
                              ? "تم التسليم"
                              : order.status === "out_for_delivery"
                                ? "قيد التوصيل"
                                : "في انتظار الشحن"}
                          </span>
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
