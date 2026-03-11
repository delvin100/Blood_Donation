import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Linking,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const DonorDetailsModal = ({ visible, donor, onClose }) => {
    // Keep internal state of the last shown donor to avoid flicker on close/open
    const [displayDonor, setDisplayDonor] = React.useState(donor);

    React.useEffect(() => {
        if (donor) setDisplayDonor(donor);
    }, [donor]);

    const handleCall = () => {
        if (displayDonor) Linking.openURL(`tel:${displayDonor.phone}`);
    };

    const handleWhatsApp = () => {
        if (!displayDonor) return;
        const message = `Hello ${displayDonor.name}, I found your contact on eBloodBank. We are in need of ${displayDonor.blood_group} blood. Are you available to help?`;
        Linking.openURL(`whatsapp://send?phone=${displayDonor.phone}&text=${encodeURIComponent(message)}`);
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {displayDonor && (
                        <>
                            <View style={styles.header}>
                                <View style={styles.bloodBadge}>
                                    <Text style={styles.bloodType}>{displayDonor.blood_group}</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.infoSection}>
                                    <Text style={styles.donorName}>{displayDonor.name}</Text>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statValue}>{displayDonor.compatibility_score}%</Text>
                                        <Text style={styles.statLabel}>Match</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statValue}>{displayDonor.suitability_score}</Text>
                                        <Text style={styles.statLabel}>Score</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={[styles.statValue, { color: '#dc2626' }]}>
                                            {Math.round(displayDonor.ai_confidence * 100)}%
                                        </Text>
                                        <Text style={styles.statLabel}>AI Chance</Text>
                                    </View>
                                </View>

                                <View style={styles.detailCard}>
                                    <View style={styles.detailItem}>
                                        <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                                            <Ionicons name="location" size={20} color="#2563eb" />
                                        </View>
                                        <View style={styles.detailText}>
                                            <Text style={styles.detailLabel}>Location</Text>
                                            <Text style={styles.detailValue}>{displayDonor.city}, {displayDonor.district}</Text>
                                            <Text style={styles.detailSubValue}>{displayDonor.state}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
                                            <Ionicons name="navigate" size={20} color="#dc2626" />
                                        </View>
                                        <View style={styles.detailText}>
                                            <Text style={styles.detailLabel}>Distance</Text>
                                            <Text style={styles.detailValue}>
                                                {(displayDonor.distance === null || displayDonor.distance === Infinity) ? 'Not available' : `${displayDonor.distance} km away`}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailItem}>
                                        <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                                            <Ionicons name="calendar" size={20} color="#16a34a" />
                                        </View>
                                        <View style={styles.detailText}>
                                            <Text style={styles.detailLabel}>Availability</Text>
                                            <Text style={styles.detailValue}>Available Now</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.noticeBox}>
                                    <Ionicons name="information-circle" size={20} color="#94a3b8" />
                                    <Text style={styles.noticeText}>
                                        This donor has consented to be contacted for emergency blood requirements. Please be respectful during communication.
                                    </Text>
                                </View>
                            </ScrollView>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
                                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                                    <Text style={styles.buttonText}>WhatsApp</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                                    <Ionicons name="call" size={20} color="white" />
                                    <Text style={styles.buttonText}>Call</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalContent: {
        flex: 1,
        backgroundColor: 'white',
        padding: 24,
        paddingTop: 60,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bloodBadge: {
        backgroundColor: '#fef2f2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    bloodType: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#dc2626',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    donorName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 8,
    },
    verifiedText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingVertical: 12,
        borderRadius: 20,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    statLabel: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    detailCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        padding: 16,
        marginBottom: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailText: {
        marginLeft: 16,
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    detailSubValue: {
        fontSize: 13,
        color: '#94a3b8',
    },
    noticeBox: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    noticeText: {
        flex: 1,
        fontSize: 11,
        color: '#64748b',
        marginLeft: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    whatsappButton: {
        flex: 1,
        height: 56,
        backgroundColor: '#25d366',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    callButton: {
        flex: 1.2,
        height: 56,
        backgroundColor: '#dc2626',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DonorDetailsModal;
