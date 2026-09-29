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

  const hasFilters = !!(search || filterCity || filterState || filterType);

  const clearFilters = () => {
    setSearch("");
    setFilterCity("");
    setFilterState("");
    setFilterType("");
  };

  return (
    <div className="pmos-page">
      <Navbar />
      <div className="pmos-page-body">
        <div className="pmos-page-head">
          <div>
            <div className="pmos-page-title">Contact directory</div>
            <div className="pmos-page-sub">
              {loading ? "Loading contacts…" : `${filtered.length} of ${contacts.length} contacts`}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pmos-filter-bar">
          <div className="pmos-field grow">
            <label htmlFor="dir-search">Search</label>
            <input
              id="dir-search"
              placeholder="Name, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-city">City</label>
            <select id="dir-city" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-state">State</label>
            <select id="dir-state" value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-type">Contact type</label>
            <select id="dir-type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button className="pmos-filter-clear" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        {/* Contact list */}
        {loading ? (
          <div className="pmos-table" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="pmos-skel" style={{ width: "40%" }} />
            <div className="pmos-skel" style={{ width: "65%" }} />
            <div className="pmos-skel" style={{ width: "52%" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pmos-table" style={{ padding: 14 }}>
            <div className="pmos-empty">No contacts found.</div>
          </div>
        ) : (
          <table className="pmos-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City / State</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(contact => (
                <tr key={contact.id} onClick={() => setSelectedContact(contact)}>
                  <td style={{ fontWeight: 600 }}>{contact.name}</td>
                  <td>
                    {contact.contact_type?.name
                      ? <span className="pmos-chip">{contact.contact_type.name}</span>
                      : "—"}
                  </td>
                  <td style={{ color: "var(--ink-soft)" }}>{contact.phone || "—"}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{contact.email || "—"}</td>
                  <td style={{ color: "var(--ink-soft)" }}>
                    {[contact.city, contact.state].filter(Boolean).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contact Detail Drawer */}
      <div className={`pmos-overlay ${selectedContact ? "show" : ""}`} onClick={() => setSelectedContact(null)} />
      <div className={`pmos-drawer ${selectedContact ? "show" : ""}`} aria-hidden={!selectedContact}>
        {selectedContact && (
          <>
            <div className="pmos-drawer-head">
              <div>
                <h3>{selectedContact.name}</h3>
                <div className="sub">{selectedContact.contact_type?.name || "Contact"}</div>
              </div>
              <button className="pmos-x" aria-label="Close contact" onClick={() => setSelectedContact(null)}>&times;</button>
            </div>
            <div className="pmos-drawer-body">
              <div className="pmos-detail">
                <div className="pmos-detail-row"><span className="k">Type</span><span className="v">{selectedContact.contact_type?.name || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">Phone</span><span className="v">{selectedContact.phone || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">Email</span><span className="v">{selectedContact.email || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">Mailing address</span><span className="v">{selectedContact.mailing_address || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">City</span><span className="v">{selectedContact.city || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">State</span><span className="v">{selectedContact.state || "—"}</span></div>
                <div className="pmos-detail-row"><span className="k">ZIP</span><span className="v">{selectedContact.zip || "—"}</span></div>
                {selectedContact.notes && (
                  <div className="pmos-detail-row"><span className="k">Notes</span><span className="v">{selectedContact.notes}</span></div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
