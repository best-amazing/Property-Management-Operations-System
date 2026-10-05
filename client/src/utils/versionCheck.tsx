import toast from "react-hot-toast";

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Open tabs keep running the code they loaded with, so after a deploy they'd
// stay on the old version until someone refreshed. Poll /version.json (and
// check whenever the tab regains focus) and offer a reload once it changes.
export function startVersionCheck(): void {
  if (!import.meta.env.PROD) return;

  let notified = false;

  const check = async () => {
    if (notified) return;
    try {
      const res = await fetch("/version.json", { cache: "no-store" });
      if (!res.ok) return;
      const { version } = await res.json();
      if (version && version !== __APP_VERSION__) {
        notified = true;
        toast(
          (t) => (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              A new version of PMOS is available.
              <button className="pmos-btn primary sm" onClick={() => { toast.dismiss(t.id); window.location.reload(); }}>
                Reload
              </button>
            </span>
          ),
          { id: "new-version", duration: Infinity },
        );
      }
    } catch {
      // Offline or the request failed — try again next time
    }
  };

  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}
