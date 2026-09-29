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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for Categories */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight mb-4">Knowledge Base</h2>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {cat.name}
                    </h3>
                    <ul className="space-y-1">
                      {cat.policies.map((policy: any) => (
                        <li key={policy.id}>
                          <button
                            onClick={() => setSelectedPolicy(policy)}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                              selectedPolicy?.id === policy.id
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {policy.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-8">
          {selectedPolicy ? (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{selectedPolicy.title}</h1>
              <div className="flex items-center text-sm text-gray-500 mb-8 border-b border-gray-100 pb-4">
                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium mr-3">
                  {selectedPolicy.category?.name || "Documentation"}
                </span>
                <span>Last updated: {new Date(selectedPolicy.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="prose prose-indigo max-w-none text-gray-700">
                {/* For now, just render text. If it's markdown, we'd use a renderer */}
                <div className="whitespace-pre-wrap">{selectedPolicy.content}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-xl font-medium text-gray-900 mb-2">Property Management Documentation</h2>
              <p className="max-w-sm">Select a policy or procedure from the sidebar to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
