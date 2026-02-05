import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../api/apiService';
import { stateDistrictMapping, bloodGroups, cityToDistrictMapping } from '../../utils/locationData';

const EditProfileScreen = ({ navigation, route }) => {
    const { user } = route.params || {};

    // Helper to format date as DD-MM-YYYY
    const formatDate = (date) => {
        if (!date) return 'DD-MM-YYYY';
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

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        blood_type: '',
        gender: '',
        dob: 'DD-MM-YYYY',
        phone: '',
        state: '',
        district: '',
        city: '',
        username: '',
        password: '',
        confirm_password: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [profilePic, setProfilePic] = useState(user?.profile_picture || null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                blood_type: user.blood_type || '',
                gender: user.gender || '',
                dob: user.dob ? formatDate(user.dob) : '',
                phone: user.phone || '',
                state: user.state || '',
                district: user.district || '',
                city: user.city || '',
                username: user.username || '',
                password: '',
                confirm_password: ''
            });
            if (user.profile_picture) {
                setProfilePic(user.profile_picture);
            }
        }
    }, [user]);

    const handleChange = (name, value) => {
        let finalValue = value;
        if (name === 'phone') {
            finalValue = value.replace(/[^0-9]/g, '').slice(0, 10);
        }
        setFormData(prev => {
            const newData = { ...prev, [name]: finalValue };
            if (name === 'state') newData.district = '';
            return newData;
        });
        // Clear error when typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.full_name.trim()) newErrors.full_name = 'Required';
        if (!formData.email.trim()) newErrors.email = 'Required';
        if (!formData.phone.trim()) newErrors.phone = 'Required';
        if (formData.phone.length !== 10) newErrors.phone = 'Must be 10 digits';
        if (!formData.state) newErrors.state = 'Required';
        if (!formData.district) newErrors.district = 'Required';
        if (!formData.city.trim()) newErrors.city = 'Required';
        if (!formData.username.trim()) newErrors.username = 'Required';
        if (!formData.dob || formData.dob === 'DD-MM-YYYY' || formData.dob === '00-00-0000') {
            newErrors.dob = 'Required';
        } else {
            const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
            if (!dateRegex.test(formData.dob)) {
                newErrors.dob = 'Use DD-MM-YYYY';
            } else {
                // Age Validation (18-65)
                const [day, month, year] = formData.dob.split('-').map(Number);
                if (day > 0 && month > 0 && year > 0) {
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }

                    if (age < 18 || age > 65) {
                        newErrors.dob = 'Must be 18-65 years';
                    }
                } else {
                    newErrors.dob = 'Select valid date';
                }
            }
        }
        if (formData.password && formData.password !== formData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            Alert.alert('Required Fields', 'Please fill in all the fields highlighted in red.');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            let finalProfilePic = user.profile_picture;

            // Upload profile picture if one was selected
            if (selectedImage) {
                try {
                    finalProfilePic = await uploadImage(selectedImage);
                } catch (err) {
                    Alert.alert('Upload Error', 'Failed to upload profile picture. Please try again.');
                    setIsSubmitting(false);
                    return;
                }
            }

            const submissionData = { ...formData };
            submissionData.dob = convertToBackendDate(submissionData.dob);

            if (!submissionData.password) {
                delete submissionData.password;
                delete submissionData.confirm_password;
            }

            const response = await apiService.put('/donor/profile', submissionData);

            // Update global state in App.js immediately
            if (navigation.setParams) {
                navigation.setParams({ user: response.data.user });
            }

            Alert.alert('Success', 'Profile updated successfully!');
            navigation.navigate('Dashboard', { user: response.data.user });
        } catch (err) {
            console.error('Update Error:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required to change profile picture.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled) {
                const pickedUri = result.assets[0].uri;
                setProfilePic(pickedUri); // Immediate preview
                setSelectedImage(pickedUri); // Store for later upload
            }
        } catch (err) {
            console.error('Picker Error:', err);
            Alert.alert('Error', 'Could not open gallery');
        }
    };

    const handleFetchLocation = async () => {
        setIsLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required to fetch details.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            let reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
                const addr = reverseGeocode[0];
                const stateKeys = Object.keys(stateDistrictMapping);
                const matchedState = stateKeys.find(s =>
                    s.toLowerCase().includes(addr.region?.toLowerCase()) ||
                    addr.region?.toLowerCase().includes(s.toLowerCase())
                );

                if (matchedState) {
                    setFormData(prev => ({
                        ...prev,
                        state: matchedState,
                        city: addr.city || addr.town || prev.city
                    }));

                    const dists = stateDistrictMapping[matchedState];
                    const possibleDistrictSource = [
                        addr.subregion,
                        addr.district,
                        addr.city,
                        addr.town,
                        addr.name
                    ].filter(Boolean);

                    let matchedDist = null;
                    for (const source of possibleDistrictSource) {
                        const sourceLower = source.toLowerCase();
                        matchedDist = dists.find(d => {
                            const dLower = d.toLowerCase();
                            return dLower === sourceLower ||
                                sourceLower.includes(dLower) ||
                                dLower.includes(sourceLower);
                        });
                        if (matchedDist) break;
                    }

                    // Mumbai heuristic
                    if (!matchedDist && matchedState === "Maharashtra") {
                        if (addr.city?.toLowerCase().includes("mumbai") || addr.region?.toLowerCase().includes("mumbai")) {
                            matchedDist = "Mumbai City";
                        }
                    }

                    if (matchedDist) {
                        setTimeout(() => {
                            setFormData(prev => ({ ...prev, district: matchedDist }));
                        }, 200);
                    } else if (addr.city || addr.town) {
                        const cityVal = addr.city || addr.town;
                        if (cityToDistrictMapping[cityVal]) {
                            const fallbackDist = cityToDistrictMapping[cityVal];
                            setTimeout(() => {
                                setFormData(prev => ({ ...prev, district: fallbackDist }));
                            }, 250);
                        }
                    }
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Could not fetch location automatically.');
        } finally {
            setIsLoading(false);
        }
    };

    const uploadImage = async (uri) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            const fileName = uri.split('/').pop();
            const fileType = fileName.split('.').pop() || 'jpeg';

            formData.append('profile_picture', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name: fileName,
                type: `image/${fileType}`,
            });

            const res = await apiService.post('/donor/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return res.data.url;
        } catch (err) {
            console.error('Upload Error:', err);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const InputField = ({ label, name, icon, type = 'default', secure = false, placeholder, editable = true, children }) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputContainer, errors[name] && styles.inputError]}>
                <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, !editable && styles.inputDisabled]}
                    value={formData[name]}
                    onChangeText={(val) => handleChange(name, val)}
                    keyboardType={type}
                    secureTextEntry={secure}
                    placeholder={placeholder}
                    editable={editable}
                />
                {children}
            </View>
            {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
        </View>
    );

    const SelectField = ({ label, name, icon, options }) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputContainer, errors[name] && styles.inputError]}>
                <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />
                <Picker
                    selectedValue={formData[name]}
                    onValueChange={(val) => handleChange(name, val)}
                    style={styles.picker}
                    enabled={name === 'state' ? true : (!!formData.state)}
                >
                    <Picker.Item label={`Select ${label}`} value="" color="#9ca3af" />
                    {options.map((opt, i) => {
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        const optValue = typeof opt === 'string' ? opt : opt.value;
                        return <Picker.Item key={i} label={optLabel} value={optValue} />;
                    })}
                </Picker>
            </View>
            {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
        </View>
    );

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || new Date();
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' || Platform.OS === 'ios') {
            handleChange('dob', formatDate(currentDate));
        }
    };

    const GenderOption = ({ label, value, icon }) => {
        const isActive = formData.gender === value;
        return (
            <TouchableOpacity
                style={[styles.genderCard, isActive && styles.activeGenderCard, errors.gender && styles.inputError]}
                onPress={() => handleChange('gender', value)}
                activeOpacity={0.7}
            >
                <Ionicons
                    name={icon}
                    size={20}
                    color={isActive ? 'white' : '#6b7280'}
                />
                <Text style={[styles.genderText, isActive && styles.activeGenderText]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const BloodGroupChip = ({ group }) => {
        const isActive = formData.blood_type === group;
        return (
            <TouchableOpacity
                style={[styles.bloodChip, isActive && styles.activeBloodChip, errors.blood_type && styles.inputError]}
                onPress={() => handleChange('blood_type', group)}
                activeOpacity={0.7}
            >
                <Text style={[styles.bloodChipText, isActive && styles.activeBloodChipText]}>
                    {group}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.profilePicSection}>
                    <TouchableOpacity
                        style={styles.profilePicContainer}
                        onPress={handlePickImage}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator size="large" color="#dc2626" />
                        ) : profilePic ? (
                            <Image
                                source={{
                                    uri: profilePic.startsWith('file') || profilePic.startsWith('content')
                                        ? profilePic
                                        : `http://192.168.137.1:4000${profilePic}${profilePic.includes('?') ? '&' : '?'}t=${new Date().getTime()}`
                                }}
                                style={styles.profilePic}
                            />
                        ) : (
                            <View style={styles.profilePlaceholder}>
                                <Ionicons name="camera" size={40} color="#dc2626" />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={14} color="white" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.profilePicTitle}>Profile Picture</Text>
                    <Text style={styles.profilePicSubtitle}>Tap to change</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <InputField label="Full Name" name="full_name" icon="person" placeholder="John Doe" />
                    <InputField label="Email" name="email" icon="mail" type="email-address" placeholder="john@example.com" />

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Blood Group</Text>
                        <View style={styles.bloodGrid}>
                            {bloodGroups.map(bg => (
                                <BloodGroupChip key={bg} group={bg} />
                            ))}
                        </View>
                        {errors.blood_type && <Text style={styles.errorText}>{errors.blood_type}</Text>}
                    </View>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderContainer}>
                            <GenderOption label="Male" value="male" icon="male" />
                            <GenderOption label="Female" value="female" icon="female" />
                            <GenderOption label="Other" value="other" icon="transgender" />
                        </View>
                        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                    </View>

                    <InputField
                        label="Date of Birth (DD-MM-YYYY)"
                        name="dob"
                        icon="calendar"
                        placeholder="DD-MM-YYYY"
                    >
                        <TouchableOpacity
                            onPress={() => {
                                if (!formData.dob || formData.dob === 'DD-MM-YYYY' || formData.dob === '00-00-0000') handleChange('dob', '01-01-2000');
                                setShowDatePicker(true);
                            }}
                            style={{ padding: 10 }}
                        >
                            <Ionicons name="chevron-down" size={18} color="#dc2626" />
                        </TouchableOpacity>
                    </InputField>

                    {showDatePicker && (
                        <DateTimePicker
                            value={formData.dob !== 'DD-MM-YYYY' ? new Date(formData.dob.split('-')[2], formData.dob.split('-')[1] - 1, formData.dob.split('-')[0]) : new Date(2000, 0, 1)}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={maxDate}
                            minimumDate={minDate}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact & Location</Text>
                    <InputField label="Phone" name="phone" icon="call" type="numeric" placeholder="10-digit number" />

                    <TouchableOpacity
                        style={styles.locationFetchBtn}
                        onPress={handleFetchLocation}
                        disabled={isLoading}
                    >
                        <Ionicons name="location" size={18} color="white" />
                        <Text style={styles.locationFetchText}>Fetch My Location</Text>
                    </TouchableOpacity>

                    <SelectField label="State" name="state" icon="map" options={Object.keys(stateDistrictMapping)} />
                    <View style={!formData.state && { opacity: 0.5 }}>
                        <SelectField
                            label="District"
                            name="district"
                            icon="navigate"
                            options={formData.state ? stateDistrictMapping[formData.state] : []}
                        />
                    </View>
                    <InputField label="City" name="city" icon="business" placeholder="Mumbai" />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Security</Text>
                    <InputField label="Username" name="username" icon="person-circle" placeholder="johndoe123" />
                    <InputField label="New Password" name="password" icon="lock-closed" secure placeholder="Leave blank to keep current" />
                    <InputField label="Confirm Password" name="confirm_password" icon="lock-closed" secure placeholder="Repeat new password" />
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.submitGradient}>
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>Save Changes</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    profilePicSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    profilePicContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        position: 'relative',
    },
    profilePic: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: 'white',
    },
    profilePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#dc2626',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    profilePicTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1f2937',
        marginTop: 15,
    },
    profilePicSubtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#dc2626',
        paddingLeft: 10,
    },
    inputWrapper: {
        marginBottom: 15,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginBottom: 5,
        marginLeft: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    inputIcon: {
        marginLeft: 15,
    },
    input: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    inputDisabled: {
        color: '#9ca3af',
    },
    inputError: {
        borderColor: '#ef4444',
        borderWidth: 2,
    },
    picker: {
        flex: 1,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        marginLeft: 5,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginTop: 5,
    },
    genderCard: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    activeGenderCard: {
        backgroundColor: '#dc2626',
        borderColor: '#dc2626',
    },
    genderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#6b7280',
        marginTop: 2,
    },
    activeGenderText: {
        color: 'white',
    },
    bloodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 5,
    },
    bloodChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minWidth: 50,
        alignItems: 'center',
    },
    activeBloodChip: {
        backgroundColor: '#fee2e2',
        borderColor: '#dc2626',
    },
    bloodChipText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#4b5563',
    },
    activeBloodChipText: {
        color: '#dc2626',
    },
    submitButton: {
        borderRadius: 15,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 4,
    },
    submitGradient: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    locationFetchBtn: {
        flexDirection: 'row',
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    locationFetchText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
});

export default EditProfileScreen;
