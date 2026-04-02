// src/components/AppDownload.jsx
const AppDownload = () => {
  return (
    <section id="download" className="relative bg-slate-950 py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(250,204,21,0.03),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/60 border border-slate-700/50 p-8 md:p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center gap-10">

            {/* Left */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/5 px-4 py-1.5 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[11px] text-yellow-300 font-semibold tracking-widest uppercase">Coming soon</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                Shifty on your phone,{" "}
                <span className="text-yellow-400">coming soon</span>
              </h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                Starting with a simple web interface and SMS coordination, then
                rolling out the full Android app for customers and drivers.
              </p>
              <button className="px-6 py-3 rounded-full border border-yellow-400/30 bg-yellow-400/8 text-yellow-300 text-sm font-bold hover:bg-yellow-400/15 transition-all hover:scale-105">
                Get early access →
              </button>
              <p className="text-[11px] text-slate-600 mt-3">
                Share your number in the booking form and we'll notify you when ready.
              </p>
            </div>

            {/* Right */}
            <div className="flex-1 w-full max-w-xs mx-auto">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-700/60 p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Driver app preview</span>
                  <span className="rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[10px] font-semibold px-2.5 py-0.5">
                    Android
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: "🟢", text: "Go online/offline instantly", sub: "Control your availability" },
                    { icon: "📍", text: "See nearby loads on map", sub: "Matched to your area" },
                    { icon: "✅", text: "Accept trips with one tap", sub: "First come, first served" },
                    { icon: "📊", text: "Track your earnings daily", sub: "Real-time income dashboard" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="text-sm text-white font-medium leading-tight">{item.text}</div>
                        <div className="text-[11px] text-slate-500">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownload;