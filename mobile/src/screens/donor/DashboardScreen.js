import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../../api/apiService';
import { removeToken, removeUser } from '../../utils/storage';
import CompleteProfileModal from '../../components/common/CompleteProfileModal';
import UrgentNeedsModal from '../../components/donor/UrgentNeedsModal';
import MedicalReportsModal from '../../components/donor/MedicalReportsModal';
import MyOrganizationsModal from '../../components/donor/MyOrganizationsModal';
import NotificationsModal from '../../components/donor/NotificationsModal';
import DonationHistoryModal from '../../components/donor/DonationHistoryModal';
import AnalysisModal from '../../components/donor/AnalysisModal';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCompleteProfile, setShowCompleteProfile] = useState(false);
    const [showUrgentNeeds, setShowUrgentNeeds] = useState(false);
    const [showMedicalReports, setShowMedicalReports] = useState(false);
    const [showMyOrganizations, setShowMyOrganizations] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showDonationHistory, setShowDonationHistory] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const user = data?.user;
    const stats = data?.stats || {};
    const donations = data?.donations || [];
    const reports = data?.reports || [];

    // Calculate additional stats
    const totalUnits = donations.reduce((sum, d) => sum + (Number(d.units) || 0), 0);
    const lastDonationDate = donations.length > 0
        ? new Date(donations[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'N/A';
    const latestHb = reports.length > 0 ? `${reports[0].hb_level}` : '--';

    useEffect(() => {
        fetchDashboardData();
        fetchNotifications();

        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!stats?.nextEligibleDate) return;
        const target = new Date(stats.nextEligibleDate).getTime();

        const updateTimer = () => {
            const currentTime = new Date().getTime();
            const diff = target - currentTime;
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                fetchDashboardData();
                return false;
            } else {
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                });
                return true;
            }
        };

        // Update immediately
        const shouldContinue = updateTimer();
        if (!shouldContinue) return;

        const timer = setInterval(() => {
            if (!updateTimer()) {
                clearInterval(timer);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [stats?.nextEligibleDate]);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, reportsRes] = await Promise.all([
                apiService.get('/donor/stats'),
                apiService.get('/donor/reports')
            ]);

            const stats = statsRes.data;
            const reports = reportsRes.data;
            setData({ ...stats, reports });

            // Pass to global state in App.js via navigation proxy
            navigation.setParams({ stats, reports, user: stats.user });

            if (stats.user && !stats.user.blood_type) {
                setShowCompleteProfile(true);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await apiService.get('/donor/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await apiService.patch(`/donor/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            // Update unread count locally
            if (data?.stats) {
                setData(prev => ({
                    ...prev,
                    stats: {
                        ...prev.stats,
                        unreadNotifications: Math.max(0, prev.stats.unreadNotifications - 1)
                    }
                }));
            }
        } catch (err) {
            console.error('Error marking read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await apiService.patch('/donor/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            if (data?.stats) {
                setData(prev => ({
                    ...prev,
                    stats: { ...prev.stats, unreadNotifications: 0 }
                }));
            }
        } catch (err) {
            console.error('Error marking all read:', err);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData();
    }, []);

    const handleLogout = async () => {
        await removeToken();
        await removeUser();
        navigation.navigate('Login');
    };

    if (isLoading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#dc2626" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.leftIconButton}
                    onPress={() => navigation.navigate('EditProfile', { user })}
                    activeOpacity={0.7}
                >
                    {user?.profile_picture ? (
                        <Image
                            source={{ uri: `http://192.168.137.1:4000${user.profile_picture}` }}
                            style={styles.headerProfilePic}
                        />
                    ) : (
                        <Ionicons name="person-circle-outline" size={32} color="#dc2626" />
                    )}
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.userName}>{user?.full_name || 'Donor'}</Text>
                </View>

                <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={() => setShowNotifications(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="notifications-outline" size={24} color="#dc2626" />
                    {stats.unreadNotifications > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{stats.unreadNotifications}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={24} color="#dc2626" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />}
            >
                {/* Eligibility Status */}
                <LinearGradient
                    colors={stats.isEligible ? ['#10b981', '#059669'] : ['#4b5563', '#374151']}
                    style={styles.statusCard}
                >
                    <View style={styles.statusInfo}>
                        <Ionicons name={stats.isEligible ? 'checkmark-circle' : 'time'} size={48} color="white" />
                        <View style={styles.statusTextContainer}>
                            <Text style={styles.statusTitle}>
                                {stats.isEligible ? 'Fit to Save' : 'In Recovery'}
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {stats.isEligible
                                    ? 'You are eligible to donate blood today!'
                                    : `Next eligibility: ${new Date(stats.nextEligibleDate).toLocaleDateString()}`}
                            </Text>
                            {!stats.isEligible && timeLeft.days + timeLeft.hours + timeLeft.minutes + timeLeft.seconds > 0 && (
                                <View style={styles.timerContainer}>
                                    <View style={styles.timerItem}>
                                        <Text style={styles.timerValue}>{timeLeft.days}</Text>
                                        <Text style={styles.timerLabel}>Days</Text>
                                    </View>
                                    <Text style={styles.timerSeparator}>:</Text>
                                    <View style={styles.timerItem}>
                                        <Text style={styles.timerValue}>{timeLeft.hours}</Text>
                                        <Text style={styles.timerLabel}>Hrs</Text>
                                    </View>
                                    <Text style={styles.timerSeparator}>:</Text>
                                    <View style={styles.timerItem}>
                                        <Text style={styles.timerValue}>{timeLeft.minutes}</Text>
                                        <Text style={styles.timerLabel}>Min</Text>
                                    </View>
                                    <Text style={styles.timerSeparator}>:</Text>
                                    <View style={styles.timerItem}>
                                        <Text style={styles.timerValue}>{timeLeft.seconds}</Text>
                                        <Text style={styles.timerLabel}>Sec</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* Primary Stats */}
                <View style={styles.primaryStatsContainer}>
                    <StatCard
                        icon="water"
                        label="Blood Group"
                        value={user?.blood_type || '--'}
                        color="#dc2626"
                        isPrimary
                    />
                    <StatCard
                        icon="calendar"
                        label="Last Donated"
                        value={lastDonationDate}
                        color="#10b981"
                        isPrimary
                    />
                </View>

                {/* Secondary Stats Scroller */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.secondaryStatsContainer, { paddingRight: 20 }]}
                >
                    <StatCard
                        icon="heart"
                        label="Lives Saved"
                        value={stats.livesSaved || 0}
                        color="#ec4899"
                        isSmall
                    />
                    <StatCard
                        icon="medkit"
                        label="Total Units"
                        value={`${totalUnits}U`}
                        color="#8b5cf6"
                        isSmall
                    />
                    <StatCard
                        icon="trophy"
                        label="Donor Level"
                        value={stats.milestone || 'Bronze'}
                        color="#f59e0b"
                        isSmall
                    />
                    <StatCard
                        icon="fitness"
                        label="Latest Hb"
                        value={latestHb}
                        color="#3b82f6"
                        isSmall
                    />
                    <StatCard
                        icon="star"
                        label="Donations"
                        value={donations.length || 0}
                        color="#6366f1"
                        isSmall
                    />
                </ScrollView>

                {/* Main Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Medical & Analysis</Text>
                </View>
                <View style={styles.medicalActionContainer}>
                    <MedicalAction
                        icon="alert-circle"
                        label="Urgent Needs"
                        onPress={() => setShowUrgentNeeds(true)}
                        color="#ef4444"
                        description="View urgent blood requests"
                    />
                    <MedicalAction
                        icon="document-text"
                        label="Medical Reports"
                        onPress={() => setShowMedicalReports(true)}
                        color="#6366f1"
                        description="Your blood test results"
                    />
                    <MedicalAction
                        icon="stats-chart"
                        label="Health Analysis"
                        onPress={() => setShowAnalysis(true)}
                        color="#10b981"
                        description="Deep dive into your health"
                    />
                    <MedicalAction
                        icon="people"
                        label="My Organizations"
                        onPress={() => setShowMyOrganizations(true)}
                        color="#8b5cf6"
                        description="Manage your memberships"
                    />
                </View>

                {/* Recent Donations */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Donations</Text>
                    <TouchableOpacity onPress={() => setShowDonationHistory(true)}>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                {donations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No donations recorded yet.</Text>
                    </View>
                ) : (
                    donations.slice(0, 4).map((donation) => (
                        <DonationItem key={donation.id} donation={donation} />
                    ))
                )}
            </ScrollView>

            <CompleteProfileModal
                visible={showCompleteProfile}
                onClose={() => setShowCompleteProfile(false)}
                onSuccess={onRefresh}
            />

            <UrgentNeedsModal
                visible={showUrgentNeeds}
                onClose={() => setShowUrgentNeeds(false)}
            />

            <MedicalReportsModal
                visible={showMedicalReports}
                onClose={() => setShowMedicalReports(false)}
            />

            <MyOrganizationsModal
                visible={showMyOrganizations}
                onClose={() => setShowMyOrganizations(false)}
                memberships={data?.memberships}
            />

            <AnalysisModal
                visible={showAnalysis}
                onClose={() => setShowAnalysis(false)}
                user={user}
                stats={stats}
                reports={data?.reports}
            />

            <NotificationsModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllRead={markAllRead}
            />

            <DonationHistoryModal
                visible={showDonationHistory}
                onClose={() => setShowDonationHistory(false)}
                donations={donations}
            />

            {/* AI Assistant FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('Chatbot', { user, stats })}
                activeOpacity={0.8}
            >
                <FontAwesome5 name="robot" size={24} color="white" />

            </TouchableOpacity>
        </SafeAreaView>
    );
};

const StatCard = ({ icon, label, value, color, isPrimary, isSmall }) => (
    <View style={[
        styles.statCard,
        isPrimary && styles.primaryStatCard,
        isSmall && styles.smallStatCard
    ]}>
        <LinearGradient
            colors={[`${color}20`, `${color}05`]}
            style={[
                styles.statIconContainer,
                isSmall && styles.smallStatIconContainer
            ]}
        >
            <Ionicons name={icon} size={isSmall ? 18 : 24} color={color} />
        </LinearGradient>
        <Text style={[styles.statValue, isSmall && styles.smallStatValue]}>{value}</Text>
        <Text style={[styles.statLabel, isSmall && styles.smallStatLabel]}>{label}</Text>
    </View>
);

const MedicalAction = ({ icon, label, onPress, color, description }) => (
    <TouchableOpacity style={styles.medicalActionItem} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.medicalActionIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={28} color="white" />
        </View>
        <View style={styles.medicalActionText}>
            <Text style={styles.medicalActionLabel}>{label}</Text>
            <Text style={styles.medicalActionDesc}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
);

const DonationItem = ({ donation }) => (
    <View style={styles.donationItem}>
        <View style={[styles.donationIconContainer, donation.org_name && { backgroundColor: '#dc2626' }]}>
            <Ionicons name="water" size={20} color={donation.org_name ? "white" : "#dc2626"} />
        </View>
        <View style={styles.donationInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.donationDate}>
                    {new Date(donation.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                {donation.org_name && (
                    <Ionicons name="checkmark-circle" size={14} color="#dc2626" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.donationNotes, donation.org_name && { color: '#dc2626' }]}>
                    {donation.org_name ? `Verified by ${donation.org_name}` : (donation.notes || 'Routine donation')}
                </Text>
            </View>
        </View>
        <View style={styles.donationUnits}>
            <Text style={styles.unitsText}>
                {Math.floor(donation.units)} {Math.floor(donation.units) === 1 ? 'Unit' : 'Units'}
            </Text>
        </View>

    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
        backgroundColor: 'white',
    },
    profileButton: {
        marginRight: 12,
    },
    leftIconButton: {
        marginRight: 12,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerProfilePic: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    profilePic: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fee2e2',
    },
    profilePlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
    },
    greeting: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileNavButton: {
        marginHorizontal: 4,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIconButton: {
        marginHorizontal: 4,
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#dc2626',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 24,
    },
    statusCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    statusTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    statusSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 4,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 10,
        borderRadius: 15,
    },
    timerItem: {
        alignItems: 'center',
        minWidth: 40,
    },
    timerValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    timerLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    timerSeparator: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 2,
    },
    primaryStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    primaryStatCard: {
        width: (width - 60) / 2,
        padding: 24,
        borderRadius: 28,
        backgroundColor: 'white',
        borderWidth: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryStatsContainer: {
        paddingBottom: 24,
        paddingRight: 24,
    },
    smallStatCard: {
        width: 105,
        marginRight: 10,
        padding: 16,
        borderRadius: 20,
        backgroundColor: 'white',
        elevation: 2,
        alignItems: 'center',
    },
    smallStatIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallStatValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    smallStatLabel: {
        fontSize: 10,
        marginTop: 2,
    },
    medicalActionContainer: {
        marginBottom: 32,
    },
    medicalActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    medicalActionIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    medicalActionText: {
        flex: 1,
    },
    medicalActionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    medicalActionDesc: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.5,
    },
    viewAll: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: 'bold',
    },
    donationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    donationIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    donationInfo: {
        flex: 1,
        marginRight: 12,
    },
    donationDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    donationNotes: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: '600',
        marginTop: 12,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,

        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    }
});

export default DashboardScreen;
