import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import OrderPage from "@/pages/order";
import Store from "@/pages/store";
import TrackOrder from "@/pages/track";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminOrdersList from "@/pages/admin/orders-list";
import AdminDhd from "@/pages/admin/dhd";
import AdminDhdSync from "@/pages/admin/dhd-sync";
import AdminDhdPayments from "@/pages/admin/dhd-payments";
import AdminDhdOrders from "@/pages/admin/dhd-orders";
import AdminReports from "@/pages/admin/reports";
import AdminCustomers from "@/pages/admin/customers";
import AdminInventory from "@/pages/admin/inventory";
import AdminCategories from "@/pages/admin/categories";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Store} />
      <Route path="/store" component={Store} />
      <Route path="/track" component={TrackOrder} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/order/:productId" component={OrderPage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/orders-list" component={AdminOrdersList} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/dhd" component={AdminDhd} />
      <Route path="/admin/dhd-sync" component={AdminDhdSync} />
      <Route path="/admin/dhd-payments" component={AdminDhdPayments} />
      <Route path="/admin/dhd-orders" component={AdminDhdOrders} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
