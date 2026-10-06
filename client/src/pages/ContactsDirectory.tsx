import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { pmosApi } from "../services/pmosApi";
import { Contact, ContactFilters } from "../types/pmos";
import { Navbar } from "../components/Navbar";
import { ContactEditModal } from "../components/ContactEditModal";
import { ContactBulkEditModal } from "../components/ContactBulkEditModal";
import { QUERY_KEYS, useMe } from "../hooks/useApi";

export const ContactsDirectory: React.FC = () => {
  const navigate = useNavigate();
  // Send logged-out visitors to the login page
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterZip, setFilterZip] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  // Admins can edit contacts one at a time, or tick several and bulk edit
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = me?.role === "admin";
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditing, setBulkEditing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filtering happens server-side so the directory scales with the database
  const filters: ContactFilters = {
    search: debouncedSearch, city: filterCity, state: filterState, zip: filterZip,
    type_id: filterType, property_id: filterProperty,
  };
  const { data: contacts = [], isLoading: loading, isFetching } = useQuery({
    queryKey: ["directoryContacts", filters],
    queryFn: () => pmosApi.getContacts(filters),
    placeholderData: prev => prev,
  });
  // Dropdown options come from the data itself, so new cities/states/types appear automatically
  const { data: options } = useQuery({
    queryKey: ["directoryFilterOptions"],
    queryFn: pmosApi.getContactFilterOptions,
    staleTime: 60 * 1000,
  });

  const refreshContacts = () => {
    qc.invalidateQueries({ queryKey: ["directoryContacts"] });
    qc.invalidateQueries({ queryKey: ["directoryFilterOptions"] });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
  };

  const toggleSelected = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allVisibleSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id));
  const toggleAllVisible = () => setSelectedIds(prev => {
    const next = new Set(prev);
    contacts.forEach(c => (allVisibleSelected ? next.delete(c.id) : next.add(c.id)));
    return next;
  });

  const hasFilters = !!(search || filterCity || filterState || filterZip || filterType || filterProperty);

  const clearFilters = () => {
    setSearch("");
    setFilterCity("");
    setFilterState("");
    setFilterZip("");
    setFilterType("");
    setFilterProperty("");
  };

  return (
    <div className="pmos-page">
      <Navbar />
      <div className="pmos-page-body">
        <div className="pmos-page-head">
          <div>
            <div className="pmos-page-title">Contact directory</div>
            <div className="pmos-page-sub">
              {loading ? "Loading contacts…" : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}${hasFilters ? " match" : ""}${isFetching ? " · updating…" : ""}`}
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
              {options?.cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-state">State</label>
            <select id="dir-state" value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="">All States</option>
              {options?.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-zip">ZIP</label>
            <select id="dir-zip" value={filterZip} onChange={e => setFilterZip(e.target.value)}>
              <option value="">All ZIPs</option>
              {options?.zips.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-type">Contact type</label>
            <select id="dir-type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {options?.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="pmos-field narrow">
            <label htmlFor="dir-property">Property</label>
            <select id="dir-property" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
              <option value="">All Properties</option>
              {options?.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button className="pmos-filter-clear" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        {isAdmin && selectedIds.size > 0 && (
          <div className="pmos-bulk-bar">
            <span>{selectedIds.size} selected</span>
            <button className="pmos-btn primary sm" onClick={() => setBulkEditing(true)}>Edit selected</button>
            <button className="pmos-btn sm" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
          </div>
        )}

        {/* Contact list */}
        {loading ? (
          <div className="pmos-table" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="pmos-skel" style={{ width: "40%" }} />
            <div className="pmos-skel" style={{ width: "65%" }} />
            <div className="pmos-skel" style={{ width: "52%" }} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="pmos-table" style={{ padding: 14 }}>
            <div className="pmos-empty">No contacts found.</div>
          </div>
        ) : (
          <div className="pmos-table-scroll">
            <table className="pmos-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 34 }}>
                      <input type="checkbox" aria-label="Select all shown contacts" checked={allVisibleSelected} onChange={toggleAllVisible} />
                    </th>
                  )}
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>City / State</th>
                  <th>Properties</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(contact => (
                  <tr key={contact.id} onClick={() => setSelectedContact(contact)}>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${contact.name}`} checked={selectedIds.has(contact.id)} onChange={() => toggleSelected(contact.id)} />
                      </td>
                    )}
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
                    <td style={{ color: "var(--ink-soft)" }}>
                      {(contact.properties ?? []).map(p => p.property?.name).filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isAdmin && (
                  <button className="pmos-btn sm" onClick={() => { setEditingContact(selectedContact); setSelectedContact(null); }}>Edit</button>
                )}
                <button className="pmos-x" aria-label="Close contact" onClick={() => setSelectedContact(null)}>&times;</button>
              </div>
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
                <div className="pmos-detail-row">
                  <span className="k">Properties</span>
                  <span className="v">{(selectedContact.properties ?? []).map(p => p.property?.name).filter(Boolean).join(", ") || "—"}</span>
                </div>
                {selectedContact.notes && (
                  <div className="pmos-detail-row"><span className="k">Notes</span><span className="v">{selectedContact.notes}</span></div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {editingContact && options && (
        <ContactEditModal
          contact={editingContact}
          contactTypes={options.types}
          properties={options.properties}
          cities={options.cities}
          states={options.states}
          onClose={() => setEditingContact(null)}
          onSaved={() => { setEditingContact(null); refreshContacts(); }}
        />
      )}
      {bulkEditing && options && (
        <ContactBulkEditModal
          ids={[...selectedIds]}
          contactTypes={options.types}
          properties={options.properties}
          cities={options.cities}
          states={options.states}
          onClose={() => setBulkEditing(false)}
          onSaved={() => { setBulkEditing(false); setSelectedIds(new Set()); refreshContacts(); }}
        />
      )}
    </div>
  );
};
