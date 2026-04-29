import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatDZD } from "@/lib/utils";
import type { Product } from "@workspace/api-client-react/generated";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden group flex flex-col h-full hover:shadow-md transition-shadow border-border/50 hover:border-primary/30">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square bg-muted relative overflow-hidden cursor-pointer">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-secondary/5">
              لا توجد صورة
            </div>
          )}
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold text-foreground border border-border/50">
            {product.category}
          </div>
        </div>
      </Link>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-bold text-lg mb-1 line-clamp-1 cursor-pointer hover:text-primary transition-colors" title={product.name}>
            {product.name}
          </h3>
        </Link>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {product.description || "لا يوجد وصف متوفر"}
        </p>
        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-xs text-muted-foreground mb-1">سعر الجملة</p>
            <p className="font-bold text-xl text-primary">{formatDZD(product.price)}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground mb-1">أقل كمية</p>
            <p className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded text-sm inline-block">
              {product.minOrderQty} قطعة
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Link href={`/order/${product.id}`} className="w-full">
          <Button className="w-full font-semibold group-hover:bg-primary/90 transition-colors">
            <ShoppingCart className="w-4 h-4 ml-2" />
            اطلب الآن
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
