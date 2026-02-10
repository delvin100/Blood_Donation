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
    Linking,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import apiService from '../../api/apiService';
import { removeToken, removeUser } from '../../utils/storage';
import { parseError, logError } from '../../utils/errors';
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
    const [urgentNeeds, setUrgentNeeds] = useState([]);
    const [urgentNeedsCount, setUrgentNeedsCount] = useState(0);
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

    // Rank Calculation
    const getRankInfo = (count) => {
        if (count >= 11) return { current: 'Platinum', next: 'Max Level', progress: 100, icon: 'trophy', color: '#8b5cf6', nextCount: 11 };
        if (count >= 6) return { current: 'Gold', next: 'Platinum', progress: ((count - 5) / 5) * 100, icon: 'medal', color: '#eab308', nextCount: 11 };
        if (count >= 3) return { current: 'Silver', next: 'Gold', progress: ((count - 2) / 3) * 100, icon: 'medal', color: '#94a3b8', nextCount: 6 };
        return { current: 'Bronze', next: 'Silver', progress: (count / 3) * 100, icon: 'medal', color: '#cd7f32', nextCount: 3 };
    };
    const rankInfo = getRankInfo(donations.length);
    const totalAlerts = (stats.unreadNotifications || 0) + urgentNeedsCount;

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
            logError('Dashboard Data Error', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const [notifRes, urgentRes] = await Promise.all([
                apiService.get('/donor/notifications'),
                apiService.get('/donor/urgent-needs')
            ]);
            setNotifications(notifRes.data);
            setUrgentNeeds(urgentRes.data);
            setUrgentNeedsCount(urgentRes.data.length);
        } catch (error) {
            logError('Notifications Error', error);
        }
    };

    const markAsRead = async (id) => {
        if (typeof id === 'string' && id.startsWith('un-')) {
            setShowNotifications(false);
            setTimeout(() => setShowUrgentNeeds(true), 100);
            return;
        }
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
            logError('Mark Read Error', err);
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
            logError('Mark All Read Error', err);
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
                    {totalAlerts > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{totalAlerts}</Text>
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

                {/* Urgent Needs Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Urgent Requirements</Text>
                    <TouchableOpacity onPress={() => setShowUrgentNeeds(true)}>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>

                {urgentNeeds.length === 0 ? (
                    <LinearGradient
                        colors={['#ecfdf5', '#d1fae5']}
                        style={[styles.statusCard, { backgroundColor: '#ecfdf5', marginBottom: 20 }]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: 15, elevation: 5 }}>
                                <Ionicons name="shield-checkmark" size={28} color="white" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#065f46' }}>All Clear!</Text>
                                <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Community is safe. No urgent requests.</Text>
                            </View>
                        </View>
                    </LinearGradient>
                ) : (
                    urgentNeeds.slice(0, 1).map((item) => {
                        const isMatch = user?.blood_type === item.blood_group;
                        return (
                            <View key={item.id} style={[styles.card, isMatch && styles.matchCard, { marginBottom: 20 }]}>
                                {isMatch && (
                                    <LinearGradient colors={['#e11d48', '#be123c']} style={styles.matchBadge}>
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
                                    <Text style={styles.notes} numberOfLines={2}>"{item.notes || 'Immediate donation requested.'}"</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.callBtn}
                                    onPress={() => Linking.openURL(`tel:${item.org_phone}`)}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient colors={['#111827', '#000000']} style={styles.callBtnGradient}>
                                        <Ionicons name="call" size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.callBtnText}>{item.org_phone}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        );
                    })
                )}

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

                    {/* Dynamic Rank Card */}
                    <View style={[styles.statCard, styles.smallStatCard]}>
                        <LinearGradient
                            colors={[`${rankInfo.color}20`, `${rankInfo.color}05`]}
                            style={[styles.statIconContainer, styles.smallStatIconContainer]}
                        >
                            <FontAwesome5 name={rankInfo.icon} size={14} color={rankInfo.color} />
                        </LinearGradient>
                        <Text style={[styles.statValue, styles.smallStatValue, { color: rankInfo.color, fontSize: 14 }]}>{rankInfo.current}</Text>
                        <Text style={[styles.statLabel, styles.smallStatLabel, { fontSize: 9 }]}>
                            {donations.length} / {rankInfo.nextCount} Don
                        </Text>
                        <View style={{ width: '100%', height: 3, backgroundColor: '#f3f4f6', marginTop: 6, borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.min(rankInfo.progress, 100)}%`, height: '100%', backgroundColor: rankInfo.color, borderRadius: 2 }} />
                        </View>
                    </View>

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
                        <Text style={styles.viewAll}>View More</Text>
                    </TouchableOpacity>
                </View>

                {donations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No donations recorded yet.</Text>
                    </View>
                ) : (
                    donations.slice(0, 2).map((donation) => (
                        <DonationItem key={donation.id} donation={donation} />
                    ))
                )}

                {/* Latest Organization */}
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Text style={styles.sectionTitle}>My Organizations</Text>
                    {data?.memberships?.length > 0 && (
                        <TouchableOpacity onPress={() => setShowMyOrganizations(true)}>
                            <Text style={styles.viewAll}>View More</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {!data?.memberships || data.memberships.length === 0 ? (
                    <View style={styles.emptyState}>
                        <FontAwesome5 name="hospital-user" size={32} color="#d1d5db" />
                        <Text style={[styles.emptyText, { marginTop: 10 }]}>No memberships yet.</Text>
                    </View>
                ) : (
                    data.memberships.slice(0, 2).map((m, idx) => (
                        <View key={idx} style={[styles.donationItem, { borderLeftColor: '#3b82f6' }]}>
                            <View style={[styles.donationIconContainer, { backgroundColor: '#eff6ff' }]}>
                                <FontAwesome5 name={m.org_type === 'Hospital' ? 'hospital' : 'clinic-medical'} size={18} color="#3b82f6" />
                            </View>
                            <View style={styles.donationInfo}>
                                <Text style={styles.donationDate}>{m.org_name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <Text style={[styles.donationNotes, { color: '#3b82f6' }]}>{m.org_city} • {m.org_type}</Text>
                                </View>
                            </View>
                            <View>
                                <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>VERIFIED</Text>
                                </View>
                            </View>
                        </View>
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
                user={user}
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
                notifications={[
                    ...urgentNeeds.map(un => ({
                        id: `un-${un.id}`,
                        type: 'Emergency',
                        title: 'Urgent Requirement',
                        message: `${un.blood_group} required at ${un.org_name} (${un.org_city}).\nTap to view details.`,
                        created_at: un.created_at,
                        is_read: false
                    })),
                    ...notifications
                ]}
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

    // New Card Styles
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        position: 'relative',
        overflow: 'hidden',
    },
    matchCard: {
        borderColor: '#fda4af',
        backgroundColor: '#fff1f2',
    },
    matchBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 16,
    },
    matchText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    bloodBadge: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    matchBloodBadge: {
        backgroundColor: '#e11d48',
        elevation: 4,
        shadowColor: '#e11d48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    bloodText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
    },
    matchBloodText: {
        color: 'white',
    },
    bloodLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    matchBloodLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    headerContent: {
        flex: 1,
    },
    orgName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    unitsContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    unitsValue: {
        fontSize: 32,
        fontWeight: '900',
        color: '#111827',
        marginRight: 6,
    },
    unitsLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
    },
    notesContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'white',
        marginBottom: 16,
    },
    notes: {
        fontSize: 13,
        color: '#4b5563',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    callBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    callBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    callBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    viewAll: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#dc2626',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    emptyText: {
        color: '#9ca3af',
        fontWeight: 'bold',
        fontSize: 14,
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
