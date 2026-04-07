import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FundoProvider } from "@/context/FundoContext";
import Dashboard from "@/pages/Dashboard";
import EnvelopeDetail from "@/pages/EnvelopeDetail";
import SharedView from "@/pages/SharedView";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/envelope/:envelopeId" component={EnvelopeDetail} />
      <Route path="/shared" component={SharedView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FundoProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster position="bottom-center" richColors />
        </TooltipProvider>
      </FundoProvider>
    </QueryClientProvider>
  );
}

export default App;
