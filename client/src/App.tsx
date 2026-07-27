import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Login } from "./pages/login";
import { Board } from "./pages/Board";
import { History } from "./pages/History";
import { AdminSettings } from "./pages/AdminSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Board />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<AdminSettings />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
