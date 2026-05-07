import { useState, useRef, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, Check, X } from "lucide-react";
import type { Category } from "@workspace/api-client-react";

export default function AdminCategories() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useAdminMe();
  if (!sessionLoading && !session?.isAdmin) { setLocation("/admin/login"); return null; }

  const { data: categories = [], isLoading } = useListCategories();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingId !== null) editInputRef.current?.focus(); }, [editingId]);
  useEffect(() => { if (showAdd) addInputRef.current?.focus(); }, [showAdd]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });

  const create = useCreateCategory({
    mutation: {
      onSuccess: () => { toast({ title: "تمت إضافة الفئة ✅" }); setNewName(""); setShowAdd(false); invalidate(); },
      onError: () => toast({ title: "الفئة موجودة مسبقاً", variant: "destructive" }),
    },
  });

  const update = useUpdateCategory({
    mutation: {
      onSuccess: () => { toast({ title: "تم تعديل الفئة ✅" }); setEditingId(null); setSelectedId(null); invalidate(); },
      onError: () => toast({ title: "الاسم مستخدم مسبقاً", variant: "destructive" }),
    },
  });

  const remove = useDeleteCategory({
    mutation: {
      onSuccess: () => { toast({ title: "تم حذف الفئة" }); setSelectedId(null); invalidate(); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    },
  });

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditingName(cat.name); setSelectedId(null); };
  const cancelEdit = () => { setEditingId(null); };
  const confirmEdit = () => {
    if (!editingName.trim()) return;
    update.mutate({ id: editingId!, data: { name: editingName.trim() } });
  };

  const confirmAdd = () => {
    if (!newName.trim()) return;
    create.mutate({ data: { name: newName.trim() } });
  };

  const handleRowClick = (cat: Category) => {
    if (editingId !== null) return;
    setSelectedId(prev => prev === cat.id ? null : cat.id);
  };

  return (
    <AdminLayout>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px) scale(0.8); }
          to   { opacity: 1; transform: translateX(0)    scale(1);   }
        }
        @keyframes pulse-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); }
          50%       { box-shadow: 0 0 0 6px rgba(249,115,22,0);  }
        }
        .btn-orange-animated {
          animation: slideInRight 0.25s cubic-bezier(.34,1.56,.64,1) forwards,
                     pulse-orange 1.5s ease-in-out 0.25s infinite;
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الفئات</h1>
            <p className="text-muted-foreground mt-1">أضف، عدّل أو احذف فئات المنتجات</p>
          </div>
          <Button onClick={() => { setShowAdd(true); setNewName(""); setSelectedId(null); }} className="gap-2" disabled={showAdd}>
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
            <div className="space-y-2">

              {showAdd && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-primary/40 bg-primary/5">
                  <Input
                    ref={addInputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") setShowAdd(false); }}
                    placeholder="اكتب اسم الفئة الجديدة..."
                    className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 font-semibold text-foreground"
                  />
                  <Button size="sm" onClick={confirmAdd} disabled={create.isPending || !newName.trim()} className="gap-1 h-8">
                    <Check className="w-4 h-4" />
                    {create.isPending ? "..." : "إضافة"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="gap-1 h-8 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {isLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)
              ) : categories.length === 0 && !showAdd ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد فئات بعد. اضغط "فئة جديدة" للبدء!</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl select-none"
                    style={{
                      backgroundColor: "#ffffff",
                      border: editingId === cat.id ? "2px solid #facc15" : "2px solid #fde68a",
                      boxShadow: "0 4px 14px rgba(202,138,4,0.18)",
                    }}
                  >
                    {editingId === cat.id ? (
                      <>
                        <Input
                          ref={editInputRef}
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 h-9 border-0 bg-transparent focus-visible:ring-0 font-semibold text-foreground"
                        />
                        <Button size="sm" onClick={e => { e.stopPropagation(); confirmEdit(); }} disabled={update.isPending || !editingName.trim()} className="gap-1 h-8">
                          <Check className="w-4 h-4" />
                          {update.isPending ? "..." : "حفظ"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); cancelEdit(); }} className="gap-1 h-8 text-muted-foreground">
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-semibold" style={{ color: "#ca8a04" }}>{cat.name}</span>

                        <button
                          className="btn-orange-animated flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-bold"
                          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
                          onClick={() => startEdit(cat)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
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
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
