import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, Menu, X, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/607425693_122184037190525400_7044830700338524128_n_1777454044692.jpg";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "الرئيسية", href: "/" },
    { name: "المنتجات", href: "/products" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <img
                  src={logoUrl}
                  alt="الحاج لاز"
                  className="w-12 h-12 rounded-full object-cover bg-black ring-2 ring-primary/30"
                />
                <span className="font-bold text-2xl tracking-tight text-foreground">الحاج لاز</span>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 mr-6">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span className={`text-sm font-medium transition-colors cursor-pointer hover:text-primary ${location === item.href ? "text-primary" : "text-muted-foreground"}`}>
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/login">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <User className="w-5 h-5" />
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span 
                    className={`block text-base font-medium transition-colors cursor-pointer ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-secondary text-secondary-foreground py-12 mt-12 border-t-4 border-primary">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoUrl}
                alt="الحاج لاز"
                className="w-10 h-10 rounded-full object-cover bg-black"
              />
              <span className="font-bold text-xl">الحاج لاز</span>
            </div>
            <p className="text-secondary-foreground/70 mb-4 max-w-sm">
              سوق الجملة للملابس الرائد في الجزائر. نقدم أفضل الأسعار والجودة العالية لتجار التجزئة.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4 border-b border-secondary-foreground/10 pb-2 inline-block">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link href="/"><span className="text-secondary-foreground/70 hover:text-primary transition-colors cursor-pointer">الرئيسية</span></Link></li>
              <li><Link href="/products"><span className="text-secondary-foreground/70 hover:text-primary transition-colors cursor-pointer">جميع المنتجات</span></Link></li>
              <li><Link href="/admin/login"><span className="text-secondary-foreground/70 hover:text-primary transition-colors cursor-pointer">تسجيل دخول التجار</span></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4 border-b border-secondary-foreground/10 pb-2 inline-block">تواصل معنا</h3>
            <ul className="space-y-2 text-secondary-foreground/70">
              <li>الجزائر العاصمة، الجزائر</li>
              <li dir="ltr" className="text-right">+213 555 12 34 56</li>
              <li>contact@alhajlaz.dz</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-secondary-foreground/10 text-center text-secondary-foreground/50 text-sm">
          &copy; {new Date().getFullYear()} الحاج لاز لبيع الملابس بالجملة. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
