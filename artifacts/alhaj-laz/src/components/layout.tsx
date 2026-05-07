import { Link, useLocation } from "wouter";
import { Menu, X, Lock, Home, LayoutGrid, PackageSearch } from "lucide-react";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "الرئيسية", href: "/", icon: Home },
    { name: "المنتجات", href: "/store", icon: LayoutGrid },
    { name: "تتبع الطلبات", href: "/track", icon: PackageSearch },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Right — logo + name */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-black text-primary tracking-wide">متجر الفخامة</span>
              <img
                src="/logo-orig.jpg"
                alt="متجر الفخامة"
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
          </Link>

          {/* Center — nav links (desktop) */}
          <nav className="hidden sm:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${active ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-primary hover:bg-primary/5"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Left — admin login + mobile menu */}
          <div className="flex items-center gap-2">
            <Link href="/admin/login">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary transition-colors border border-gray-200 hover:border-primary/40 rounded-full px-3 py-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">الإدارة</span>
              </button>
            </Link>
            <button
              className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-border bg-white">
            <nav className="px-4 py-3 flex flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${active ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </button>
                  </Link>
                );
              })}
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
                src="/logo-orig.jpg"
                alt="متجر الفخامة"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="font-bold text-xl">متجر الفخامة</span>
            </div>
            <p className="text-secondary-foreground/70 mb-4 max-w-sm">
              سوق الملابس الرائد في الجزائر. نقدم أفضل الأسعار والجودة العالية.
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
          &copy; {new Date().getFullYear()} متجر الفخامة لبيع الملابس. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
}
