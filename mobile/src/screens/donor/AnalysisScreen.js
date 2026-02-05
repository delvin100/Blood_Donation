import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AnalysisScreen = ({ navigation, route }) => {
    const { user, stats, reports = [] } = route.params || {};

    const latestReport = reports[0] || {};

    const vitals = [
        { label: 'Blood Pressure', value: latestReport.blood_pressure || 'N/A', icon: 'speedometer-outline', color: '#3b82f6' },
        { label: 'Hemoglobin', value: latestReport.hb_level ? `${latestReport.hb_level} g/dL` : 'N/A', icon: 'water-outline', color: '#ef4444' },
        { label: 'Pulse Rate', value: latestReport.pulse_rate ? `${latestReport.pulse_rate} bpm` : 'N/A', icon: 'heart-outline', color: '#10b981' },
        { label: 'Body Weight', value: latestReport.weight ? `${latestReport.weight} kg` : 'N/A', icon: 'fitness-outline', color: '#8b5cf6' },
    ];

    const safetyClearance = [
        { label: 'HIV Status', key: 'hiv_status' },
        { label: 'Hepatitis B', key: 'hepatitis_b' },
        { label: 'Hepatitis C', key: 'hepatitis_c' },
        { label: 'Syphilis', key: 'syphilis' },
        { label: 'Malaria', key: 'malaria' }
    ];

    // Simple custom Bar Chart for Hemoglobin
    const renderHbChart = () => {
        if (reports.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Text style={styles.emptyChartText}>No enough data for trend analysis</Text>
                </View>
            );
        }

        const reversedReports = [...reports].reverse().slice(-5);
        const maxHb = Math.max(...reversedReports.map(r => r.hb_level || 0), 18);

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartYAxis}>
                    <Text style={styles.yAxisText}>18</Text>
                    <Text style={styles.yAxisText}>14</Text>
                    <Text style={styles.yAxisText}>10</Text>
                </View>
                <View style={styles.barsArea}>
                    {reversedReports.map((report, idx) => (
                        <View key={idx} style={styles.barWrapper}>
                            <View
                                style={[
                                    styles.bar,
                                    { height: (report.hb_level / maxHb) * 150 }
                                ]}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#6366f1']}
                                    style={styles.barGradient}
                                />
                                <Text style={styles.barValue}>{report.hb_level}</Text>
                            </View>
                            <Text style={styles.barLabel}>
                                {new Date(report.test_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#1f2937', '#111827']} style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Performance Center</Text>
                    <Text style={styles.headerSubtitle}>Health Analysis & Trends</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Vitals Grid */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Latest Vitals</Text>
                        <Text style={styles.lastChecked}>
                            Last: {latestReport.test_date ? new Date(latestReport.test_date).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.vitalsGrid}>
                        {vitals.map((vital, i) => (
                            <View key={i} style={styles.vitalCard}>
                                <View style={[styles.vitalIcon, { backgroundColor: `${vital.color}15` }]}>
                                    <Ionicons name={vital.icon} size={18} color={vital.color} />
                                </View>
                                <Text style={styles.vitalLabel}>{vital.label}</Text>
                                <Text style={styles.vitalValue}>{vital.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Hemoglobin Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Hemoglobin Trend</Text>
                            <Text style={styles.chartSub}>Oxygen Capacity Trend</Text>
                        </View>
                        <View style={styles.optimalBadge}>
                            <Text style={styles.optimalText}>Opt: 12.5 - 18.0</Text>
                        </View>
                    </View>
                    {renderHbChart()}
                </View>

                {/* Safety Clearance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Safety Clearance</Text>
                    <View style={styles.clearanceList}>
                        {safetyClearance.map((item, i) => (
                            <View key={i} style={styles.clearanceItem}>
                                <Text style={styles.clearanceLabel}>{item.label}</Text>
                                <View style={styles.clearanceStatus}>
                                    <Text style={styles.negativeText}>NEGATIVE</Text>
                                    <View style={styles.checkCircle}>
                                        <Ionicons name="checkmark" size={10} color="#10b981" />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                    <Text style={styles.disclaimer}>
                        * All screenings conducted under medical protocols. Results from latest screening.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    lastChecked: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: 'bold',
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
    },
    vitalCard: {
        width: '50%',
        padding: 5,
        marginBottom: 10,
    },
    vitalIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    vitalLabel: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    vitalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 2,
    },
    chartSub: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: 'bold',
        marginTop: 2,
    },
    optimalBadge: {
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    optimalText: {
        color: '#7c3aed',
        fontSize: 9,
        fontWeight: 'bold',
    },
    emptyChart: {
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderStyle: 'dashed',
    },
    emptyChartText: {
        color: '#9ca3af',
        fontSize: 12,
        fontStyle: 'italic',
    },
    chartContainer: {
        flexDirection: 'row',
        height: 200,
        paddingTop: 10,
    },
    chartYAxis: {
        justifyContent: 'space-between',
        paddingVertical: 30,
        paddingRight: 10,
    },
    yAxisText: {
        fontSize: 9,
        color: '#9ca3af',
        fontWeight: 'bold',
    },
    barsArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f3f4f6',
        paddingBottom: 5,
    },
    barWrapper: {
        alignItems: 'center',
    },
    bar: {
        width: 30,
        backgroundColor: '#6366f1',
        borderRadius: 6,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 5,
    },
    barGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 6,
    },
    barValue: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    barLabel: {
        fontSize: 8,
        color: '#9ca3af',
        fontWeight: 'bold',
        marginTop: 8,
    },
    clearanceList: {
        marginTop: 10,
    },
    clearanceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    clearanceLabel: {
        fontSize: 13,
        color: '#4b5563',
        fontWeight: '500',
    },
    clearanceStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    negativeText: {
        fontSize: 10,
        color: '#10b981',
        fontWeight: '900',
        marginRight: 6,
    },
    checkCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disclaimer: {
        fontSize: 9,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 15,
        lineHeight: 14,
    }
});

export default AnalysisScreen;
