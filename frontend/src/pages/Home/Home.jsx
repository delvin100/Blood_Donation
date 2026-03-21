import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import BackToTop from "../../components/common/BackToTop";
import "../../assets/css/home.css";

export default function Home() {
  const [activeModal, setActiveModal] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Pre-warm the backend server (Render cold start)
    fetch("/api/health").catch(() => { });

    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        // Small timeout to ensure content is rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  const openModal = (e, type) => {
    e.preventDefault();
    setActiveModal(type);
  };

  const closeModal = () => setActiveModal(null);

  const getDonorRedirectPath = () => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    return token ? "/dashboard" : "/donor/login";
  };



  // Static content definition to avoid complexity
  const getModalContent = (type) => {
    switch (type) {
      case 'help':
        return {
          title: "Help Center",
          content: (
            <div className="space-y-4">
              <p>Welcome to the eBloodBank Help Center. Here are some guides to get you started:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>How to Donate:</strong> Register &gt; Find a Camp or Request &gt; Donate.</li>
                <li><strong>Finding Blood:</strong> Use the "Find Blood" search tool to locate donors nearby.</li>
                <li><strong>Certificates:</strong> You receive a certificate after every verified donation.</li>
              </ul>
            </div>
          )
        };
      case 'emergency':
        return {
          title: "Emergency Contacts",
          content: (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <i className="fas fa-ambulance text-4xl text-red-600 mb-2"></i>
                <h3 className="text-xl font-bold text-red-700">Medical Emergency</h3>
                <p className="text-3xl font-black text-gray-800 my-2">108</p>
                <p className="text-sm text-gray-500">Ambulance Service (India)</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <i className="fas fa-phone-alt text-4xl text-blue-600 mb-2"></i>
                <h3 className="text-xl font-bold text-blue-700">General Helpline</h3>
                <p className="text-3xl font-black text-gray-800 my-2">112</p>
                <p className="text-sm text-gray-500">National Emergency Number</p>
              </div>
            </div>
          )
        };
      case 'faq':
        return {
          title: "Frequently Asked Questions",
          content: (
            <div className="space-y-4">
              <details className="bg-gray-50 p-4 rounded-lg cursor-pointer group">
                <summary className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">Who can donate blood?</summary>
                <p className="mt-2 text-gray-600 text-sm">Anyone aged 18-65, weighing 45kg+, and in good health can donate.</p>
              </details>
              <details className="bg-gray-50 p-4 rounded-lg cursor-pointer group">
                <summary className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">How often can I donate?</summary>
                <p className="mt-2 text-gray-600 text-sm">Men can donate every 3 months, and women every 4 months.</p>
              </details>
              <details className="bg-gray-50 p-4 rounded-lg cursor-pointer group">
                <summary className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">Is it safe to donate?</summary>
                <p className="mt-2 text-gray-600 text-sm">Yes, absolutely. We use sterile, disposable equipment for every donation.</p>
              </details>
            </div>
          )
        };
      case 'contact':
        return {
          title: "Contact Us",
          content: (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:shadow-md transition-all">
                <i className="fas fa-envelope text-3xl text-gray-600 mb-2 group-hover:text-red-500 transition-colors"></i>
                <h3 className="text-lg font-bold text-gray-700">Email Support</h3>
                <a href="mailto:ebloodbankoriginal@gmail.com" className="text-xl font-semibold text-gray-800 my-2 block hover:text-red-600 truncate">
                  ebloodbankoriginal@gmail.com
                </a>
                <p className="text-sm text-gray-500">We usually reply within 24 hours</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:shadow-md transition-all">
                <i className="fas fa-phone-alt text-3xl text-gray-600 mb-2 group-hover:text-blue-500 transition-colors"></i>
                <h3 className="text-lg font-bold text-gray-700">Phone Support</h3>
                <a href="tel:+919876543210" className="text-xl font-semibold text-gray-800 my-2 block hover:text-blue-600">
                  +91-9876543210
                </a>
                <p className="text-sm text-gray-500">Available 24/7 for emergencies</p>
              </div>
            </div>
          )
        };
      default:
        return null;
    }
  };

  const modalData = activeModal ? getModalContent(activeModal) : null;

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <header className="gradient-bg text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="pulse-heart">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">eBloodBank</h1>
                <p className="text-red-100 text-sm">Connecting Donors, Saving Lives</p>
              </div>
            </div>
            <nav className="flex space-x-6" aria-label="Primary">
              <a href="#home" className="hover:text-red-200 transition-colors">Home</a>
              <Link to={getDonorRedirectPath()} className="hover:text-red-200 transition-colors">Donors</Link>
              <Link to="/seeker" className="hover:text-red-200 transition-colors">Seekers</Link>
              <a href="#mobile-app" className="hover:text-red-200 transition-colors">Mobile App</a>
              <a href="#aboutt" className="hover:text-red-200 transition-colors">About</a>
              <a href="#contact" className="hover:text-red-200 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      <main id="main-content" role="main">
        {/* Hero Section */}
        <section id="home" className="relative min-h-screen flex items-center justify-center blood-animation">
          <div className="absolute inset-0 hero-gradient"></div>

          {/* Dropping Blood Drops */}
          <div className="absolute -top-10 left-1/4 blood-drop" aria-hidden="true">
            <svg className="w-5 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 2c-4 4-8 8-8 12a8 8 0 1 0 16 0c0-4-4-8-8-12z" />
            </svg>
          </div>
          <div className="absolute -top-8 right-1/3 blood-drop" aria-hidden="true" style={{ animationDelay: '2s' }}>
            <svg className="w-4 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 2c-4 4-8 8-8 12a8 8 0 1 0 16 0c0-4-4-8-8-12z" />
            </svg>
          </div>

          {/* Hero Content */}
          <div className="container mx-auto px-6 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Main Hero Image/Icon */}
              <div className="mb-8">
                <div className="relative">
                  <img
                    src="https://media.istockphoto.com/id/2154964150/photo/the-concept-of-donation-blood-transfusion.jpg?s=612x612&w=0&k=20&c=EPcXA2NNoTk6vRYRDIwAgXf9UFMKu1K2nlnCzoRtD64="
                    alt="Blood donation hero image"
                    className="w-48 h-48 mx-auto rounded-full object-cover shadow-2xl border-4 border-white"
                  />
                  <div className="absolute -top-2 -right-2 w-16 h-16 bg-red-600 rounded-full flex items-center justify-center pulse-heart">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 fade-in">
                Save Lives Through
                <span className="text-gradient"> Blood Donation</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed fade-in">
                Connect donors with those in need. Every drop counts, every donor matters.
                Join our community of heroes who make a difference one donation at a time.
              </p>

              {/* Call to Action Buttons */}
              <div className="flex flex-row gap-4 justify-center items-center fade-in">
                <a href="#action-cards" className="bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-red-700 transition-all duration-300 shadow-lg">
                  Get Started Today
                </a>
                <a href="#aboutt" className="border-2 border-red-600 text-red-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-red-600 hover:text-white transition-all duration-300">
                  About Us
                </a>
              </div>
            </div>
          </div>
        </section>

        { }
        <section id="about" className="py-16 section-gradient-1">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-800 mb-6">Why Choose eBloodBank?</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  We're more than just a platform - we're a community dedicated to saving lives through blood donation.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center p-6 card-gradient-1 rounded-xl shadow-lg card-hover slide-in-left">
                  <img
                    src="https://cdn1.iconfinder.com/data/icons/basic-ui-rounded/512/ui-41-1024.png"
                    alt="Verified and safe"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-red-100"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Verified & Safe</h3>
                  <p className="text-gray-600">All donors are verified to ensure safety and reliability.</p>
                </div>

                <div className="text-center p-6 card-gradient-2 rounded-xl shadow-lg card-hover slide-in-up">
                  <img
                    src="https://t4.ftcdn.net/jpg/06/18/92/55/240_F_618925583_7fhLdIt1pZ2RJ1OMZ48R7Ny8xOliCC5e.jpg"
                    alt="24/7 emergency support"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-blue-100"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">24/7 Support</h3>
                  <p className="text-gray-600">Round-the-clock emergency support to connect donors with urgent needs.</p>
                </div>

                <div className="text-center p-6 card-gradient-3 rounded-xl shadow-lg card-hover slide-in-right">
                  <img
                    src="https://media.istockphoto.com/id/1354100115/photo/blood-donation-blood-donors-with-bandage-after-giving-blood.jpg?s=612x612&w=0&k=20&c=XtrzNnY5WKqwdpEc6mRY7HgUK7NoQn-28eTi-AGSBSY="
                    alt="Community of people helping each other"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-green-100"
                  />
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Community Driven</h3>
                  <p className="text-gray-600">Built by the community, for the community. Every member matters.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 section-gradient-2">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-800 mb-6">How It Works</h2>
                <p className="text-xl text-gray-600">Simple steps to save lives</p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center card-gradient-1 p-6 rounded-xl shadow-lg card-hover">
                  <img
                    src="/images/blood_drop.png"
                    alt="Registration form"
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-4 border-red-100"
                  />
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold glow-effect">1</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Register</h3>
                  <p className="text-gray-600">Sign up as a donor or seeker in minutes</p>
                </div>

                <div className="text-center card-gradient-2 p-6 rounded-xl shadow-lg card-hover">
                  <img
                    src="https://www.cancer.gov/sites/g/files/xnrzdm211/files/styles/cgov_article/public/cgov_image/media_image/2023-10/stem%20cell%20donation%20graphic.jpg?h=6fdef4be&itok=bttsR5WE"
                    alt="People connecting and networking"
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-4 border-red-100"
                  />
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold glow-effect">2</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Connect</h3>
                  <p className="text-gray-600">Find compatible donors or urgent requests</p>
                </div>

                <div className="text-center card-gradient-3 p-6 rounded-xl shadow-lg card-hover">
                  <img
                    src="https://noul.com/app/uploads/2025/02/2149404714-1024x681.jpg"
                    alt="Medical verification and checkup"
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-4 border-red-100"
                  />
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold glow-effect">3</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Verify</h3>
                  <p className="text-gray-600">Confirm details and arrange meeting</p>
                </div>

                <div className="text-center card-gradient-4 p-6 rounded-xl shadow-lg card-hover">
                  <img
                    src="https://cdn.vectorstock.com/i/1000v/17/26/red-blood-drop-vector-2051726.avif"
                    alt="Blood donation saving lives"
                    className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-4 border-red-100"
                  />
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold glow-effect">4</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Save Lives</h3>
                  <p className="text-gray-600">Make a difference in someone's life</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Action Cards */}
        <section id="action-cards" className="py-16 section-gradient-3">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-6">Get Started Today</h2>
              <p className="text-xl text-gray-600">Choose how you want to help save lives</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Donor Card */}
              <div id="donor-section" className="card-gradient-1 rounded-2xl shadow-xl p-8 card-hover slide-in-left">
                <div className="text-center">
                  <img
                    src="https://indianblooddonors.com/public//website/assets/images/homeImage/Request-For-Blood-2.webp"
                    alt="Blood donor giving blood"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-4 border-red-100"
                  />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Blood Donor</h3>
                  <p className="text-gray-600 mb-6">
                    Be a hero! Register as a blood donor and help save lives in your community.
                  </p>
                  <Link
                    to={getDonorRedirectPath()}
                    className="block text-center w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors glow-effect"
                    aria-label="Register or login as donor"
                  >
                    Register / Login as Donor
                  </Link>
                </div>
              </div>

              {/* Seeker Card */}
              <div id="seeker-section" className="card-gradient-2 rounded-2xl shadow-xl p-8 card-hover slide-in-right">
                <div className="text-center">
                  <img
                    src="https://mdspatientsupport.org.uk/wp-content/uploads/2024/06/bloodtransfusio_940_602.jpg"
                    alt="Emergency medical care and blood transfusion"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-4 border-blue-100"
                  />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Blood Seeker</h3>
                  <p className="text-gray-600 mb-6">
                    Need blood urgently? Find compatible donors in your area quickly and easily.
                  </p>
                  <Link
                    to="/seeker"
                    className="block text-center w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors glow-effect"
                    aria-label="Find blood"
                  >
                    Find Blood
                  </Link>
                </div>
              </div>

              {/* Organization Login */}
              <div id="organization-section" className="card-gradient-3 rounded-2xl shadow-xl p-8 card-hover slide-in-up">
                <div className="text-center">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
                    alt="Organization secure login"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-4 border-gray-200"
                  />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Organization Login</h3>
                  <p className="text-gray-600 mb-6">
                    Access your organization dashboard to manage drives and monitor requests.
                  </p>
                  <Link
                    to="/organization/login"
                    className="block text-center w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg transition-colors glow-effect"
                    aria-label="Organization login"
                  >
                    Login for Organization
                  </Link>
                </div>
              </div>

              {/* Organization Search */}
              <div id="org-search-section" className="card-gradient-4 rounded-2xl shadow-xl p-8 card-hover slide-in-up">
                <div className="text-center">
                  <img
                    src="https://img.freepik.com/premium-vector/hospital-icon-vector-image-can-be-used-public-services_120816-40862.jpg"
                    alt="Search organizations"
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-4 border-green-100"
                  />
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Search Organization</h3>
                  <p className="text-gray-600 mb-6">
                    Find verified partner organizations to collaborate on blood donation drives.
                  </p>
                  <Link
                    to="/organization-search"
                    className="block text-center w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors glow-effect"
                    aria-label="Search organization"
                  >
                    Search for Organization
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="fade-in">
                <div className="text-4xl font-bold text-red-500 mb-2">10,00+</div>
                <div className="text-gray-600">Lives Saved</div>
              </div>
              <div className="fade-in">
                <div className="text-4xl font-bold text-red-500 mb-2">5,00+</div>
                <div className="text-gray-600">Active Donors</div>
              </div>
              <div className="fade-in">
                <div className="text-4xl font-bold text-red-500 mb-2">50+</div>
                <div className="text-gray-600">Cities Covered</div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="aboutt" className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-8">About eBloodBank</h2>
              <p className="text-lg text-gray-600 mb-8">
                We believe that in moments of need, strangers can become the closest friends.
                Our platform connects blood donors with those in urgent need, creating a
                community built on compassion, trust, and the shared goal of saving lives.
              </p>
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Our Mission</h3>
                  <p className="text-gray-600">
                    To create a seamless bridge between blood donors and recipients,
                    ensuring no life is lost due to blood shortage.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Our Vision</h3>
                  <p className="text-gray-600">
                    A world where every person in need of blood finds a friend
                    ready to help, regardless of background or beliefs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile App Download Section */}
        <section id="mobile-app" className="py-24 download-app-section relative overflow-hidden">
          {/* Decorative Blobs */}
          <div className="decorative-blob w-[500px] h-[500px] -top-24 -left-24 opacity-20"></div>
          <div className="decorative-blob w-[400px] h-[400px] -bottom-24 -right-24 opacity-10"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="download-app-card p-12 md:p-20 flex flex-col lg:flex-row items-center justify-between gap-16">
              {/* Left Content */}
              <div className="lg:w-1/2 text-white text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Now Available on Mobile
                </div>

                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-8 leading-[1.1]">
                  Download Our <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/60">App Right Now</span>
                </h2>

                <p className="text-lg md:text-xl text-red-50/80 font-medium mb-12 leading-relaxed opacity-90 max-w-xl">
                  Welcome to the future of life-saving innovation. Get real-time updates on urgent blood needs, track your donations, and find nearby camps instantly.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                  <a href="#" className="download-btn group bg-white text-gray-900 px-8 py-5 rounded-[2rem] flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white group-hover:bg-red-600 transition-colors">
                      <i className="fab fa-apple text-2xl"></i>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Download on</div>
                      <div className="text-lg font-black leading-none">App Store</div>
                    </div>
                  </a>

                  <a href="#" className="download-btn group bg-gray-900 text-white px-8 py-5 rounded-[2rem] flex items-center gap-4 border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/20">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                      <i className="fab fa-google-play text-xl"></i>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Get it on</div>
                      <div className="text-lg font-black leading-none">Google Play</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Right Mockup & QR */}
              <div className="lg:w-1/2 flex flex-col md:flex-row items-center justify-center gap-12 mockup-container">
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/20 blur-[100px] rounded-full group-hover:bg-white/30 transition-all duration-700"></div>
                  <img
                    src="/images/app-mockup.png"
                    alt="eBloodBank Mobile App Mockup"
                    className="w-[280px] md:w-[320px] mockup-image relative z-10 animate-float"
                  />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="qr-container bg-white p-6 shadow-2xl relative group">
                    <img
                      src="/images/qr-code.png"
                      alt="Scan to Download"
                      className="w-32 h-32 md:w-40 md:h-40"
                    />
                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                  </div>
                  <div className="text-white text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">Scan to Download</div>
                    <div className="text-[9px] font-bold text-red-100/60 uppercase tracking-widest italic group-hover:text-white transition-colors">Compatible with iOS & Android</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 contact-section relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10">
            <div className="contact-curved-card">
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-8">Get In Touch</h2>
                <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto">Have questions? Need help? We're here for you 24/7 to support your life-saving journey.</p>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12">
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all group">
                    <div className="w-12 h-12 bg-white text-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                      <i className="fas fa-envelope text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-100/60">Email Support</p>
                      <p className="font-bold">ebloodbankoriginal@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 hover:bg-white/20 transition-all group">
                    <div className="w-12 h-12 bg-white text-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                      <i className="fas fa-phone-alt text-xl"></i>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-100/60">Phone Support</p>
                      <p className="font-bold">+91 8567329419</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="pulse-heart">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">eBloodBank</h3>
                  <p className="text-gray-400 text-sm">Connecting Donors, Saving Lives</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#home" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                <li><a href="#aboutt" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#action-cards" className="text-gray-400 hover:text-white transition-colors">Get Started</a></li>
                <li><Link to={getDonorRedirectPath()} className="text-gray-400 hover:text-white transition-colors">Donor Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" onClick={(e) => openModal(e, 'help')} className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" onClick={(e) => openModal(e, 'contact')} className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" onClick={(e) => openModal(e, 'emergency')} className="text-gray-400 hover:text-white transition-colors">Emergency</a></li>
                <li><a href="#" onClick={(e) => openModal(e, 'faq')} className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>📧 ebloodbankoriginal@gmail.com</p>
                <p>☎️ +91-9876543210</p>
                <p>🕒 24/7 Emergency Support</p>
                <p>🌐 www.ebloodbank.org</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 eBloodBank. All rights reserved. | Made with ❤️ for humanity</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BackToTop />

      {/* Information Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-info-circle"></i>
                {modalData?.title}
              </h3>
              <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              {modalData?.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
