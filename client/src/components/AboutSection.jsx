// src/components/AboutShifty.jsx
const AboutShifty = () => {
  return (
    <section className="w-full bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-4">
          About Shifty
        </h2>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed">
          Shifty is a modern platform that makes booking trucks for house moves,
          office shifts, and goods transport simple and transparent. We connect
          customers with reliable truck owners, handle the coordination, and
          keep everyone updated at every step.
        </p>

        <p className="mt-3 text-sm md:text-base text-slate-300 leading-relaxed">
          Whether you are moving a single room or an entire office, Shifty helps
          you find the right vehicle, track timings, and avoid last‑minute
          surprises. Our goal is to bring clarity, fair pricing, and professional
          service to local shifting so you can focus on what matters instead of
          worrying about logistics.
        </p>
      </div>
    </section>
  );
};

export default AboutShifty;
