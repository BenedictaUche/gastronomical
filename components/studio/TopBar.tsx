"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Leaf, Menu, X } from "lucide-react";
import { DEFAULT_MODEL_ID, MODELS, modelLabel, packSize } from "@/lib/studio";
import type { ResearchPack } from "@/lib/studio";

export type StudioView = "home" | "workspace" | "saved" | "plan";

type TopBarProps = {
  view: StudioView;
  onNavigate: (view: StudioView) => void;
  model: string;
  onModelChange: (id: string) => void;
  pack: ResearchPack;
  onOpenPack: () => void;
  hasSession: boolean;
};

export function TopBar({
  view,
  onNavigate,
  model,
  onModelChange,
  pack,
  onOpenPack,
  hasSession,
}: TopBarProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const count = packSize(pack);

  useEffect(() => {
    if (!modelOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!modelRef.current?.contains(event.target as Node)) setModelOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [modelOpen]);

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
            Research
          </button>
          <button
            className={view === "saved" ? "nav-link nav-active" : "nav-link"}
            onClick={() => go("saved")}
          >
            Saved sessions
          </button>
          <button
            className={view === "plan" ? "nav-link nav-active" : "nav-link"}
            onClick={() => go("plan")}
          >
            Plan a carousel
          </button>
        </nav>

        <div className="topbar-actions">
          <div className="model-picker" ref={modelRef}>
            <button
              className="model-trigger"
              onClick={() => setModelOpen((open) => !open)}
              aria-expanded={modelOpen}
              aria-haspopup="listbox"
            >
              <span className="model-dot" aria-hidden="true" />
              <span className="model-trigger-label">{modelLabel(model)}</span>
              <ChevronDown size={14} />
            </button>
            {modelOpen && (
              <div className="model-menu" role="listbox" aria-label="Research model">
                <p className="eyebrow">Synthesis model</p>
                {MODELS.map((option) => (
                  <button
                    key={option.id}
                    role="option"
                    aria-selected={model === option.id}
                    disabled={!option.available}
                    className={
                      model === option.id ? "model-option model-option-selected" : "model-option"
                    }
                    onClick={() => {
                      if (!option.available) return;
                      onModelChange(option.id);
                      setModelOpen(false);
                    }}
                  >
                    <span>
                      <strong>{option.name}</strong>
                      <small>{option.description}</small>
                    </span>
                    {model === option.id && <Check size={15} />}
                  </button>
                ))}
                <p className="model-note">
                  Only models marked active are wired up for synthesis right now.
                </p>
              </div>
            )}
          </div>

          <button className="pack-trigger" onClick={onOpenPack}>
            <span className="pack-trigger-label">Research pack</span>
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
            Research
          </button>
          <button className="mobile-nav-link" onClick={() => go("saved")}>
            Saved sessions
          </button>
          <button className="mobile-nav-link" onClick={() => go("plan")}>
            Plan a carousel
          </button>
          <button
            className="mobile-nav-link"
            onClick={() => {
              setMenuOpen(false);
              onOpenPack();
            }}
          >
            Research pack ({count})
          </button>
          <p className="mobile-nav-note">
            Model: {modelLabel(model)}
            {model === DEFAULT_MODEL_ID ? "" : " (unavailable)"}
          </p>
        </nav>
      )}
    </header>
  );
}