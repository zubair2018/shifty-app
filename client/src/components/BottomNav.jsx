// src/components/BottomNav.jsx
const BottomNav = ({ onBookClick, onScrollTo }) => {
  const items = [
    { icon: "🏠", label: "Home", action: () => onScrollTo("#top") },
    { icon: "🚚", label: "Services", action: () => onScrollTo("#services") },
    { icon: "📦", label: "Book", action: onBookClick, highlight: true },
    { icon: "ℹ️", label: "About", action: () => onScrollTo("#about") },
    { icon: "📞", label: "Contact", action: () => onScrollTo("#contact") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800/50 bg-slate-950/98 backdrop-blur-xl">
      <div className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              item.highlight
                ? "bg-yellow-400/15 border border-yellow-400/20"
                : "hover:bg-slate-800/60"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className={`text-[10px] font-medium leading-none ${
              item.highlight ? "text-yellow-300" : "text-slate-500"
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;