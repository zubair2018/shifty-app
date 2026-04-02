// src/components/AboutSection.jsx
const AboutShifty = () => {
  const stats = [
    { value: "500+", label: "Verified drivers", icon: "🚛" },
    { value: "3", label: "Truck categories", icon: "📦" },
    { value: "24/7", label: "Support available", icon: "🕐" },
    { value: "₹0", label: "Hidden fees", icon: "✅" },
  ];

  return (
    <section id="about" className="relative bg-slate-950 py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(16,185,129,0.03),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-300 font-semibold tracking-widest uppercase">About Shifty</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
              Making freight simple{" "}
              <span className="text-yellow-400">for everyone</span>
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
              Shifty is a modern platform that makes booking trucks for house
              moves, office shifts, and goods transport simple and transparent.
              We connect customers with reliable truck owners, handle the
              coordination, and keep everyone updated at every step.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Whether you are moving a single room or an entire office, Shifty
              helps you find the right vehicle, track timings, and avoid
              last-minute surprises. Our goal is clarity, fair pricing, and
              professional service for everyone.
            </p>
          </div>

          {/* Right — Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-yellow-500/20 hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-black text-yellow-400 mb-0.5">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutShifty;