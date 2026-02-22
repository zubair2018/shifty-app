// src/components/ContactSection.jsx
const ContactSection = () => {
  return (
    <section
      id="contact"
      className="bg-slate-950 border-t border-slate-900/60 py-10 md:py-14"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-xl md:text-2xl font-semibold text-slate-50 mb-2">
          Contact
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-md mb-4">
          For now, we keep it simple. Reach us on WhatsApp or phone and we&apos;ll
          help you with bookings or partnership queries.
        </p>

        <div className="space-y-2 text-xs md:text-sm text-slate-300">
          <p>
            WhatsApp:{" "}
            <span className="text-yellow-300">
              +91-808253xxxx
            </span>
          </p>
          <p>
            Email:{" "}
            <span className="text-yellow-300">
              shiftytechnologies@gmail.com
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            Soon you&apos;ll be able to manage everything inside the Shifty
            app. For now, this is our direct line.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
