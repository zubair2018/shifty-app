// src/components/Plans.jsx
const plans = [
  {
    name: "One-time move",
    price: "Per trip",
    highlight: false,
    badge: "For home shifting",
    icon: "🏠",
    features: [
      "Book once, pay once",
      "Best available truck matched",
      "Phone + SMS updates",
      "Direct driver contact",
    ],
    cta: "Book your move",
  },
  {
    name: "Growing business",
    price: "Custom pricing",
    highlight: true,
    badge: "Most popular",
    icon: "📈",
    features: [
      "Recurring moves every week",
      "Dedicated account manager",
      "Consolidated monthly invoicing",
      "Priority support during peak hours",
    ],
    cta: "Talk to sales",
  },
  {
    name: "Enterprise logistics",
    price: "Talk to us",
    highlight: false,
    badge: "High volume",
    icon: "🏭",
    features: [
      "Contracted rates across cities",
      "Route optimisation suggestions",
      "Detailed reports & analytics",
      "API integration available",
    ],
    cta: "Schedule a call",
  },
];

const Plans = () => {
  return (
    <section className="relative bg-slate-950 py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(250,204,21,0.03),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header — LEFT */}
        <div className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/5 px-4 py-1.5 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            <span className="text-[11px] text-yellow-300 font-semibold tracking-widest uppercase">Pricing</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
            Simple pricing,{" "}
            <span className="text-yellow-400">no surprises</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Whether you move goods once a year or every day, choose the level of service that fits your workload.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                plan.highlight
                  ? "bg-gradient-to-b from-yellow-500/10 to-yellow-500/0 border-yellow-400/30 shadow-[0_0_40px_rgba(250,204,21,0.1)]"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-yellow-400 text-slate-950 text-[10px] font-black px-3 py-0.5 whitespace-nowrap">
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                    plan.highlight
                      ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {plan.badge}
                  </span>
                  <span className="text-2xl">{plan.icon}</span>
                </div>

                <h3 className="text-lg font-black text-white mb-1">{plan.name}</h3>
                <p className={`text-sm font-bold mb-4 ${plan.highlight ? "text-yellow-400" : "text-slate-400"}`}>
                  {plan.price}
                </p>

                <ul className="space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${plan.highlight ? "bg-yellow-400" : "bg-slate-600"}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`mt-6 w-full rounded-full text-sm font-bold py-2.5 transition-all hover:scale-105 active:scale-95 ${
                  plan.highlight
                    ? "bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                    : "border border-slate-700 text-slate-300 hover:border-yellow-400/40 hover:text-yellow-300"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Plans;