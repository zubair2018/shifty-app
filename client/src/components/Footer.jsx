// src/components/Footer.jsx
const Footer = () => {
  const socials = [
    {
      label: "Facebook",
      href: "https://facebook.com",
      icon: <path d="M13 22v-7h2.5a1 1 0 0 0 .98-.804l.5-3A1 1 0 0 0 16 10h-3V8c0-.552.448-1 1-1h2a1 1 0 0 0 1-1V4.25A1.25 1.25 0 0 0 15.75 3h-2.5A4.25 4.25 0 0 0 9 7.25V10H7a1 1 0 0 0-1 .96l.25 3a1 1 0 0 0 1 .94H9v7h4z" />,
      fill: true,
    },
    {
      label: "Instagram",
      href: "https://instagram.com",
      icon: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
      fill: false,
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com",
      icon: <path d="M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V23h-4V8zM8 8h3.8v2.1h.1C12.6 8.7 14 7.5 16.4 7.5 21 7.5 22 10.5 22 14.4V23h-4v-7.3c0-1.7 0-3.9-2.4-3.9-2.4 0-2.8 1.8-2.8 3.8V23H8V8z" />,
      fill: true,
    },
  ];

  return (
    <footer className="bg-slate-950 border-t border-slate-800/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">

          {/* Brand */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                <span className="text-slate-950 font-black text-sm">S</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-white">Shifty</span>
                <span className="text-[10px] text-slate-500">Mini & heavy trucks on demand</span>
              </div>
            </div>
            <p className="text-[12px] text-slate-400 max-w-xs leading-relaxed">
              Simple, transparent truck bookings for homes, shops and businesses
              across Kashmir. Verified drivers. No hidden fees.
            </p>
            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 hover:text-yellow-300 hover:border-yellow-400/30 transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={s.fill ? "currentColor" : "none"} stroke={s.fill ? "none" : "currentColor"} strokeWidth="1.6">
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Legal</h3>
            {["Terms & Conditions", "Privacy Policy", "Cancellation & Refund"].map((item) => (
              <a key={item} href="#" className="block text-[12px] text-slate-500 hover:text-yellow-300 transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* Help */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Help</h3>
            {["FAQs", "Support & help centre", "Safety & guidelines", "Partner with us"].map((item) => (
              <a key={item} href="#" className="block text-[12px] text-slate-500 hover:text-yellow-300 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-6 border-t border-slate-800/40">
          <span className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} Shifty Technologies. All rights reserved.
          </span>
          <span className="text-[11px] text-slate-700 max-w-md text-right leading-relaxed">
            Shifty connects customers and independent truck owners and does not
            operate vehicles itself. Confirm load details directly with the
            driver before trip start.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;