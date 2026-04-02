// src/components/AppHeader.jsx
import { useState } from "react";

const AppHeader = ({ onPartnerClick, onBookClick, onScrollTo }) => {
  const [open, setOpen] = useState(false);

  const handleAndClose = (fn) => { fn(); setOpen(false); };

  const navLinks = [
    { label: "Services", id: "#services" },
    { label: "How it works", id: "#how" },
    { label: "About", id: "#about" },
    { label: "Contact", id: "#contact" },
  ];

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-xl sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.5)]">
          <span className="text-slate-950 font-black text-sm">S</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-extrabold text-white tracking-tight">Shifty</span>
          <span className="text-[10px] text-slate-500">Trusted trucks on tap</span>
        </div>
      </div>

      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-0.5">
        {navLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => onScrollTo(item.id)}
            className="px-3 py-1.5 text-[12px] text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            {item.label}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-800 mx-2" />
        <button
          onClick={onBookClick}
          className="px-5 py-2 rounded-full bg-yellow-400 text-slate-950 text-[12px] font-bold hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:scale-105 active:scale-95"
        >
          Book Now
        </button>
        <button
          onClick={onPartnerClick}
          className="ml-2 px-4 py-2 rounded-full border border-slate-700 text-[12px] text-slate-300 hover:border-yellow-400/40 hover:text-yellow-300 hover:bg-yellow-400/5 transition-all"
        >
          Partner
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-300"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-14 bg-slate-950/98 backdrop-blur-xl border-b border-slate-800 z-40 shadow-2xl">
          <div className="flex flex-col px-6 py-4 gap-0.5">
            {navLinks.map((item) => (
              <button
                key={item.label}
                onClick={() => handleAndClose(() => onScrollTo(item.id))}
                className="text-left py-2.5 text-sm text-slate-300 hover:text-yellow-300 border-b border-slate-800/40 last:border-0 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleAndClose(onBookClick)}
                className="flex-1 py-2.5 rounded-full bg-yellow-400 text-slate-950 text-sm font-bold"
              >
                Book Now
              </button>
              <button
                onClick={() => handleAndClose(onPartnerClick)}
                className="flex-1 py-2.5 rounded-full border border-slate-700 text-slate-200 text-sm"
              >
                Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;