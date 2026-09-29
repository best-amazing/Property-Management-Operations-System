import React, { useEffect, useState } from "react";
import { pmosApi } from "../services/pmosApi";
import { Navbar } from "../components/Navbar";

export const KnowledgeDashboard: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);

  useEffect(() => {
    // We would use useQuery in production, doing a raw fetch here for speed
    const fetchDashboard = async () => {
      try {
        const data = await pmosApi.request<any[]>("/client/dashboard/policies");
        setCategories(data);
      } catch (e) {
        console.error("Failed to fetch dashboard policies", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="pmos-page">
      <Navbar />

      <div className="pmos-kb-layout">
        {/* Sidebar for Categories */}
        <div className="pmos-kb-side">
          <div className="pmos-kb-side-title">Knowledge base</div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="pmos-skel" style={{ width: "72%" }} />
              <div className="pmos-skel" style={{ width: "58%" }} />
              <div className="pmos-skel" style={{ width: "65%" }} />
            </div>
          ) : (
            <>
              {categories.map((cat) => (
                <div className="pmos-kb-group" key={cat.id}>
                  <div className="lbl">{cat.name}</div>
                  {cat.policies.map((policy: any) => (
                    <button
                      key={policy.id}
                      onClick={() => setSelectedPolicy(policy)}
                      className={`pmos-kb-item ${selectedPolicy?.id === policy.id ? "active" : ""}`}
                    >
                      {policy.title}
                    </button>
                  ))}
                </div>
              ))}
              {categories.length === 0 && <div className="pmos-empty">No policies published yet.</div>}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="pmos-kb-main">
          {selectedPolicy ? (
            <div className="pmos-doc">
              <h1>{selectedPolicy.title}</h1>
              <div className="meta">
                <span className="pmos-chip">{selectedPolicy.category?.name || "Documentation"}</span>
                <span>Last updated: {new Date(selectedPolicy.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="body">{selectedPolicy.content}</div>
            </div>
          ) : (
            <div className="pmos-empty" style={{ paddingTop: 80 }}>
              <svg width="52" height="52" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: "var(--line)", marginBottom: 10 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                Property management documentation
              </div>
              <div style={{ fontSize: 12.5 }}>Select a policy or procedure from the sidebar to view its details.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
