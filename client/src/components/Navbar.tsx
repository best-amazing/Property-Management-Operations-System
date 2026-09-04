import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";
import { ActivityModal } from "./ActivityModal";
import { ActivityItem } from "../types/pmos";

export const Navbar: React.FC = () => {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  if (!token || location.pathname === "/login") return null;

  const openActivity = async () => {
    try {
      setActivityLoading(true);
      const items = await pmosApi.getActivity();
      setActivityItems(items);
      setActivityOpen(true);
    } catch { } finally {
      setActivityLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex space-x-6 items-center">
          <h1 className="text-xl font-bold">AB Investment Groups</h1>
          <Link to="/" className="hover:text-gray-300">Board</Link>
          <Link to="/history" className="hover:text-gray-300">History</Link>
        </div>
        <div className="flex space-x-4 items-center">
          <button onClick={openActivity} className="hover:text-gray-300">Activity</button>
          {(() => {
            try {
              const role = JSON.parse(atob(token.split(".")[1])).role;
              if (role === "admin") return <Link to="/admin" className="hover:text-gray-300">Admin Settings</Link>;
            } catch {}
            return null;
          })()}
          <button onClick={handleLogout} className="hover:text-gray-300">Logout</button>
        </div>
      </nav>
      <ActivityModal items={activityItems} setItems={setActivityItems} isOpen={activityOpen} loading={activityLoading} onClose={() => setActivityOpen(false)} />
    </>
  );
};
