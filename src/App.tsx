import { memo, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { usePerformanceOptimizations } from "@/hooks/usePerformanceOptimizations";

// Optimized QueryClient configuration for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = memo(() => {
  // Initialize performance optimizations
  const { isOptimized } = usePerformanceOptimizations({
    enableCaching: true,
    enableDebouncing: true,
    enableCSSOptimization: true,
    enableComponentOptimization: true,
    enableMemoryManagement: true,
    autoOptimizeInterval: 30000, // 30 seconds
    memoryThreshold: 100, // 100MB
  });

  useEffect(() => {
    if (isOptimized && process.env.NODE_ENV === 'development') {
      console.log('🚀 Performance optimizations initialized successfully');
    }
  }, [isOptimized]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
});

App.displayName = "App";

export default App;
