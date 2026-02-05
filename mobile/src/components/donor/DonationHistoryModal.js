import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const DonationHistoryModal = ({ visible, onClose, donations }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.overlay} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Donation History</Text>
                            <Text style={styles.subtitle}>All your life-saving contributions</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {donations.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No donations found.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={donations}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.donationItem}>
                                    <View style={[styles.donationIcon, item.org_name && { backgroundColor: '#dc2626' }]}>
                                        <Ionicons name="water" size={24} color={item.org_name ? "white" : "#dc2626"} />
                                    </View>
                                    <View style={styles.donationDetails}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.donationDate}>
                                                {new Date(item.date).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            {item.org_name && (
                                                <Ionicons name="checkmark-circle" size={14} color="#dc2626" style={{ marginRight: 4 }} />
                                            )}
                                            <Text style={[styles.donationNotes, item.org_name && { color: '#dc2626' }]}>
                                                {item.org_name ? `Verified by ${item.org_name}` : (item.notes || 'Official Facility Record')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.donationUnits}>
                                        <Text style={styles.unitsText}>
                                            {Math.floor(item.units)} {Math.floor(item.units) === 1 ? 'Unit' : 'Units'}
                                        </Text>
                                    </View>

                                </View>
                            )}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'bold',
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    donationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    donationIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    donationDetails: {
        flex: 1,
        marginRight: 12,
    },
    donationDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    donationNotes: {
        fontSize: 12,
        color: '#4b5563',
        fontWeight: '900',
    },
    donationUnits: {
        backgroundColor: '#fff1f2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    unitsText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#dc2626',
        textTransform: 'uppercase',
    },

    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: 'bold',
        marginTop: 16,
    },
});

export default DonationHistoryModal;
