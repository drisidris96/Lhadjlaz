import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProduct, useCreateOrder } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { WilayaCombobox } from "@/components/wilaya-combobox";
import { BaladiyaCombobox } from "@/components/baladiya-combobox";
import { formatDZD } from "@/lib/utils";
import { ArrowRight, ShoppingBag, CheckCircle2 } from "lucide-react";

export default function OrderPage() {
  const [, params] = useRoute("/order/:productId");
  const productId = parseInt(params?.productId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { data: product, isLoading, isError } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        toast({
          title: "تم إرسال طلبك بنجاح",
          description: "سيتم التواصل معك قريباً لتأكيد الطلبية"
        });
        setIsSuccess(true);
        window.scrollTo(0, 0);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "حدث خطأ",
          description: "لم نتمكن من إرسال طلبك. يرجى المحاولة مرة أخرى."
        });
      }
    }
  });

  // Form schema
  const orderSchema = z.object({
    firstName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    lastName: z.string().min(2, "اللقب يجب أن يكون حرفين على الأقل"),
    phone: z.string().min(10, "رقم الهاتف غير صحيح").regex(/^[0-9]+$/, "أرقام فقط"),
    wilaya: z.string().min(1, "يرجى اختيار الولاية"),
    baladiya: z.string().min(1, "يرجى اختيار البلدية"),
    address: z.string().min(5, "العنوان يجب أن يكون مفصلاً"),
    quantity: z.number().min(product?.minOrderQty || 1, `الحد الأدنى هو ${product?.minOrderQty || 1} قطعة`),
    notes: z.string().optional()
  });

  type OrderFormValues = z.infer<typeof orderSchema>;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      wilaya: "",
      baladiya: "",
      address: "",
      quantity: product?.minOrderQty || 1,
      notes: ""
    },
  });

  // Update quantity default when product loads
  useEffect(() => {
    if (product && form.getValues().quantity < product.minOrderQty) {
      form.setValue("quantity", product.minOrderQty);
    }
  }, [product, form]);

  const onSubmit = (data: OrderFormValues) => {
    const { baladiya, address, ...rest } = data;
    createOrder.mutate({
      data: {
        ...rest,
        address: `${baladiya} - ${address}`,
        productId
      }
    });
  };

  const quantity = form.watch("quantity") || 0;
  const totalPrice = product ? quantity * product.price : 0;

  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">حدث خطأ</h2>
          <p className="text-muted-foreground mb-6">لم نتمكن من العثور على المنتج المطلوب.</p>
          <Link href="/products">
            <Button>العودة للمنتجات</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isSuccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">تم استلام طلبك بنجاح!</h2>
          <p className="text-lg text-muted-foreground mb-8">
            شكراً لثقتك في الحاج لاز. سنتصل بك قريباً على رقم الهاتف الذي قدمته لتأكيد الطلب وتحديد موعد التسليم.
          </p>
          <Link href="/">
            <Button size="lg" className="w-full">العودة للرئيسية</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <Link href={`/products/${productId}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للمنتج
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">إتمام الطلب</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Order Form */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-md">
              <CardContent className="p-6 md:p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <h3 className="text-xl font-bold border-b pb-4 mb-6">معلومات الزبون والتوصيل</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">الاسم</FormLabel>
                            <FormControl>
                              <Input placeholder="الاسم" className="h-12 bg-muted/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">اللقب</FormLabel>
                            <FormControl>
                              <Input placeholder="اللقب" className="h-12 bg-muted/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">رقم الهاتف</FormLabel>
                            <FormControl>
                              <Input placeholder="05xx xx xx xx" className="h-12 bg-muted/50 text-left" dir="ltr" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="wilaya"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">الولاية</FormLabel>
                            <FormControl>
                              <WilayaCombobox
                                value={field.value}
                                onChange={(v) => {
                                  field.onChange(v);
                                  form.setValue("baladiya", "");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="baladiya"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">البلدية</FormLabel>
                            <FormControl>
                              <BaladiyaCombobox
                                wilaya={form.watch("wilaya")}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">العنوان بالتفصيل</FormLabel>
                          <FormControl>
                            <Input placeholder="الحي، الشارع، رقم المحل..." className="h-12 bg-muted/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <h3 className="text-xl font-bold border-b pb-4 pt-6 mt-8 mb-6">تفاصيل الطلبية</h3>
                    
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">الكمية المطلوبة (قطعة)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={product?.minOrderQty || 1} 
                              className="h-12 text-lg font-bold bg-muted/50" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground mt-2">
                            الحد الأدنى للطلب من هذا المنتج هو {product?.minOrderQty} قطعة
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">ملاحظات إضافية (اختياري)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="أية تفاصيل إضافية حول الألوان المطلوبة، المقاسات، أو مكان التوصيل..." 
                              className="resize-none h-24 bg-muted/50" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full h-16 text-lg font-bold mt-8 shadow-lg shadow-primary/20"
                      disabled={createOrder.isPending || isLoading}
                    >
                      {createOrder.isPending ? "جاري الإرسال..." : "تأكيد الطلب"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card className="sticky top-24 border-primary/20 bg-primary/5 shadow-lg">
              <div className="bg-primary text-primary-foreground p-4 text-lg font-bold flex items-center gap-2 rounded-t-xl">
                <ShoppingBag className="w-5 h-5" />
                ملخص الطلبية
              </div>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : product ? (
                  <div className="space-y-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded overflow-hidden bg-background shrink-0 border border-border">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-xs text-muted-foreground">صورة</div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground line-clamp-2">{product.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{formatDZD(product.price)} للقطعة</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-primary/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">سعر الوحدة:</span>
                        <span className="font-semibold text-foreground">{formatDZD(product.price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الكمية:</span>
                        <span className="font-semibold text-foreground">{quantity} قطعة</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">تكلفة التوصيل:</span>
                        <span className="font-semibold text-foreground">تحدد لاحقاً</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-primary/20">
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-lg">المجموع (بدون توصيل):</span>
                        <span className="font-black text-2xl text-primary">{formatDZD(totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
