const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900/70 mt-8">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {/* Brand + small blurb */}
          <div className="space-y-2 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-yellow-400 flex items-center justify-center shadow-[0_0_16px_rgba(250,204,21,0.55)]">
                <div className="h-4 w-4 rounded-full border border-slate-900 bg-slate-950" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-100">
                  Shifty
                </span>
                <span className="text-[10px] text-slate-400">
                  Mini & heavy trucks on demand
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Simple, transparent truck bookings for homes, shops and
              businesses across Kashmir.
            </p>
          </div>

          {/* Columns: Legal + Help + Socials */}
          <div className="flex flex-1 flex-wrap gap-8 justify-start md:justify-end text-[11px] text-slate-300">
            {/* LEGAL */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-100">
                Legal
              </h3>
              <a href="/terms" className="block hover:text-yellow-300">
                Terms &amp; Conditions
              </a>
              <a href="/privacy" className="block hover:text-yellow-300">
                Privacy Policy
              </a>
              <a href="/cancellation" className="block hover:text-yellow-300">
                Cancellation &amp; Refund
              </a>
            </div>

            {/* HELP */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-100">
                Help
              </h3>
              <a href="/faqs" className="block hover:text-yellow-300">
                FAQs
              </a>
              <button
                onClick={() =>
                  window.open(
                    "https://wa.me/91XXXXXXXXXX?text=Hi%20Shifty%2C%20I%20need%20help",
                    "_blank"
                  )
                }
                className="block text-left hover:text-yellow-300"
              >
                Support &amp; help centre
              </button>
              <a href="/safety" className="block hover:text-yellow-300">
                Safety &amp; guidelines
              </a>
            </div>

            {/* SOCIALS – replace hrefs when you have real profiles */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-slate-100">
                Connect
              </h3>
              <div className="flex items-center gap-3 text-slate-300">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="hover:text-yellow-300"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M13 22v-7h2.5a1 1 0 0 0 .98-.804l.5-3A1 1 0 0 0 16 10h-3V8c0-.552.448-1 1-1h2a1 1 0 0 0 1-1V4.25A1.25 1.25 0 0 0 15.75 3h-2.5A4.25 4.25 0 0 0 9 7.25V10H7a1 1 0 0 0-1 .96l.25 3a1 1 0 0 0 1 .94H9v7h4z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="hover:text-yellow-300"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5"
                      ry="5"
                    ></rect>
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M17.5 6.5h.01"></path>
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X"
                  className="hover:text-yellow-300"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4 4h3l4 6.5L15 4h5l-7 9 7 7h-5l-4-6.2L7 20H2l7-9z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="hover:text-yellow-300"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V23h-4V8zM8 8h3.8v2.1h.1C12.6 8.7 14 7.5 16.4 7.5 21 7.5 22 10.5 22 14.4V23h-4v-7.3c0-1.7 0-3.9-2.4-3.9-2.4 0-2.8 1.8-2.8 3.8V23H8V8z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-900/70 pt-3 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Shifty. All rights reserved.</span>
          <span className="max-w-md">
            Shifty connects customers and independent truck owners and does not
            operate vehicles itself. Please confirm load details, rates and
            documents directly with the driver before trip start.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
