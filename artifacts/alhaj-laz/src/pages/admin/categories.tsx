import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useAdminMe,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import type { Category } from "@workspace/api-client-react";

const categorySchema = z.object({ name: z.string().min(1, "اسم الفئة مطلوب") });
type CategoryForm = z.infer<typeof categorySchema>;

export default function AdminCategories() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useAdminMe();
  if (!sessionLoading && !session?.isAdmin) { setLocation("/admin/login"); return null; }

  const { data: categories = [], isLoading } = useListCategories();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  const addForm = useForm<CategoryForm>({ resolver: zodResolver(categorySchema), defaultValues: { name: "" } });
  const editForm = useForm<CategoryForm>({ resolver: zodResolver(categorySchema), defaultValues: { name: "" } });

  const create = useCreateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "تمت إضافة الفئة ✅" });
        addForm.reset();
        setAddOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "الفئة موجودة مسبقاً", variant: "destructive" }),
    },
  });

  const update = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تعديل الفئة ✅" });
        setEditTarget(null);
        invalidate();
      },
      onError: () => toast({ title: "الاسم مستخدم مسبقاً", variant: "destructive" }),
    },
  });

  const remove = useDeleteCategory({
    mutation: {
      onSuccess: () => { toast({ title: "تم حذف الفئة" }); invalidate(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    },
  });

  const onAdd = (values: CategoryForm) => create.mutate({ data: values });

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    editForm.setValue("name", cat.name);
  };

  const onEdit = (values: CategoryForm) => {
    if (!editTarget) return;
    update.mutate({ id: editTarget.id, data: values });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الفئات</h1>
            <p className="text-muted-foreground mt-1">أضف، عدّل أو احذف فئات المنتجات</p>
          </div>
          <Button onClick={() => { addForm.reset(); setAddOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            فئة جديدة
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              الفئات الحالية ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد فئات بعد. أضف أولى الفئات!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-background hover:bg-muted/40 transition-colors">
                    <span className="font-semibold text-foreground">{cat.name}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => openEdit(cat)}>
                        <Pencil className="w-4 h-4" />
                        تعديل
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الفئة؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم حذف فئة "{cat.name}" نهائياً. المنتجات المرتبطة بها لن تُحذف.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => remove.mutate({ id: cat.id })}
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة فئة جديدة</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
              <FormField control={addForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الفئة</FormLabel>
                  <FormControl><Input placeholder="مثال: سروال، جلابة..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "جارٍ الحفظ..." : "إضافة"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل الفئة</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الجديد</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>إلغاء</Button>
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
