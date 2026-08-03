// Force IPv4 DNS resolution globally — must be BEFORE all other imports.
// Many cloud hosts (Render, Railway, etc.) lack outbound IPv6, causing
// ENETUNREACH when Node tries IPv6-first for services like Gmail SMTP.
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
