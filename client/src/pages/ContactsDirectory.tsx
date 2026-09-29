import React, { useEffect, useState } from "react";
import { pmosApi } from "../services/pmosApi";
import { Contact } from "../types/pmos";
import { Navbar } from "../components/Navbar";

export const ContactsDirectory: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await pmosApi.getContacts();
        setContacts(data);
      } catch (e) {
        console.error("Failed to fetch contacts", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  // Derive unique filter options from loaded contacts
  const cities = [...new Set(contacts.map(c => c.city).filter(Boolean))] as string[];
  const states = [...new Set(contacts.map(c => c.state).filter(Boolean))] as string[];
  const types = [...new Set(contacts.map(c => c.contact_type?.name).filter(Boolean))] as string[];

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchesCity = !filterCity || c.city === filterCity;
    const matchesState = !filterState || c.state === filterState;
    const matchesType = !filterType || c.contact_type?.name === filterType;
    return matchesSearch && matchesCity && matchesState && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contact Directory</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Name, email, phone…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Type</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(search || filterCity || filterState || filterType) && (
            <button className="text-sm text-indigo-600 hover:underline whitespace-nowrap" onClick={() => { setSearch(""); setFilterCity(""); setFilterState(""); setFilterType(""); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Contact List */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading contacts…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No contacts found.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">City / State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedContact(contact)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium">
                        {contact.contact_type?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{contact.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{contact.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{[contact.city, contact.state].filter(Boolean).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Contact Detail Drawer */}
        {selectedContact && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedContact(null)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{selectedContact.name}</h2>
                  <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="space-y-4 text-sm">
                  <div><span className="font-medium text-gray-500">Type:</span> <span className="ml-2">{selectedContact.contact_type?.name || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">Phone:</span> <span className="ml-2">{selectedContact.phone || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">Email:</span> <span className="ml-2">{selectedContact.email || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">Mailing Address:</span> <span className="ml-2">{selectedContact.mailing_address || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">City:</span> <span className="ml-2">{selectedContact.city || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">State:</span> <span className="ml-2">{selectedContact.state || "—"}</span></div>
                  <div><span className="font-medium text-gray-500">ZIP:</span> <span className="ml-2">{selectedContact.zip || "—"}</span></div>
                  {selectedContact.notes && (
                    <div>
                      <span className="font-medium text-gray-500">Notes:</span>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{selectedContact.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
