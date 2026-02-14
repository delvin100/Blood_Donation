import React, { useState, useEffect } from 'react';

const stateDistrictMapping = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Kolasib", "Khawzawl", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
  "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
};

// Blood Groups List
const bloodGroups = [
  "A+", "A-", "A1+", "A1-", "A1B+", "A1B-",
  "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-",
  "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"
];

// City to District mapping for better location accuracy
const cityToDistrictMapping = {
  // Kerala
  'Kochi': 'Ernakulam',
  'Cochin': 'Ernakulam',
  'Thiruvananthapuram': 'Thiruvananthapuram',
  'Trivandrum': 'Thiruvananthapuram',
  'Kozhikode': 'Kozhikode',
  'Calicut': 'Kozhikode',
  'Thrissur': 'Thrissur',
  'Trichur': 'Thrissur',
  'Kollam': 'Kollam',
  'Quilon': 'Kollam',
  'Kannur': 'Kannur',
  'Cannanore': 'Kannur',
  'Palakkad': 'Palakkad',
  'Palghat': 'Palakkad',
  'Alappuzha': 'Alappuzha',
  'Alleppey': 'Alappuzha',
  'Kottayam': 'Kottayam',
  'Malappuram': 'Malappuram',
  // Add more mappings as needed
};

export default function CompleteProfileModal({ onClose, onSuccess, user }) {
  // Step state: 2 = Basic Details, 3 = Location
  const [step, setStep] = useState(2);

  // Form fields
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [isPhoneTouched, setIsPhoneTouched] = useState(false);

  // Location fields
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Error state should be an object for inline errors
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Location fetching states
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Calculate 18 years ago from today in YYYY-MM-DD format
  const getMaxDate = () => {
    const today = new Date();
    const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return max.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const today = new Date();
    const min = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
    return min.toISOString().split('T')[0];
  };

  const districts = state ? stateDistrictMapping[state] || [] : [];

  // Use regex check for simple inline validation classes, but full validation on submit
  const isPhoneValidFormat = phone.length === 10 && /^[0-9]+$/.test(phone);

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (globalError) setGlobalError('');
  };

  // Fetch location using GPS and reverse geocoding
  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    setLocationError('');

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Helper to get position with specific options
      const getPosition = (options) => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      };

      let position;
      try {
        // Try high accuracy first with longer timeout (20s)
        console.log('Attempting high accuracy location fetch...');
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });
      } catch (err) {
        console.warn('High accuracy failed, retrying with low accuracy...', err);
        // Fallback: Try low accuracy if high accuracy fails or times out
        position = await getPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 0
        });
      }

      const { latitude, longitude } = position.coords;
      console.log('GPS Coordinates:', latitude, longitude);

      // Try multiple geocoding services for better accuracy
      let locationData = null;

      // Try Nominatim (OpenStreetMap) first
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'BloodDonationApp/1.0'
            }
          }
        );

        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          console.log('Nominatim response:', nominatimData);

          if (nominatimData.address) {
            const addr = nominatimData.address;
            locationData = {
              state: addr.state,
              district: addr.state_district || addr.county || addr.district,
              city: addr.city || addr.town || addr.village || addr.suburb || addr.municipality
            };
          }
        }
      } catch (err) {
        console.warn('Nominatim failed:', err);
      }

      // If Nominatim didn't work, try BigDataCloud
      if (!locationData) {
        try {
          const bigDataResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );

          if (bigDataResponse.ok) {
            const bigData = await bigDataResponse.json();
            console.log('BigDataCloud response:', bigData);

            locationData = {
              state: bigData.principalSubdivision,
              district: bigData.localityInfo?.administrative?.[2]?.name || bigData.locality,
              city: bigData.city || bigData.locality
            };
          }
        } catch (err) {
          console.warn('BigDataCloud failed:', err);
        }
      }

      if (!locationData || !locationData.state) {
        throw new Error('Unable to determine location from coordinates');
      }

      // Clean and match state
      let matchedState = null;
      const stateKeys = Object.keys(stateDistrictMapping);

      for (const stateKey of stateKeys) {
        if (stateKey.toLowerCase().includes(locationData.state.toLowerCase()) ||
          locationData.state.toLowerCase().includes(stateKey.toLowerCase())) {
          matchedState = stateKey;
          break;
        }
      }

      if (!matchedState) {
        throw new Error(`State "${locationData.state}" not found in our database`);
      }

      // Match district
      let matchedDistrict = null;
      const districts = stateDistrictMapping[matchedState] || [];

      // First try exact match
      for (const dist of districts) {
        if (dist.toLowerCase() === locationData.district?.toLowerCase()) {
          matchedDistrict = dist;
          break;
        }
      }

      // If no exact match, try partial match
      if (!matchedDistrict && locationData.district) {
        for (const dist of districts) {
          if (dist.toLowerCase().includes(locationData.district.toLowerCase()) ||
            locationData.district.toLowerCase().includes(dist.toLowerCase())) {
            matchedDistrict = dist;
            break;
          }
        }
      }

      // Check city-to-district mapping
      if (!matchedDistrict && locationData.city) {
        const cityKey = Object.keys(cityToDistrictMapping).find(
          city => city.toLowerCase() === locationData.city.toLowerCase()
        );
        if (cityKey) {
          matchedDistrict = cityToDistrictMapping[cityKey];
        }
      }

      // Auto-fill the form
      setState(matchedState);
      setLatitude(latitude);
      setLongitude(longitude);

      if (matchedDistrict) {
        setDistrict(matchedDistrict);
      }

      if (locationData.city) {
        setCity(locationData.city);
      }

      // Clear any errors
      setErrors({});

      console.log('Location set:', {
        state: matchedState,
        district: matchedDistrict,
        city: locationData.city
      });

    } catch (err) {
      console.error('Location fetch error:', err);

      if (err.code === 1) {
        setLocationError('Location permission denied. Please enable location access in your browser settings.');
      } else if (err.code === 2) {
        setLocationError('Location unavailable. Please check your device settings.');
      } else if (err.code === 3) {
        setLocationError('Location request timed out. Please try again.');
      } else {
        setLocationError(err.message || 'Failed to fetch location. Please enter manually.');
      }
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Dynamic Geocoding for Manual Location Entries
  useEffect(() => {
    const geocodeManualLocation = async () => {
      if (!city || !district || !state) return;

      // Avoid redundant calls if fetching via GPS
      if (isFetchingLocation) return;

      try {
        const query = `${city}, ${district}, ${state}, India`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          {
            headers: { 'User-Agent': 'BloodDonationApp/1.0' }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setLatitude(parseFloat(data[0].lat));
            setLongitude(parseFloat(data[0].lon));
            console.log(`Manual geocode success: ${query} -> ${data[0].lat}, ${data[0].lon}`);
          }
        }
      } catch (err) {
        console.warn('Manual geocoding failed', err);
      }
    };

    const timeoutId = setTimeout(geocodeManualLocation, 1500);
    return () => clearTimeout(timeoutId);
  }, [city, district, state]);

  // Reset coordinates if fields are cleared
  useEffect(() => {
    if (!city && !district && !state) {
      setLatitude(null);
      setLongitude(null);
    }
  }, [city, district, state]);

  const handleNextStep = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (step === 2) {
      if (!gender) newErrors.gender = 'Please select your gender identity.';

      if (!phone) {
        newErrors.phone = 'Please enter your phone number.';
      } else if (!isPhoneValidFormat) {
        newErrors.phone = 'Phone number must be exactly 10 digits.';
      }

      if (!dob) {
        newErrors.dob = 'Please enter your date of birth.';
      } else {
        // Age Check
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
        if (age < 18 || age > 65) {
          newErrors.dob = 'Age must be between 18 and 65 years.';
        }
      }

      if (!bloodType) newErrors.bloodType = 'Please select your blood group.';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setStep(3);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!state) newErrors.state = 'Please select a state.';
    if (!district) newErrors.district = 'Please select a district.';
    if (!city) newErrors.city = 'Please enter your city.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        setGlobalError('Authentication token not found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bloodGroup: bloodType,
          gender,
          phoneNumber: phone,
          dob,
          state,
          district,
          city,
          latitude,
          longitude
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setShowSuccessOverlay(true);

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        // Navigate to dashboard 
        window.location.href = '/dashboard';
      }, 2000);

    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep2 = () => (
    <form onSubmit={handleNextStep} className="space-y-6">
      {/* Gender Selection */}
      <div className="group">
        <label className="block text-sm font-semibold text-gray-700 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <i className="fas fa-venus-mars text-white text-sm"></i>
            </div>
            <span>Gender Identity <span className="text-red-500">*</span></span>
          </div>
        </label>

        <div className="grid grid-cols-3 gap-3">
          {['male', 'female', 'other'].map((g) => (
            <label key={g} className="gender-card cursor-pointer group relative">
              <input
                type="radio"
                name="gender"
                value={g}
                checked={gender === g}
                onChange={(e) => {
                  setGender(e.target.value);
                  clearError('gender');
                }}
                className="hidden gender-input"
              />
              <div className={`gender-option p-4 border-2 rounded-xl text-center transition-all duration-300 hover:shadow-md ${gender === g
                ? g === 'male' ? 'border-blue-500 bg-blue-50' : g === 'female' ? 'border-pink-500 bg-pink-50' : 'border-purple-500 bg-purple-50'
                : errors.gender ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors ${gender === g
                  ? g === 'male' ? 'bg-blue-100 text-blue-600' : g === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-purple-100 text-purple-600'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                  }`}>
                  <i className={`fas ${g === 'male' ? 'fa-mars' : g === 'female' ? 'fa-venus' : 'fa-genderless'
                    } text-xl`}></i>
                </div>
                <span className={`text-sm font-medium ${gender === g ? 'text-gray-800' : 'text-gray-500'}`}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </span>
                {gender === g && (
                  <div className="absolute top-2 right-2 text-green-500">
                    <i className="fas fa-check-circle"></i>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
            <i className="fas fa-exclamation-circle"></i> {errors.gender}
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div className="group">
        <label className="block text-sm font-semibold text-gray-700 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
              <i className="fas fa-mobile-alt text-white text-sm"></i>
            </div>
            <span>Phone Number <span className="text-red-500">*</span></span>
          </div>
        </label>

        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none z-20 bg-white pr-2 border-r border-gray-200">
            <span className="text-lg">🇮🇳</span>
            <span className="text-gray-600 font-medium text-sm">+91</span>
          </div>

          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
              setPhone(val);
              setIsPhoneTouched(true);
              clearError('phone');
            }}
            placeholder="9876543210"
            className={`w-full pl-24 pr-12 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-base font-medium tracking-wide ${errors.phone
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
              : isPhoneTouched && !isPhoneValidFormat
                ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
              }`}
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity duration-300">
            {isPhoneValidFormat ? (
              <i className="fas fa-check-circle text-green-500 text-xl"></i>
            ) : errors.phone ? (
              <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
            ) : null}
          </div>
        </div>
        {errors.phone && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
            <i className="fas fa-exclamation-circle"></i> {errors.phone}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date of Birth */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                <i className="fas fa-calendar-alt text-white text-sm"></i>
              </div>
              <span>Date of Birth <span className="text-red-500">*</span></span>
            </div>
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              clearError('dob');
            }}
            max={getMaxDate()}
            min={getMinDate()}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all text-gray-700 font-medium ${errors.dob
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
              : 'border-gray-200 focus:border-orange-400 focus:ring-orange-100'
              }`}
          />
          {errors.dob && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
              <i className="fas fa-exclamation-circle"></i> {errors.dob}
            </p>
          )}
        </div>

        {/* Blood Group */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-md">
                <i className="fas fa-tint text-white text-sm"></i>
              </div>
              <span>Blood Group <span className="text-red-500">*</span></span>
            </div>
          </label>
          <div className="relative">
            <select
              value={bloodType}
              onChange={(e) => {
                setBloodType(e.target.value);
                clearError('bloodType');
              }}
              className={`w-full px-4 py-3 border-2 rounded-xl appearance-none focus:outline-none focus:ring-2 transition-all text-gray-700 font-medium bg-white ${errors.bloodType
                ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
                : 'border-gray-200 focus:border-red-500 focus:ring-red-100'
                }`}
            >
              <option value="">Select</option>
              {bloodGroups.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
              <i className="fas fa-chevron-down"></i>
            </div>
          </div>
          {errors.bloodType && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
              <i className="fas fa-exclamation-circle"></i> {errors.bloodType}
            </p>
          )}
        </div>
      </div>

      {/* Complete Registration Button (Next) */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-red-200 flex items-center justify-center gap-3 group"
        >
          <span>Continue to Location</span>
          <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>
    </form>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      {/* Header Section for Step 3 */}
      <div className="text-center relative z-10 mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
          <i className="fas fa-globe-asia text-white text-2xl"></i>
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-3">
          <i className="fas fa-map-marker-alt text-red-500"></i>
          Add Your Location
        </h3>
        <p className="text-gray-600 text-lg flex items-center justify-center gap-2">
          <i className="fas fa-heart text-red-400 animate-pulse"></i>
          Help us connect you with nearby blood seekers
        </p>
      </div>

      <form onSubmit={handleCompleteRegistration} className="space-y-8 relative z-10">
        <input type="hidden" name="action" value="complete_profile" />

        {/* Country Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full opacity-20 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500"></div>

          <div className="relative z-10">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-globe text-white"></i>
              </div>
              Country Information
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            </h3>
            <div className="grid md:grid-cols-1 gap-6">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="fas fa-flag text-blue-500"></i>
                  Country
                </label>
                <div className="relative">
                  <input
                    className="w-full pl-16 pr-12 py-4 text-lg font-medium border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed focus:outline-none"
                    type="text"
                    value="India"
                    readOnly
                  />
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="text-3xl">🇮🇳</span>
                  </div>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center">
                      <i className="fas fa-lock text-gray-500"></i>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                  <i className="fas fa-info-circle"></i>
                  Currently serving India only - More countries coming soon!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-8 border border-red-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-red-200 rounded-full opacity-20 -translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-pink-200 rounded-full opacity-20 translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-500"></div>

          <div className="relative z-10">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-map-marker-alt text-white"></i>
              </div>
              Location Details
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            </h3>

            {/* Fetch Location Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={fetchLocation}
                disabled={isFetchingLocation}
                className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 group ${isFetchingLocation ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
              >
                {isFetchingLocation ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-xl"></i>
                    <span>Fetching your location...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-location-arrow text-xl group-hover:scale-110 transition-transform"></i>
                    <span>Fetch My Location</span>
                  </>
                )}
              </button>

              {locationError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle mt-0.5"></i>
                  <span>{locationError}</span>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
                <i className="fas fa-info-circle"></i>
                Click to automatically detect your location using GPS
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* State Field */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="fas fa-map text-red-500"></i>
                  State <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className={`w-full border-2 border-gray-200 rounded-xl bg-white p-4 pl-12 h-[60px] appearance-none focus:outline-none focus:ring-2 transition-colors ${errors.state
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
                      : 'border-gray-200 focus:border-red-500'
                      }`}
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setDistrict('');
                      clearError('state');
                    }}
                  >
                    <option value="">Select your state</option>
                    {Object.keys(stateDistrictMapping).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-red-500">
                    <i className="fas fa-map"></i>
                  </div>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
                {errors.state && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
                    <i className="fas fa-exclamation-circle"></i> {errors.state}
                  </p>
                )}
              </div>

              {/* District Field */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="fas fa-building text-red-500"></i>
                  District <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className={`w-full border-2 border-gray-200 rounded-xl p-4 pl-12 h-[60px] appearance-none focus:outline-none focus:ring-2 transition-colors ${!state ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                      } ${errors.district
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
                        : 'border-gray-200 focus:border-red-500'
                      }`}
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      clearError('district');
                    }}
                    disabled={!state}
                  >
                    <option value="">{state ? 'Select district' : 'First select a state'}</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                    <i className={`${state ? 'fas fa-building text-red-500' : 'fas fa-building'}`}></i>
                  </div>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fas fa-chevron-down"></i>
                  </div>
                </div>
                {errors.district && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
                    <i className="fas fa-exclamation-circle"></i> {errors.district}
                  </p>
                )}
              </div>

              {/* City Field */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="fas fa-city text-red-500"></i>
                  City/Town <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full border-2 border-gray-200 rounded-xl bg-white p-4 pl-12 h-[60px] focus:outline-none focus:ring-2 transition-colors ${errors.city
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 shake'
                      : 'border-gray-200 focus:border-red-500'
                      }`}
                    type="text"
                    placeholder="Enter your city or town"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearError('city');
                    }}
                  />
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-red-500">
                    <i className="fas fa-city"></i>
                  </div>
                </div>
                {errors.city && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
                    <i className="fas fa-exclamation-circle"></i> {errors.city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 pt-10 mt-10 border-t-2 border-gray-100">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-colors duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <i className="fas fa-arrow-left text-xl"></i>
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-colors duration-200 shadow-xl flex items-center justify-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
            <i className="fas fa-heart text-xl animate-pulse"></i>
            {isSubmitting ? 'Completing...' : 'Complete Profile'}
            <i className="fas fa-arrow-right text-lg"></i>
          </button>
        </div>
      </form >
    </div >
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-red-50 z-[99999] overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 text-white p-6 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
        </div>

        <div className="flex items-center justify-between max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30 shadow-lg">
              <i className="fas fa-user-plus text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1 flex items-center gap-3">
                Complete Your Profile
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              </h2>
              <p className="text-red-100 text-base flex items-center gap-2">
                <i className="fas fa-magic text-yellow-400"></i>
                {step === 2 ? 'Just a few details to unlock your donor journey' : 'Add your location details to help us serve you better'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl flex items-center justify-center transition-all duration-300 group border border-white border-opacity-30 backdrop-blur-sm"
          >
            <i className="fas fa-times text-white text-xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-300"></i>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100/50">
        <div className="max-w-7xl mx-auto p-6 md:p-10 lg:p-12">
          {/* Progress Indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-center space-x-2 md:space-x-4">
              {/* Step 1 (Implicitly Done) */}
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="w-8 md:w-16 h-1 bg-green-500 rounded"></div>

              {/* Step 2 */}
              <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${step > 2 ? 'bg-green-500' : step === 2 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <div className={`w-8 md:w-16 h-1 rounded transition-colors duration-500 ${step === 3 ? 'bg-red-500' : step === 2 ? 'bg-red-500' : 'bg-gray-300'}`}></div>

              {/* Step 3 */}
              <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-red-500' : 'bg-gray-300'}`}></div>
            </div>
            <div className="text-center mt-3 text-gray-500 text-sm font-medium">
              Step {step} of 3
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            <div className="p-8 md:p-10 relative z-10">
              {globalError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 font-medium rounded-r-lg flex items-center gap-3 animate-shake">
                  <i className="fas fa-exclamation-circle text-xl"></i>
                  {globalError}
                </div>
              )}

              {step === 2 ? renderStep2() : renderStep3()}
            </div>
          </div>

          {/* Footer Security */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-shield-alt text-white text-xl"></i>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-heart text-white text-xl"></i>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-users text-white text-xl"></i>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">🔒 Your Privacy is Protected</h4>
              <p className="text-gray-600 text-base">
                Your information is secure and will only be used to connect you with nearby blood seekers in emergency situations.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <i className="fas fa-lock text-green-500"></i>
                  Encrypted Data
                </span>
                <span className="flex items-center gap-1">
                  <i className="fas fa-user-shield text-blue-500"></i>
                  Privacy First
                </span>
                <span className="flex items-center gap-1">
                  <i className="fas fa-handshake text-purple-500"></i>
                  Trusted Platform
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-12 text-center shadow-2xl scale-in-center mx-4">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
              <i className="fas fa-check text-white text-4xl"></i>
            </div>
            <h3 className="text-3xl font-black text-gray-800 mb-4">Perfect!</h3>
            <p className="text-gray-600 text-lg">Welcome to the community. Entering dashboard...</p>
            <div className="mt-8 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-progress"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes scale-in-center { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-progress { animation: progress 2s linear forwards; }
        @keyframes progress { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
