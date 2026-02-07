import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../api/apiService';

const { width } = Dimensions.get('window');

const UrgentNeedsModal = ({ visible, onClose, user }) => {
    const [needs, setNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUrgentNeeds = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.get('/donor/urgent-needs');
            setNeeds(response.data);
        } catch (err) {
            setError('Failed to fetch urgent needs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchUrgentNeeds();
        }
    }, [visible]);

    const handleCall = (phone) => {
        Linking.openURL(`tel:${phone}`);
    };

    const renderItem = ({ item }) => {
        const isMatch = user?.blood_type === item.blood_group;

        return (
            <View style={[styles.card, isMatch && styles.matchCard]}>
                {isMatch && (
                    <LinearGradient
                        colors={['#e11d48', '#be123c']}
                        style={styles.matchBadge}
                    >
                        <Text style={styles.matchText}>MATCH!</Text>
                    </LinearGradient>
                )}

                <View style={styles.cardHeader}>
                    <View style={[styles.bloodBadge, isMatch && styles.matchBloodBadge]}>
                        <Text style={[styles.bloodText, isMatch && styles.matchBloodText]}>{item.blood_group}</Text>
                        <Text style={[styles.bloodLabel, isMatch && styles.matchBloodLabel]}>GROUP</Text>
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.orgName}>{item.org_name}</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={12} color="#9ca3af" />
                            <Text style={styles.locationText}>{item.org_city}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.unitsContainer}>
                    <Text style={styles.unitsValue}>{item.units_required}</Text>
                    <Text style={styles.unitsLabel}>Units Needed</Text>
                </View>

                <View style={styles.notesContainer}>
                    <Text style={styles.notes} numberOfLines={3}>
                        "{item.notes || 'Immediate donation requested.'}"
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.org_phone)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#111827', '#000000']}
                        style={styles.callBtnGradient}
                    >
                        <Ionicons name="call" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.callBtnText}>Connect Now</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Urgent Needs</Text>
                            <Text style={styles.subtitle}>Active Broadcasts</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#dc2626" style={styles.loader} />
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchUrgentNeeds} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : needs.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <LinearGradient
                                colors={['#ecfdf5', '#f0fdfa', '#ecfdf5']}
                                style={styles.emptyCard}
                            >
                                <View style={styles.emptyIconContainer}>
                                    <FontAwesome5 name="shield-alt" size={48} color="#10b981" />
                                </View>
                                <Text style={styles.emptyTitle}>All Clear!</Text>
                                <Text style={styles.emptySubtitle}>Community is Safe</Text>
                                <Text style={styles.emptyDesc}>
                                    There are no urgent blood requirements in your network at the moment.
                                </Text>
                            </LinearGradient>
                        </View>
                    ) : (
                        <FlatList
                            data={needs}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ef4444',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
    },
    loader: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    matchCard: {
        backgroundColor: '#fff1f2',
        borderColor: '#fecdd3',
        borderWidth: 2,
    },
    matchBadge: {
        position: 'absolute',
        top: -12,
        right: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        zIndex: 10,
    },
    matchText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    bloodBadge: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    matchBloodBadge: {
        backgroundColor: '#e11d48',
        shadowColor: '#e11d48',
    },
    bloodText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
    },
    matchBloodText: {
        color: 'white',
    },
    bloodLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    matchBloodLabel: {
        color: 'rgba(255,255,255,0.8)',
    },
    headerContent: {
        flex: 1,
    },
    orgName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    locationText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4b5563',
        textTransform: 'uppercase',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    unitsContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        alignItems: 'flex-end',
    },
    unitsValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
        lineHeight: 24,
    },
    unitsLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    notesContainer: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'white',
        marginBottom: 16,
    },
    notes: {
        fontSize: 13,
        color: '#4b5563',
        fontStyle: 'italic',
        lineHeight: 20,
        fontWeight: '500',
    },
    callBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    callBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    callBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emptyContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    emptyCard: {
        padding: 40,
        borderRadius: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'white',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#064e3b',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#047857',
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
        fontWeight: '500',
    },
});

export default UrgentNeedsModal;
