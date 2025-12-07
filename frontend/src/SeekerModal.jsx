import React, { useState } from 'react';
import API from './api';

const STATE_DISTRICT_MAPPING = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Dindigul", "Thanjavur"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davangere", "Bellary", "Bijapur", "Shimoga"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli", "Jalgaon"],
  "Delhi": ["Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "New Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Bharuch"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Hooghly", "Nadia", "Murshidabad"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Allahabad", "Meerut", "Ghaziabad", "Bareilly", "Aligarh", "Moradabad"],
  "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Mohali", "Firozpur", "Sangrur", "Moga"]
};

export default function SeekerModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: 'India',
    state: '',
    district: '',
    blood_type: '',
    required_by: ''
  });
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleStateChange = (state) => {
    setFormData({...formData, state, district: ''});
    setDistricts(STATE_DISTRICT_MAPPING[state] || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await API.post('/api/seekers', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        state: formData.state,
        district: formData.district,
        blood_type: formData.blood_type,
        required_by: formData.required_by
      });
      
      setMessage('Registration successful! You can now search for donors.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto py-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 relative overflow-hidden animate-modal-enter modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 p-6 text-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 hover:bg-white hover:bg-opacity-20 rounded flex items-center justify-center transition-all duration-300"
            aria-label="Close modal"
          >
            <i className="fas fa-times text-white text-xl"></i>
          </button>
          
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm mx-auto mb-4">
              <i className="fas fa-user-plus text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold mb-2">Blood Seeker Registration</h2>
            <p className="text-blue-100">Please provide your details to find compatible donors</p>
          </div>
        </div>
        
        {/* Form Content */}
        <div className="modal-body flex-1 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-user text-white text-xs"></i>
                </div>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter your full name"
                minLength={2}
                maxLength={100}
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-envelope text-white text-xs"></i>
                </div>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-phone text-white text-xs"></i>
                </div>
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter your 10-digit phone number"
                pattern="[0-9]{10}"
                maxLength={10}
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-globe text-white text-xs"></i>
                </div>
                Country *
              </label>
              <input
                type="text"
                value={formData.country}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <div className="text-xs text-gray-500 mt-1">
                <i className="fas fa-info-circle"></i>
                <span> Currently serving India only</span>
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-map-marker-alt text-white text-xs"></i>
                </div>
                State *
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="">Select your state</option>
                {Object.keys(STATE_DISTRICT_MAPPING).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-city text-white text-xs"></i>
                </div>
                District *
              </label>
              <select
                required
                value={formData.district}
                onChange={(e) => setFormData({...formData, district: e.target.value})}
                disabled={!formData.state}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:bg-gray-100"
              >
                <option value="">Select your district</option>
                {districts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-tint text-white text-xs"></i>
                </div>
                Blood Type Required *
              </label>
              <select
                required
                value={formData.blood_type}
                onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="">Select blood type needed</option>
                <option value="A+">A+ (A Positive)</option>
                <option value="A-">A- (A Negative)</option>
                <option value="A1+">A1+ (A1 Positive)</option>
                <option value="A1-">A1- (A1 Negative)</option>
                <option value="A1B+">A1B+ (A1B Positive)</option>
                <option value="A1B-">A1B- (A1B Negative)</option>
                <option value="A2+">A2+ (A2 Positive)</option>
                <option value="A2-">A2- (A2 Negative)</option>
                <option value="A2B+">A2B+ (A2B Positive)</option>
                <option value="A2B-">A2B- (A2B Negative)</option>
                <option value="AB+">AB+ (AB Positive)</option>
                <option value="AB-">AB- (AB Negative)</option>
                <option value="B+">B+ (B Positive)</option>
                <option value="B-">B- (B Negative)</option>
                <option value="Bombay Blood Group">Bombay Blood Group (Rare)</option>
                <option value="INRA">INRA (Rare)</option>
                <option value="O+">O+ (O Positive)</option>
                <option value="O-">O- (O Negative)</option>
              </select>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar text-white text-xs"></i>
                </div>
                Required By Date *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.required_by}
                onChange={(e) => setFormData({...formData, required_by: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            
            {message && (
              <div className={`p-4 rounded-lg ${message.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <i className="fas fa-search"></i>
                <span>{loading ? 'Registering...' : 'Register & Find Donors'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

