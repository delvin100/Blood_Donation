import React, { useEffect, useState } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      // Show button after scrolling down 300px
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 right-9 z-[9990] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 transform hover:scale-110 focus:outline-none 
      bg-gradient-to-br from-red-600 to-pink-600 text-white border-none group overflow-hidden
        ${visible ? 'translate-y-0 opacity-100 pointer-events-auto shadow-red-500/30 hover:shadow-red-500/50' : 'translate-y-10 opacity-0 pointer-events-none'}`}
      aria-label="Back to top"
      title="Back to top"
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
      <i className="fas fa-chevron-up text-lg relative z-10 group-hover:-translate-y-0.5 transition-transform duration-300"></i>
    </button>
  );
}
