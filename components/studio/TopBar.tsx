"use client";

import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { packSize } from "@/lib/studio";
import type { ResearchPack } from "@/lib/studio";

export type StudioView = "home" | "workspace" | "saved" | "plan";

type TopBarProps = {
  view: StudioView;
  onNavigate: (view: StudioView) => void;
  pack: ResearchPack;
  onOpenPack: () => void;
  hasSession: boolean;
};

export function TopBar({ view, onNavigate, pack, onOpenPack, hasSession }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = packSize(pack);

  const go = (next: StudioView) => {
    setMenuOpen(false);
    onNavigate(next);
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => go("home")} aria-label="Gastronomical home">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={15} />
          </span>
          <span className="brand-name">Gastronomical</span>
        </button>

        <nav className="main-nav" aria-label="Studio sections">
          <button
            className={view === "home" || view === "workspace" ? "nav-link nav-active" : "nav-link"}
            onClick={() => go(hasSession && view !== "workspace" ? "workspace" : "home")}
          >
            Create
          </button>
          <button
            className={view === "saved" ? "nav-link nav-active" : "nav-link"}
            onClick={() => go("saved")}
          >
            Your projects
          </button>
          <button
            className={view === "plan" ? "nav-link nav-active" : "nav-link"}
            onClick={() => go("plan")}
          >
            Carousel
          </button>
        </nav>

        <div className="topbar-actions">
          <button className="pack-trigger" onClick={onOpenPack}>
            <span className="pack-trigger-label">Content pack</span>
            <span className="pack-count">{count}</span>
          </button>

          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Studio sections">
          <button className="mobile-nav-link" onClick={() => go("home")}>
            Create
          </button>
          <button className="mobile-nav-link" onClick={() => go("saved")}>
            Your projects
          </button>
          <button className="mobile-nav-link" onClick={() => go("plan")}>
            Carousel
          </button>
          <button
            className="mobile-nav-link"
            onClick={() => {
              setMenuOpen(false);
              onOpenPack();
            }}
          >
            Content pack ({count})
          </button>
        </nav>
      )}
    </header>
  );
}
