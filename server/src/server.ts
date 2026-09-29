// Force IPv4 DNS resolution globally — must be BEFORE all other imports.
// Many cloud hosts (Render, Railway, etc.) lack outbound IPv6, causing
// ENETUNREACH when Node tries IPv6-first for services like Gmail SMTP.
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app";
import { createServer } from "http";
import { initSocket } from "./socket";

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
