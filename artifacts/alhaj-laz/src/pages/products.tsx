import { useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, PackageX } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function Products() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [category, setCategory] = useState<string>("");
  
  const { data: products, isLoading } = useListProducts({ 
    search: debouncedSearch,
    category: category || undefined
  });
  
  // Get unique categories
  const categories = ["", ...Array.from(new Set(products?.map(p => p.category) || []))].filter(Boolean);

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-6">قائمة المنتجات</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                type="text" 
                placeholder="ابحث عن منتج..." 
                className="pl-4 pr-10 h-12 text-lg bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Button 
                variant={category === "" ? "default" : "outline"}
                className="h-12 whitespace-nowrap"
                onClick={() => setCategory("")}
              >
                الكل
              </Button>
              {categories.map((c) => (
                <Button 
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  className="h-12 whitespace-nowrap"
                  onClick={() => setCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
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
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
              <PackageX className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">لا توجد منتجات</h2>
            <p className="text-muted-foreground text-lg">
              {search || category ? "لم يتم العثور على منتجات تطابق بحثك. جرب كلمات أخرى أو قم بإلغاء الفلتر." : "الكتالوج فارغ حالياً."}
            </p>
            {(search || category) && (
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                }}
              >
                إلغاء الفلاتر
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
