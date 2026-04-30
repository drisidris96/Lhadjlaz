import { Link } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, ShieldCheck, Truck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSlideshow } from "@/components/hero-slideshow";

export default function Home() {
  const { data: products, isLoading } = useListProducts({});
  
  const featuredProducts = products?.slice(0, 8) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden border-b border-border/50">
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                المورد الأول لتجار الملابس في الجزائر
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight mb-6">
                تسوق بالجملة بكل ثقة من <span className="text-primary">الحاج لاز</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                نوفر لك أفضل تشكيلات الملابس بجودة عالية وأسعار جملة منافسة. اطلب الآن ونصلك إلى أي ولاية في الجزائر.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8">
                    تصفح المنتجات
                    <ArrowLeft className="w-5 h-5 mr-2" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full max-w-xl mx-auto lg:mx-0 lg:justify-self-end">
              <HeroSlideshow />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-muted/50 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4 bg-background p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">جودة مضمونة</h3>
                <p className="text-sm text-muted-foreground">أفضل الخامات في السوق</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-background p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">توصيل لكل الولايات</h3>
                <p className="text-sm text-muted-foreground">تغطية 58 ولاية جزائرية</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-background p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">أسعار جملة</h3>
                <p className="text-sm text-muted-foreground">هوامش ربح ممتازة للتجار</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-background p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">معالجة سريعة</h3>
                <p className="text-sm text-muted-foreground">تجهيز الطلبيات في 24 ساعة</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-10 border-b border-border/50 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">وصل حديثاً</h2>
              <p className="text-muted-foreground mt-2">أحدث تشكيلات الملابس المتوفرة للبيع بالجملة</p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="hidden sm:flex">
                عرض الكل
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-8 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">لا توجد منتجات حالياً</h3>
              <p className="text-muted-foreground">قم بإضافة منتجات من لوحة الإدارة</p>
            </div>
          )}
          
          <div className="mt-8 sm:hidden flex justify-center">
            <Link href="/products" className="w-full">
              <Button variant="outline" className="w-full">
                عرض كل المنتجات
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
