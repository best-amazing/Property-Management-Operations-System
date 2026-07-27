import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "./pages/login";
import { Board } from "./pages/Board";
import { History } from "./pages/History";
import { AdminSettings } from "./pages/AdminSettings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Board />} />
        <Route path="/history" element={<History />} />
        <Route path="/admin" element={<AdminSettings />} />
      </Routes>
    </BrowserRouter>
  );
}
