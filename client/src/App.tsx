import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Login } from "./pages/login";
import { Board } from "./pages/Board";
import { History } from "./pages/History";
import { AdminSettings } from "./pages/AdminSettings";
import { ContactsDirectory } from "./pages/ContactsDirectory";
import { KnowledgeDashboard } from "./pages/KnowledgeDashboard";
import { queryClient } from "./queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/board" element={<Board />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<AdminSettings />} />
          <Route path="/directory" element={<ContactsDirectory />} />
          <Route path="/dashboard" element={<KnowledgeDashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
