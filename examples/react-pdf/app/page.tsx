"use client";

import { useState } from "react";
import { examples } from "@/lib/examples";

export default function Page() {
  const [selected, setSelected] = useState(examples[0]!.name);
  const [showSpec, setShowSpec] = useState(false);
  const example = examples.find((e) => e.name === selected)!;
  const pdfUrl = `/api/pdf?name=${selected}&t=${Date.now()}`;

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>json-render</h1>
        <p style={styles.subtitle}>React PDF Examples</p>
        <nav style={styles.nav}>
          {examples.map((ex) => (
            <button
              key={ex.name}
              onClick={() => setSelected(ex.name)}
              style={{
                ...styles.navItem,
                ...(ex.name === selected ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navLabel}>{ex.label}</span>
              <span style={styles.navDesc}>{ex.description}</span>
            </button>
          ))}
        </nav>

        <div style={styles.actions}>
          <a
            href={`/api/pdf?name=${selected}&download=1`}
            style={styles.downloadBtn}
          >
            Download PDF
          </a>
          <button
            onClick={() => setShowSpec((v) => !v)}
            style={styles.specToggle}
          >
            {showSpec ? "Hide" : "Show"} JSON Spec
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {showSpec ? (
          <div style={styles.specViewer}>
            <div style={styles.specHeader}>
              <h2 style={styles.specTitle}>{example.label} -- JSON Spec</h2>
              <button
                onClick={() => setShowSpec(false)}
                style={styles.specClose}
              >
                Close
              </button>
            </div>
            <pre style={styles.specCode}>
              {JSON.stringify(example.spec, null, 2)}
            </pre>
          </div>
        ) : (
          <iframe
            key={selected}
            src={pdfUrl}
            style={styles.iframe}
            title={`PDF preview: ${example.label}`}
          />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  sidebar: {
    width: 320,
    minWidth: 320,
    borderRight: "1px solid var(--border)",
    background: "var(--surface)",
    display: "flex",
    flexDirection: "column",
    padding: 24,
    gap: 4,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
    margin: 0,
    marginBottom: 16,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "transparent",
    textAlign: "left",
    fontSize: 13,
    transition: "all 0.15s",
    width: "100%",
  },
  navItemActive: {
    background: "var(--primary)",
    color: "#fff",
    borderColor: "var(--primary)",
  },
  navLabel: {
    fontWeight: 600,
    fontSize: 14,
  },
  navDesc: {
    fontSize: 11,
    opacity: 0.8,
    lineHeight: "1.3",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 16,
  },
  downloadBtn: {
    display: "block",
    textAlign: "center",
    padding: "10px 16px",
    background: "var(--primary)",
    color: "#fff",
    borderRadius: "var(--radius)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  specToggle: {
    padding: "10px 16px",
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: 13,
  },
  main: {
    flex: 1,
    background: "#525659",
    display: "flex",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  specViewer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
    overflow: "hidden",
  },
  specHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid var(--border)",
  },
  specTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  specClose: {
    padding: "6px 12px",
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  specCode: {
    flex: 1,
    overflow: "auto",
    padding: 24,
    margin: 0,
    fontSize: 12,
    lineHeight: "1.5",
    fontFamily: "var(--font-mono)",
    background: "#fafafa",
  },
};
