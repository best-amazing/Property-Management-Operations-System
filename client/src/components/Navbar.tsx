import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";
import { ActivityModal } from "./ActivityModal";
import { ActivityItem } from "../types/pmos";
import { AnnouncementsBell } from "./AnnouncementsBell";
import { avatarSwatch, initials } from "../utils/ui";
import { useMe } from "../hooks/useApi";

export const Navbar: React.FC = () => {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: me } = useMe();

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

  const sw = me ? avatarSwatch(me.display_name) : null;

  return (
    <>
      <div className="pmos-topbar">
        <div className="pmos-title-row">
          <div className="pmos-title">AB Investment Groups</div>
          <div className="pmos-nav-links">
            <Link to="/board" className="pmos-btn sm">Board</Link>
            <Link to="/history" className="pmos-btn sm">History</Link>
            <Link to="/directory" className="pmos-btn sm">Directory</Link>
            <Link to="/dashboard" className="pmos-btn sm">Knowledge Base</Link>
          </div>
          <div className="pmos-right-cluster">
            <div className="pmos-actions">
              <AnnouncementsBell />
              <button className="pmos-btn" onClick={openActivity}>Activity</button>
              {me?.role === "admin" && (
                <button className="pmos-btn" onClick={() => navigate("/admin")}>Admin settings</button>
              )}
              {me?.role === "team_lead" && (
                <button className="pmos-btn" onClick={() => navigate("/admin")}>Post announcement</button>
              )}
            </div>
            {me && (
              <div className="pmos-user-pill">
                <span className="pmos-avatar" style={{ width: 26, height: 26, fontSize: 11, background: sw?.color }}>
                  {initials(me.display_name)}
                </span>
                <span className="name">{me.display_name}</span>
                <span className={`pmos-role-badge ${me.role}`}>{me.role}</span>
              </div>
            )}
            <button className="pmos-btn sm" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </div>
      <ActivityModal items={activityItems} setItems={setActivityItems} isOpen={activityOpen} loading={activityLoading} onClose={() => setActivityOpen(false)} />
    </>
  );
};
