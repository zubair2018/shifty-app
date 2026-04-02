// src/components/ContactSection.jsx
const ContactSection = () => {
  const contacts = [
    {
      icon: "💬",
      label: "WhatsApp",
      value: "+91-8082533183",
      sub: "Fastest response — usually under 5 minutes",
      color: "from-emerald-500/10 to-transparent",
      border: "border-emerald-500/15",
      action: () => window.open("https://wa.me/918082533183", "_blank"),
      cta: "Chat on WhatsApp →",
      ctaColor: "text-emerald-400",
    },
    {
      icon: "📧",
      label: "Email",
      value: "shiftytechnologies@gmail.com",
      sub: "For formal queries and business partnerships",
      color: "from-blue-500/10 to-transparent",
      border: "border-blue-500/15",
      action: () => window.open("mailto:shiftytechnologies@gmail.com", "_blank"),
      cta: "Send an email →",
      ctaColor: "text-blue-400",
    },
  ];

  return (
    <section id="contact" className="relative bg-slate-950 py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(59,130,246,0.03),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header — LEFT */}
        <div className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="text-[11px] text-blue-300 font-semibold tracking-widest uppercase">Contact</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
            Get in touch{" "}
            <span className="text-yellow-400">anytime</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Reach us on WhatsApp or email for bookings, partnership queries, or any help. We respond fast.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {contacts.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl bg-gradient-to-b ${c.color} border ${c.border} p-6 flex flex-col hover:scale-[1.02] transition-all duration-300 cursor-pointer group`}
              onClick={c.action}
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-1">{c.label}</div>
              <div className="text-white font-bold text-sm mb-2 break-all">{c.value}</div>
              <div className="text-[12px] text-slate-500 mb-4 leading-relaxed">{c.sub}</div>
              <span className={`text-sm font-semibold ${c.ctaColor} mt-auto group-hover:translate-x-1 transition-transform inline-block`}>
                {c.cta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;