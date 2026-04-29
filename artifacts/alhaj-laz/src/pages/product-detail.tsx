import { useRoute, Link } from "wouter";
import { useGetProduct } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, ArrowRight, Package, Info, ShieldCheck } from "lucide-react";
import { formatDZD } from "@/lib/utils";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const productId = parseInt(params?.id || "0");
  
  const { data: product, isLoading, isError } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  if (isError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">حدث خطأ</h2>
          <p className="text-muted-foreground mb-6">لم نتمكن من تحميل تفاصيل المنتج. ربما تم حذفه.</p>
          <Link href="/products">
            <Button>العودة للمنتجات</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-4 border-b border-border">
        <div className="container mx-auto px-4">
          <Link href="/products">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة لقائمة المنتجات
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-16 w-1/3" />
                <Skeleton className="h-16 w-1/3" />
              </div>
              <Skeleton className="h-14 w-full mt-8" />
            </div>
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="bg-muted rounded-3xl overflow-hidden aspect-square flex items-center justify-center border border-border/50 shadow-sm relative">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground/40 flex flex-col items-center">
                  <Package className="w-20 h-20 mb-4" />
                  <span>لا توجد صورة</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="inline-flex px-3 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20 w-fit text-sm font-medium mb-4">
                {product.category}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 leading-tight">
                {product.name}
              </h1>
              
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 mt-2 flex flex-col gap-2">
                <p className="text-sm font-bold text-muted-foreground">سعر الجملة</p>
                <p className="text-4xl font-black text-primary">{formatDZD(product.price)}</p>
                <div className="text-sm font-medium mt-2 flex items-center gap-2">
                  <span className="bg-muted px-2 py-1 rounded">الحد الأدنى للطلب:</span>
                  <span className="text-foreground font-bold">{product.minOrderQty} قطعة</span>
                </div>
              </div>
              
              <div className="mb-8 prose prose-gray rtl:prose-invert">
                <h3 className="flex items-center gap-2 font-bold text-lg border-b pb-2 mb-4">
                  <Info className="w-5 h-5" />
                  وصف المنتج
                </h3>
                <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {product.description || "لا يوجد وصف متوفر لهذا المنتج."}
                </p>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted p-4 rounded-xl mb-8">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <p>يضمن <span className="font-bold text-foreground">الحاج لاز</span> جودة المنتجات وتطابقها مع المواصفات المذكورة.</p>
              </div>
              
              <div className="mt-auto pt-6 border-t border-border">
                <Link href={`/order/${product.id}`} className="block w-full">
                  <Button size="lg" className="w-full h-16 text-lg font-bold shadow-lg shadow-primary/20">
                    <ShoppingCart className="w-6 h-6 ml-3" />
                    انتقل لصفحة الطلب
                  </Button>
                </Link>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  الدفع عند الاستلام. التوصيل متوفر لجميع الولايات.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
