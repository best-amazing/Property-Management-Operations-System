import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";
import { ActivityModal } from "./ActivityModal";
import { ActivityItem } from "../types/pmos";

export const Navbar: React.FC = () => {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  if (!token || location.pathname === "/login") return null;

  const openActivity = async () => {
    try {
      const items = await pmosApi.getActivity();
      setActivityItems(items);
      setActivityOpen(true);
    } catch { }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex space-x-6 items-center">
          <h1 className="text-xl font-bold">PMOS</h1>
          <Link to="/" className="hover:text-gray-300">Board</Link>
          <Link to="/history" className="hover:text-gray-300">History</Link>
        </div>
        <div className="flex space-x-4 items-center">
          <button onClick={openActivity} className="hover:text-gray-300">Activity</button>
          <Link to="/admin" className="hover:text-gray-300">Admin Settings</Link>
          <button onClick={handleLogout} className="hover:text-gray-300">Logout</button>
        </div>
      </nav>
      <ActivityModal items={activityItems} isOpen={activityOpen} onClose={() => setActivityOpen(false)} />
    </>
  );
};
