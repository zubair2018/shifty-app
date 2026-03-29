// src/App.jsx
import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Services from "./components/Services";
import WhyShifty from "./components/WhyShifty";
import TruckOwners from "./components/TruckOwners";
import AppDownload from "./components/AppDownload";
import AboutSection from "./components/AboutSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import BookingModal from "./components/BookingModal";
import PartnerModal from "./components/PartnerModal";
//import Plans from "./components/Plans";
import AdminPage from "./AdminPage";
import DriverPage from "./DriverPage";
import DriverLoginPage from "./DriverLoginPage";
import DriverAuthGuard from "./DriverAuthGuard";

// Main landing page layout (your existing homepage)
function MainLanding() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isPartnerOpen, setIsPartnerOpen] = useState(false);

  const scrollTo = (id) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex flex-col min-h-screen">
        <AppHeader
          onPartnerClick={() => setIsPartnerOpen(true)}
          onBookClick={() => setIsBookingOpen(true)}
          onScrollTo={scrollTo}
        />

        <main className="flex-1 overflow-y-auto pb-16">
          <Hero onBookClick={() => setIsBookingOpen(true)} />
          <HowItWorks />
          <Services />
          <WhyShifty />
          {/* <Plans /> */}
          <TruckOwners onPartnerClick={() => setIsPartnerOpen(true)} />
          <AppDownload />
          <AboutSection />
          <ContactSection />
          <Footer />
        </main>

        <BottomNav
          onBookClick={() => setIsBookingOpen(true)}
          onPartnerClick={() => setIsPartnerOpen(true)}
          onScrollTo={scrollTo}
        />

        {isBookingOpen && (
          <BookingModal onClose={() => setIsBookingOpen(false)} />
        )}
        {isPartnerOpen && (
          <PartnerModal onClose={() => setIsPartnerOpen(false)} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Home / landing */}
      <Route path="/" element={<MainLanding />} />

      {/* Admin page */}
      <Route path="/admin" element={<AdminPage />} />

      {/* Driver login page */}
      <Route path="/driver/login" element={<DriverLoginPage />} />

      {/* Driver dashboard - protected */}
      <Route
        path="/driver"
        element={
          <DriverAuthGuard>
            <DriverPage />
          </DriverAuthGuard>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<MainLanding />} />
    </Routes>
  );
}

export default App;