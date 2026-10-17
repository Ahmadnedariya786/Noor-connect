import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-base)" }}>
      <div className="text-center p-8 rounded-3xl border" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)" }}>
        <h1 className="mb-4 text-5xl font-bold" style={{ color: "var(--accent)" }}>404</h1>
        <p className="mb-6 text-xl font-medium" style={{ color: "var(--text-secondary)" }}>Oops! Page not found</p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          style={{ background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)", color: "var(--on-accent)" }}
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
