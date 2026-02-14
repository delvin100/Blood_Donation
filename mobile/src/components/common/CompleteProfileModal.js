import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { stateDistrictMapping, bloodGroups, cityToDistrictMapping, districtAliases } from '../../utils/locationData';

import apiService from '../../api/apiService';

const CompleteProfileModal = ({ visible, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [gender, setGender] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('DD-MM-YYYY');
    const [bloodType, setBloodType] = useState('');
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [error, setError] = useState('');
    const [showErrors, setShowErrors] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const districts = state ? stateDistrictMapping[state] || [] : [];

    // Helper to format date as DD-MM-YYYY
    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Helper to convert DD-MM-YYYY to YYYY-MM-DD for backend
    const convertToBackendDate = (dateStr) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
    };

    // Calculate 18 and 65 years ago from today
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 65);

    const handleFetchLocation = async () => {
        setIsFetchingLocation(true);
        setError('');
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude: lat, longitude: lng } = location.coords;
            setLatitude(lat);
            setLongitude(lng);

            let reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (reverseGeocode.length > 0) {
                const addr = reverseGeocode[0];
                const regionClean = addr.region ? addr.region.replace(/\s+/g, '').toLowerCase() : '';

                // Find matching state with robust comparison
                const stateKeys = Object.keys(stateDistrictMapping);
                const matchedState = stateKeys.find(s => {
                    const sClean = s.replace(/\s+/g, '').toLowerCase();
                    return sClean === regionClean || sClean.includes(regionClean) || regionClean.includes(sClean);
                });

                if (matchedState) {
                    setState(matchedState);
                    const dists = stateDistrictMapping[matchedState] || [];

                    // 1. Identify City (prefer City -> Subregion -> Town -> Name)
                    // If city is something generic like "undefined" or empty, fallback
                    let detectedCity = addr.city || addr.town || addr.name || addr.subregion;
                    // Filter out numeric or very short names if needed, but for now trust Geocoder
                    if (detectedCity) {
                        setCity(detectedCity);
                    }

                    // 2. Identify District
                    const possibleDistrictSource = [
                        addr.subregion,
                        addr.district,
                        addr.city, // Sometimes city is the district name
                        addr.town
                    ].filter(Boolean);

                    let matchedDist = null;

                    // Helper to clean strings efficiently for matching
                    const cleanString = (str) => {
                        return str.toLowerCase()
                            .replace('district', '')
                            .replace('dt', '')
                            .trim();
                    };

                    for (const source of possibleDistrictSource) {
                        const sourceClean = cleanString(source);

                        // Check direct match or alias match
                        matchedDist = dists.find(d => {
                            const dClean = cleanString(d);
                            // Check aliases first
                            if (districtAliases[source]) {
                                return d === districtAliases[source];
                            }
                            // Direct containment check
                            return dClean === sourceClean || sourceClean.includes(dClean) || dClean.includes(sourceClean);
                        });

                        if (matchedDist) break;
                    }

                    // Fallback: Check aliases on the city itself even if not in possible sources loop
                    if (!matchedDist && detectedCity && districtAliases[detectedCity]) {
                        matchedDist = districtAliases[detectedCity];
                    }

                    // Extra check for Mumbai (Legacy)
                    if (!matchedDist && matchedState === "Maharashtra") {
                        if (addr.city?.toLowerCase().includes("mumbai") || addr.region?.toLowerCase().includes("mumbai")) {
                            matchedDist = "Mumbai City";
                        }
                    }

                    if (matchedDist) {
                        // Using a timeout to ensure state is settled before setting district
                        setTimeout(() => setDistrict(matchedDist), 500);
                    } else if (cityToDistrictMapping[detectedCity]) {
                        // Use city mapping as last resort
                        const fallbackDist = cityToDistrictMapping[detectedCity];
                        setTimeout(() => setDistrict(fallbackDist), 500);
                    }
                } else {
                    setError('Could not auto-detect state. Please select manually.');
                }
            }
        } catch (err) {
            setError('Could not fetch location automatically.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!gender || !phone || !dob || dob === 'DD-MM-YYYY' || !bloodType) {
                setError('Please fill all highlighted fields');
                setShowErrors(true);
                return;
            }
            setShowErrors(false);

            if (phone.length !== 10 || !/^[0-9]+$/.test(phone)) {
                setError('Phone number must be exactly 10 digits.');
                return;
            }

            const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
            if (!dateRegex.test(dob)) {
                setError('Please use DD-MM-YYYY format');
                return;
            }

            const [day, month, year] = dob.split('-').map(Number);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

            if (age < 18 || age > 65) {
                setError('Age must be between 18 and 65 years');
                return;
            }

            setStep(2);
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (!state || !district || !city) {
            setError('Please fill all highlighted location fields');
            setShowErrors(true);
            return;
        }
        setShowErrors(false);
        setIsSubmitting(true);
        setError('');

        try {
            await apiService.post('/auth/complete-profile', {
                bloodGroup: bloodType,
                gender,
                phoneNumber: phone,
                dob: convertToBackendDate(dob),
                state,
                district,
                city,
                latitude,
                longitude
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.error || 'Failed to complete profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date();
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' || Platform.OS === 'ios') {
            setDob(formatDate(currentDate));
        }
    };

    const GenderOption = ({ label, value, icon }) => {
        const isActive = gender === value;
        return (
            <TouchableOpacity
                style={[
                    styles.genderCard,
                    isActive && styles.activeGenderCard,
                    showErrors && !gender && styles.inputErrorBorder
                ]}
                onPress={() => setGender(value)}
                activeOpacity={0.7}
            >
                <Ionicons name={icon} size={24} color={isActive ? 'white' : '#6b7280'} />
                <Text style={[styles.genderText, isActive && styles.activeGenderText]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const BloodGroupChip = ({ group }) => {
        const isActive = bloodType === group;
        return (
            <TouchableOpacity
                style={[
                    styles.bloodChip,
                    isActive && styles.activeBloodChip,
                    showErrors && !bloodType && styles.inputErrorBorder
                ]}
                onPress={() => setBloodType(group)}
                activeOpacity={0.7}
            >
                <Text style={[styles.bloodChipText, isActive && styles.activeBloodChipText]}>{group}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepDot, step >= 1 ? styles.activeStep : {}]} />
                            <View style={[styles.stepLine, step >= 2 ? styles.activeLine : {}]} />
                            <View style={[styles.stepDot, step >= 2 ? styles.activeStep : {}]} />
                        </View>
                        <Text style={styles.modalTitle}>Complete Profile</Text>
                        <Text style={styles.modalSubtitle}>{step === 1 ? 'Tell us about yourself' : 'Where are you located?'}</Text>
                    </View>

                    <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {step === 1 ? (
                            <>
                                <Text style={styles.label}>Gender</Text>
                                <View style={styles.genderContainer}>
                                    <GenderOption label="Male" value="male" icon="male" />
                                    <GenderOption label="Female" value="female" icon="female" />
                                    <GenderOption label="Other" value="other" icon="transgender" />
                                </View>

                                <Text style={styles.label}>Phone Number</Text>
                                <View style={[styles.inputWrapper, showErrors && !phone && styles.inputWrapperError]}>
                                    <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="10 digit mobile number"
                                        value={phone}
                                        onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>

                                <Text style={styles.label}>Date of Birth</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!dob || dob === 'DD-MM-YYYY') setDob('01-01-2000');
                                        setShowDatePicker(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.inputWrapper, showErrors && (dob === 'DD-MM-YYYY' || !dob) && styles.inputWrapperError]} pointerEvents="none">
                                        <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput style={styles.input} placeholder="DD-MM-YYYY" value={dob} editable={false} maxLength={10} />
                                        <View style={styles.datePickerBtn}>
                                            <Ionicons name="chevron-down" size={20} color="#dc2626" />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={dob !== 'DD-MM-YYYY' ? new Date(dob.split('-')[2], dob.split('-')[1] - 1, dob.split('-')[0]) : new Date(2000, 0, 1)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        maximumDate={maxDate}
                                        minimumDate={minDate}
                                    />
                                )}

                                <Text style={styles.label}>Blood Group</Text>
                                <View style={styles.bloodGrid}>
                                    {bloodGroups.map(bg => <BloodGroupChip key={bg} group={bg} />)}
                                </View>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.locationBtn} onPress={handleFetchLocation} disabled={isFetchingLocation}>
                                    <Ionicons name="location" size={20} color="white" />
                                    <Text style={styles.locationBtnText}>{isFetchingLocation ? 'Fetching...' : 'Fetch My Location'}</Text>
                                    {isFetchingLocation && <ActivityIndicator color="white" size="small" style={{ marginLeft: 8 }} />}
                                </TouchableOpacity>

                                <Text style={styles.label}>State</Text>
                                <View style={[styles.inputWrapper, showErrors && !state && styles.inputWrapperError]}>
                                    <Ionicons name="map-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                    <Picker
                                        selectedValue={state}
                                        onValueChange={(val) => { setState(val); setDistrict(''); }}
                                        style={styles.picker}
                                        enabled={!isFetchingLocation}
                                    >
                                        <Picker.Item label="Select State" value="" />
                                        {Object.keys(stateDistrictMapping).map(s => <Picker.Item key={s} label={s} value={s} />)}
                                    </Picker>
                                </View>

                                <Text style={styles.label}>District</Text>
                                <View style={[styles.inputWrapper, !state && styles.disabledPicker, showErrors && !district && styles.inputWrapperError]}>
                                    <Ionicons name="navigate-outline" size={20} color={state ? "#6b7280" : "#9ca3af"} style={styles.inputIcon} />
                                    <Picker
                                        key={state} // Force re-render when state changes
                                        selectedValue={district}
                                        onValueChange={(val) => { if (state) setDistrict(val); }}
                                        style={styles.picker}
                                        enabled={!!state && !isFetchingLocation}
                                    >
                                        <Picker.Item label="Select District" value="" />
                                        {districts.map(d => <Picker.Item key={d} label={d} value={d} />)}
                                    </Picker>
                                </View>

                                <Text style={styles.label}>City</Text>
                                <View style={[styles.inputWrapper, showErrors && !city.trim() && styles.inputWrapperError]}>
                                    <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Enter your city/town" value={city} onChangeText={setCity} />
                                </View>
                            </>
                        )}
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {step === 2 && (
                            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                                <Text style={styles.backBtnText}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.nextBtn, step === 1 ? { flex: 1 } : {}]} onPress={step === 1 ? handleNext : handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.nextBtnText}>{step === 1 ? 'Next Step' : 'Save Profile'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '92%', padding: 24 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e5e7eb' },
    activeStep: { backgroundColor: '#dc2626' },
    stepLine: { width: 40, height: 4, backgroundColor: '#e5e7eb', marginHorizontal: 4 },
    activeLine: { backgroundColor: '#dc2626' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    formContent: { flex: 1 },
    label: { fontSize: 13, fontWeight: '900', color: '#1f2937', marginBottom: 8, marginTop: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e5e7eb' },
    inputWrapperError: { borderColor: '#ef4444', borderWidth: 2 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: 'bold' },
    genderContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    genderCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
    activeGenderCard: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    genderText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginTop: 4 },
    activeGenderText: { color: 'white' },
    inputErrorBorder: { borderColor: '#ef4444', borderWidth: 2 },
    datePickerBtn: { padding: 4 },
    bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bloodChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', minWidth: 60, alignItems: 'center' },
    activeBloodChip: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
    bloodChipText: { fontSize: 14, fontWeight: '900', color: '#4b5563' },
    activeBloodChipText: { color: '#dc2626' },
    pickerContainer: { backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
    picker: { flex: 1, marginLeft: -12, height: 56 },
    disabledPicker: { opacity: 0.5, backgroundColor: '#f3f4f6' },
    locationBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
    locationBtnText: { color: 'white', fontWeight: '800', marginLeft: 8 },
    errorText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
    modalFooter: { flexDirection: 'row', marginTop: 20, gap: 12 },
    backBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    backBtnText: { color: '#4b5563', fontSize: 16, fontWeight: '700' },
    nextBtn: { flex: 2, height: 56, borderRadius: 16, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    nextBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default CompleteProfileModal;
