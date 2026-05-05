import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListOrders,
  useUpdateOrderStatus,
  useUpdateOrderInfo,
  useAdminMe,
  useImportDhdTracking,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag,
  Check,
  X,
  Inbox,
  Archive,
  Download,
  Upload,
  Pencil,
  Loader2,
} from "lucide-react";
import { formatDZD } from "@/lib/utils";
import { ALGERIAN_WILAYAS, ALGERIAN_BALADIYAT } from "@/lib/constants";
import type { UpdateOrderStatusBodyStatus } from "@workspace/api-client-react/generated";

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    wilaya: "",
    commune: "",
    addressRest: "",
    quantity: 1,
    notes: "",
  });

  const { data: session, isLoading: sessionLoading } = useAdminMe();

  const importTracking = useImportDhdTracking({
    mutation: {
      onSuccess: (data) => {
        const d = data as { updated: number; notFound: number[] };
        toast({
          title: `تم تحديث ${d.updated} طلبية`,
          description:
            d.notFound.length > 0
              ? `طلبيات غير موجودة: ${d.notFound.join(", ")}`
              : "كل الأرقام تم استيرادها بنجاح",
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
  };

  const parseTrackingFile = async (file: File): Promise<{ orderId: number; trackingNumber: string }[]> => {
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const header = lines[0].toLowerCase();
    const sep = header.includes(";") ? ";" : ",";
    const cols = header.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const refIdx = cols.findIndex((c) => /reference|ref|cmd|commande|order/i.test(c));
    const trackIdx = cols.findIndex((c) => /tracking|tracker|colis|tracking_number|num_colis/i.test(c));
    if (refIdx === -1 || trackIdx === -1) {
      throw new Error("Missing reference or tracking column");
    }
    const items: { orderId: number; trackingNumber: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
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

  if (!sessionLoading && !session?.isAdmin) {
    setLocation("/admin/login");
    return null;
  }

  const { data: orders, isLoading: ordersLoading } = useListOrders();

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: (_data, variables) => {
        const newStatus = (variables.data as { status: string })?.status;
        const msg =
          newStatus === "confirmed"
            ? "تم قبول الطلب"
            : newStatus === "cancelled"
            ? "تم رفض الطلب"
            : "تم تحديث حالة الطلب";
        toast({ title: msg });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "حدث خطأ",
          description: "لم نتمكن من تحديث حالة الطلب",
        });
      },
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({
      id,
      data: { status: status as UpdateOrderStatusBodyStatus },
    });
  };

  const updateInfo = useUpdateOrderInfo({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تحديث معلومات الزبون" });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setEditingOrderId(null);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "تعذّر حفظ التعديلات",
          description: "تأكد من ملء كل الحقول الإلزامية",
        });
      },
    },
  });

  const openEditDialog = (order: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    wilaya?: string | null;
    address: string;
    quantity: number;
    notes?: string | null;
  }) => {
    const idx = (order.address || "").indexOf(" - ");
    const commune = idx === -1 ? "" : order.address.slice(0, idx).trim();
    const addressRest = idx === -1 ? order.address : order.address.slice(idx + 3).trim();
    setEditForm({
      firstName: order.firstName,
      lastName: order.lastName,
      phone: order.phone,
      wilaya: order.wilaya ?? "",
      commune,
      addressRest,
      quantity: order.quantity,
      notes: order.notes ?? "",
    });
    setEditingOrderId(order.id);
  };

  const handleSaveEdit = () => {
    if (editingOrderId === null) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.phone.trim()) {
      toast({
        variant: "destructive",
        title: "حقول ناقصة",
        description: "الاسم واللقب ورقم الهاتف إلزامية",
      });
      return;
    }
    const fullAddress = editForm.commune
      ? `${editForm.commune} - ${editForm.addressRest}`.trim()
      : editForm.addressRest.trim();
    updateInfo.mutate({
      id: editingOrderId,
      data: {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        wilaya: editForm.wilaya || undefined,
        address: fullAddress,
        quantity: editForm.quantity,
        notes: editForm.notes,
      },
    });
  };

  const communeOptions = editForm.wilaya
    ? ALGERIAN_BALADIYAT[editForm.wilaya] ?? []
    : [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending_delivery":
        return "bg-orange-100 text-orange-800";
      case "cash_ready":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const PROCESSED_STATUSES = [
    "confirmed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "pending_delivery",
    "cash_ready",
  ] as const;

  const pendingOrders = (orders ?? []).filter((o) => o.status === "pending");
  const processedOrders = (orders ?? []).filter((o) =>
    (PROCESSED_STATUSES as readonly string[]).includes(o.status),
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الطلبات</h1>
            <p className="text-muted-foreground mt-1">
              راجع الطلبات الجديدة وأكّدها أو ارفضها، وتابع الطلبات المؤكَّدة والملغاة
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10"
              onClick={handleExportCsv}
              data-testid="button-export-dhd"
            >
              <Download className="w-4 h-4" />
              تصدير لـ DHD
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary/10"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-tracking"
            >
              <Upload className="w-4 h-4" />
              {importing ? "جاري الاستيراد..." : "استيراد أرقام التتبع"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFile}
              data-testid="input-tracking-file"
            />
          </div>
        </div>

        {/* ============== الطلبات الجديدة (قيد الانتظار) ============== */}
        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-600" />
              الطلبات الجديدة
            </CardTitle>
            <span className="text-sm font-medium bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              {pendingOrders.length} طلب
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingOrders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-20">
                        رقم الطلب
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        التاريخ
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        معلومات الزبون
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        المنتج
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الكمية
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        المجموع
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        ملاحظات
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-56">
                        إجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {pendingOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-4 align-middle font-mono font-bold">
                          #{order.id}
                        </td>
                        <td
                          className="p-4 align-middle text-muted-foreground"
                          dir="ltr"
                        >
                          {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-semibold">
                            {order.firstName} {order.lastName}
                          </div>
                          <div
                            className="text-xs text-muted-foreground mt-1"
                            dir="ltr"
                          >
                            {order.phone}
                          </div>
                          <div className="text-xs mt-1">
                            {order.wilaya} - {order.address}
                          </div>
                        </td>
                        <td
                          className="p-4 align-middle font-medium max-w-[200px] truncate"
                          title={order.productName}
                        >
                          {order.productName}
                        </td>
                        <td className="p-4 align-middle font-bold text-center">
                          {order.quantity}
                        </td>
                        <td className="p-4 align-middle font-bold text-primary">
                          {formatDZD(order.totalPrice)}
                        </td>
                        <td
                          className="p-4 align-middle text-xs max-w-[150px] truncate"
                          title={order.notes || ""}
                        >
                          {order.notes || (
                            <span className="text-muted-foreground/50">
                              لا يوجد
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="default"
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold shadow-sm"
                              disabled={updateStatus.isPending}
                              onClick={() => openEditDialog(order)}
                              data-testid={`button-edit-${order.id}`}
                            >
                              <Pencil className="w-4 h-4 ml-1" />
                              تعديل
                            </Button>
                            <Button
                              size="default"
                              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold shadow-md hover:shadow-lg transition-all"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                handleStatusChange(order.id, "confirmed")
                              }
                              data-testid={`button-accept-${order.id}`}
                            >
                              <Check className="w-5 h-5 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="default"
                              variant="destructive"
                              className="font-bold shadow-md hover:shadow-lg transition-all"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                handleStatusChange(order.id, "cancelled")
                              }
                              data-testid={`button-reject-${order.id}`}
                            >
                              <X className="w-5 h-5 ml-1" />
                              رفض
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبات جديدة
                </h3>
                <p className="text-muted-foreground">
                  جميع الطلبات الواردة تم التعامل معها
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============== Dialog تعديل معلومات الزبون ============== */}
        <Dialog
          open={editingOrderId !== null}
          onOpenChange={(open) => {
            if (!open) setEditingOrderId(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                تعديل معلومات الزبون - طلبية #{editingOrderId}
              </DialogTitle>
              <DialogDescription>
                صحّح أي معلومات غير صحيحة قبل قبول الطلبية
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">الاسم *</Label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                  data-testid="input-edit-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">اللقب *</Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                  data-testid="input-edit-lastname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف *</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  dir="ltr"
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">الكمية</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min={1}
                  value={editForm.quantity}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      quantity: Math.max(1, parseInt(e.target.value || "1", 10)),
                    })
                  }
                  data-testid="input-edit-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-wilaya">الولاية</Label>
                <Select
                  value={editForm.wilaya}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, wilaya: value, commune: "" })
                  }
                >
                  <SelectTrigger id="edit-wilaya" data-testid="select-edit-wilaya">
                    <SelectValue placeholder="اختر الولاية" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALGERIAN_WILAYAS.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-commune">البلدية</Label>
                <Select
                  value={editForm.commune}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, commune: value })
                  }
                  disabled={communeOptions.length === 0}
                >
                  <SelectTrigger id="edit-commune" data-testid="select-edit-commune">
                    <SelectValue
                      placeholder={
                        editForm.wilaya ? "اختر البلدية" : "اختر الولاية أولاً"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {communeOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-address">العنوان التفصيلي</Label>
                <Input
                  id="edit-address"
                  value={editForm.addressRest}
                  onChange={(e) =>
                    setEditForm({ ...editForm, addressRest: e.target.value })
                  }
                  placeholder="الحي، الشارع، نقطة المعلَم..."
                  data-testid="input-edit-address"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-notes">ملاحظات</Label>
                <Textarea
                  id="edit-notes"
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  data-testid="input-edit-notes"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingOrderId(null)}
                disabled={updateInfo.isPending}
                data-testid="button-cancel-edit"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateInfo.isPending}
                className="bg-primary text-primary-foreground font-bold"
                data-testid="button-save-edit"
              >
                {updateInfo.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التعديلات"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============== الطلبات المؤكَّدة والملغاة ============== */}
        <Card>
          <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              الطلبات المؤكَّدة والملغاة
            </CardTitle>
            <span className="text-sm font-medium bg-muted text-foreground px-3 py-1 rounded-full">
              {processedOrders.length} طلب
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : processedOrders.length > 0 ? (
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-right">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الاسم
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        اللقب
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        العنوان
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        رقم الهاتف
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الطلبية
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        الكمية
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                        رقم التتبع
                      </th>
                      <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-40">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {processedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-4 align-middle font-medium">
                          {order.firstName}
                        </td>
                        <td className="p-4 align-middle font-medium">
                          {order.lastName}
                        </td>
                        <td className="p-4 align-middle text-sm">
                          {order.wilaya ? `${order.wilaya} - ` : ""}
                          {order.address}
                        </td>
                        <td className="p-4 align-middle text-sm" dir="ltr">
                          {order.phone}
                        </td>
                        <td
                          className="p-4 align-middle max-w-[220px] truncate"
                          title={order.productName}
                        >
                          {order.productName}
                        </td>
                        <td className="p-4 align-middle font-bold text-center">
                          {order.quantity}
                        </td>
                        <td className="p-4 align-middle">
                          {order.trackingNumber ? (
                            <span
                              className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block"
                              dir="ltr"
                            >
                              {order.trackingNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold shadow-sm whitespace-nowrap"
                              disabled={updateStatus.isPending}
                              onClick={() => openEditDialog(order)}
                              data-testid={`button-edit-processed-${order.id}`}
                            >
                              <Pencil className="w-4 h-4 ml-1" />
                              تعديل
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                updateStatus.isPending ||
                                order.status === "confirmed"
                              }
                              onClick={() =>
                                handleStatusChange(order.id, "confirmed")
                              }
                              className={`font-medium shadow-sm whitespace-nowrap ${
                                order.status === "confirmed"
                                  ? "bg-blue-600 text-white font-bold cursor-default opacity-100 disabled:opacity-100"
                                  : "bg-white border border-blue-600 text-blue-700 hover:bg-blue-50"
                              }`}
                              data-testid={`button-set-confirmed-${order.id}`}
                            >
                              تأكيد
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                updateStatus.isPending ||
                                order.status === "cancelled"
                              }
                              onClick={() =>
                                handleStatusChange(order.id, "cancelled")
                              }
                              className={`font-medium shadow-sm whitespace-nowrap ${
                                order.status === "cancelled"
                                  ? "bg-red-600 text-white font-bold cursor-default opacity-100 disabled:opacity-100"
                                  : "bg-white border border-red-600 text-red-700 hover:bg-red-50"
                              }`}
                              data-testid={`button-set-cancelled-${order.id}`}
                            >
                              إلغاء
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  لا توجد طلبات مُعالَجة بعد
                </h3>
                <p className="text-muted-foreground">
                  ستظهر هنا الطلبات بعد قبولها أو رفضها
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
