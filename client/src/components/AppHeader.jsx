// src/components/AppHeader.jsx
import { useState } from "react";

const AppHeader = ({ onPartnerClick, onBookClick, onScrollTo }) => {
  const [open, setOpen] = useState(false);

  const handleAndClose = (fn) => {
    fn();
    setOpen(false);
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
      {/* Logo and title */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-yellow-400 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.6)]">
          <div className="relative h-5 w-5">
            <div className="absolute inset-0 rounded-full bg-slate-950" />
            <div className="absolute inset-1 rounded-full border-2 border-slate-700 border-dashed" />
          </div>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Shify</span>
          <span className="text-[10px] text-slate-400">
            Trusted trucks on tap
          </span>
        </div>
      </div>

      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-300">
        <button
          onClick={() => onScrollTo("#services")}
          className="hover:text-yellow-300"
        >
          Services
        </button>
        <button
          onClick={() => onScrollTo("#about")}
          className="hover:text-yellow-300"
        >
          About
        </button>
        <button
          onClick={() => onScrollTo("#contact")}
          className="hover:text-yellow-300"
        >
          Contact
        </button>
        <button
          onClick={onBookClick}
          className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-200 hover:border-yellow-300 hover:text-yellow-300"
        >
          Book
        </button>
        <button
          onClick={onPartnerClick}
          className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-200 hover:border-yellow-300 hover:text-yellow-300"
        >
          Partner
        </button>
      </div>

      {/* Mobile hamburger */}
      <div className="sm:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-md border border-slate-700 text-slate-200"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-14 bg-slate-950/95 border-b border-slate-800 shadow-lg z-40">
          <div className="flex flex-col px-4 py-3 gap-2 text-[12px] text-slate-100">
            <button
              className="text-left hover:text-yellow-300"
              onClick={() =>
                handleAndClose(() => {
                  onScrollTo("#services");
                })
              }
            >
              Services
            </button>
            <button
              className="text-left hover:text-yellow-300"
              onClick={() =>
                handleAndClose(() => {
                  onScrollTo("#about");
                })
              }
            >
              About
            </button>
            <button
              className="text-left hover:text-yellow-300"
              onClick={() =>
                handleAndClose(() => {
                  onScrollTo("#contact");
                })
              }
            >
              Contact
            </button>
            <button
              className="text-left hover:text-yellow-300"
              onClick={() =>
                handleAndClose(() => {
                  onBookClick();
                })
              }
            >
              Book a truck
            </button>
            <button
              className="text-left hover:text-yellow-300"
              onClick={() =>
                handleAndClose(() => {
                  onPartnerClick();
                })
              }
            >
              Partner with Shifty
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
