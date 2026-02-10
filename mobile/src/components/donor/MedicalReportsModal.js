import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import apiService from '../../api/apiService';
import { parseError, logError } from '../../utils/errors';

const MedicalReportsModal = ({ visible, onClose }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewingPdfId, setViewingPdfId] = useState(null);
    const [downloadingPdfId, setDownloadingPdfId] = useState(null);

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.get('/donor/reports');
            setReports(response.data);
        } catch (err) {
            setError(parseError(err));
            logError('Medical Reports Fetch', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchReports();
        }
    }, [visible]);

    const generatePDFContent = async (report) => {
        // Check if expo-print is available
        let Print;
        try {
            Print = require('expo-print');
        } catch (e) {
            Alert.alert('Dependency Required', 'Please run "npx expo install expo-print expo-sharing" to enable PDF features.');
            throw e;
        }

        const dateStr = new Date(report.test_date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 60px; margin: 0; color: #1e293b; background: white; }
                    
                    .header { 
                        border-bottom: 4px solid #dc2626;
                        padding-bottom: 30px;
                        margin-bottom: 40px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }
                    .header-left h1 { margin: 0; font-size: 36px; font-weight: 900; color: #0f172a; }
                    .header-left p { margin: 8px 0 0 0; font-size: 14px; color: #64748b; font-weight: 700; }
                    
                    .header-right { text-align: right; }
                    .brand { font-weight: 900; color: #dc2626; font-size: 24px; margin-bottom: 4px; }
                    .tagline { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 40px;
                        margin-bottom: 40px;
                    }
                    .info-section h3 { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; margin-bottom: 15px; font-weight: 900; }
                    .info-value { font-size: 18px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
                    .info-sub { font-size: 13px; color: #64748b; font-weight: 500; }
                    
                    .blood-badge {
                        display: inline-block;
                        margin-top: 15px;
                        background: #fff1f1;
                        color: #dc2626;
                        padding: 8px 24px;
                        border-radius: 9999px;
                        font-weight: 900;
                        font-size: 14px;
                        border: 1px solid rgba(220, 38, 38, 0.1);
                        box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05);
                    }
                    
                    .vitals-card {
                        background: #f8fafc;
                        border: 1px solid #f1f5f9;
                        border-radius: 24px;
                        padding: 30px;
                        margin-bottom: 40px;
                    }
                    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
                    .vital-item label { display: block; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
                    .vital-val { font-size: 20px; font-weight: 900; color: #1e293b; }
                    .vital-unit { font-size: 12px; color: #94a3b8; font-weight: 700; margin-left: 4px; }
                    .critical { color: #dc2626; }
                    
                    .section-title { font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
                    
                    .test-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                    .test-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px 20px;
                        background: white;
                        border: 1px solid #f1f5f9;
                        border-radius: 16px;
                    }
                    .test-name { font-weight: 700; color: #475569; font-size: 14px; }
                    .test-status {
                        font-size: 11px;
                        font-weight: 900;
                        text-transform: uppercase;
                        padding: 4px 12px;
                        border-radius: 8px;
                    }
                    .neg { background: #f0fdf4; color: #166534; }
                    .pos { background: #fef2f2; color: #991b1b; }
                    
                    .notes-box {
                        margin-top: 40px;
                        background: rgba(243, 244, 246, 0.5);
                        border-radius: 16px;
                        padding: 24px;
                        border: 1px solid #f1f5f9;
                        font-style: italic;
                        color: #475569;
                        line-height: 1.6;
                        font-weight: 500;
                    }
                    
                    .footer {
                        margin-top: 60px;
                        padding-top: 30px;
                        border-top: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .footer-left { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
                    .signature { text-align: center; width: 200px; }
                    .sig-line { height: 1px; background: #e2e8f0; margin-bottom: 8px; }
                    .sig-label { font-size: 10px; font-weight: 900; color: #1e293b; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <h1>Medical Report</h1>
                        <p>Ref ID: #REP-${String(report.id || 0).padStart(6, '0')}</p>
                    </div>
                    <div class="header-right">
                        <div class="brand">eBloodBank</div>
                        <div class="tagline">Life Saving Network</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-section">
                        <h3>Donor Information</h3>
                        <div class="info-value">${report.donor_name || 'Donor'}</div>
                        <div class="info-sub">${report.donor_email || 'Verified Donor'}</div>
                        <div class="blood-badge">Blood Group: ${report.blood_group} ${report.rh_factor}</div>
                    </div>
                    <div class="info-section" style="text-align: right;">
                        <h3>Organization</h3>
                        <div class="info-value">${report.org_name || 'Certified Facility'}</div>
                        <div class="info-sub">Date: ${dateStr}</div>
                        <div class="info-sub">Status: Verified & Signed</div>
                    </div>
                </div>
                
                <div class="vitals-card">
                    <div class="section-title">Medical Vitals</div>
                    <div class="grid-3">
                        <div class="vital-item">
                            <label>HB Level</label>
                            <div class="vital-val">${report.hb_level}<span class="vital-unit">g/dL</span></div>
                        </div>
                        <div class="vital-item">
                            <label>Blood Pressure</label>
                            <div class="vital-val">${report.blood_pressure || 'N/A'}<span class="vital-unit">mmHg</span></div>
                        </div>
                        <div class="vital-item">
                            <label>Pulse Rate</label>
                            <div class="vital-val">${report.pulse_rate || 'N/A'}<span class="vital-unit">bpm</span></div>
                        </div>
                        <div class="vital-item">
                            <label>Weight</label>
                            <div class="vital-val">${report.weight || 'N/A'}<span class="vital-unit">kg</span></div>
                        </div>
                        <div class="vital-item">
                            <label>Temperature</label>
                            <div class="vital-val">${report.temperature || 'N/A'}<span class="vital-unit">°C</span></div>
                        </div>
                        <div class="vital-item">
                            <label>Units Donated</label>
                            <div class="vital-val critical">${Math.floor(report.units_donated || 1)}<span class="vital-unit">${Math.floor(report.units_donated || 1) === 1 ? 'Unit' : 'Units'}</span></div>

                        </div>
                    </div>
                </div>
                    
                <div class="section-title">Screening Results</div>
                <div class="test-grid">
                    <div class="test-item">
                        <span class="test-name">HIV Status</span>
                        <span class="test-status ${report.hiv_status === 'Negative' ? 'neg' : 'pos'}">${report.hiv_status || 'N/A'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-name">Hepatitis B</span>
                        <span class="test-status ${report.hepatitis_b === 'Negative' ? 'neg' : 'pos'}">${report.hepatitis_b || 'N/A'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-name">Hepatitis C</span>
                        <span class="test-status ${report.hepatitis_c === 'Negative' ? 'neg' : 'pos'}">${report.hepatitis_c || 'N/A'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-name">Syphilis</span>
                        <span class="test-status ${report.syphilis === 'Negative' ? 'neg' : 'pos'}">${report.syphilis || 'N/A'}</span>
                    </div>
                    <div class="test-item">
                        <span class="test-name">Malaria</span>
                        <span class="test-status ${report.malaria === 'Negative' ? 'neg' : 'pos'}">${report.malaria || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="notes-box">
                    ${report.remarks || report.notes || 'No medical complications noted during this donation session.'}
                </div>
                
                <div class="footer">
                    <div class="footer-left">
                        System Generated Report • eBloodBank Certified
                    </div>
                    <div class="signature">
                        <div class="sig-line"></div>
                        <div class="sig-label">Medical Officer Signature</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        return uri;
    };

    const viewPDF = async (report) => {
        if (viewingPdfId || downloadingPdfId) return;
        setViewingPdfId(report.id);
        try {
            const uri = await generatePDFContent(report);

            // Open in external viewer
            if (Platform.OS === 'android') {
                const contentUri = await getContentUriAsync(uri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                    type: 'application/pdf'
                });
            } else {
                // For iOS, use sharing to view
                const Sharing = require('expo-sharing');
                await Sharing.shareAsync(uri, {
                    UTI: '.pdf',
                    mimeType: 'application/pdf'
                });
            }
        } catch (error) {
            logError('PDF View Error', error);
            Alert.alert('Error', parseError(error));
        } finally {
            setViewingPdfId(null);
        }
    };

    const downloadPDF = async (report) => {
        if (viewingPdfId || downloadingPdfId) return;
        setDownloadingPdfId(report.id);
        try {
            const uri = await generatePDFContent(report);

            // Download/Share the PDF - works in Expo Go
            const Sharing = require('expo-sharing');
            await Sharing.shareAsync(uri, {
                UTI: '.pdf',
                mimeType: 'application/pdf',
                dialogTitle: 'Save Medical Report'
            });
        } catch (error) {
            logError('PDF Download Error', error);
            Alert.alert('Error', parseError(error));
        } finally {
            setDownloadingPdfId(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.reportIcon}>
                    <Ionicons name="document-text" size={24} color="#6366f1" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.orgName}>{item.org_name}</Text>
                    <Text style={styles.date}>
                        {new Date(item.test_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity
                    style={styles.viewPdfBtn}
                    onPress={() => viewPDF(item)}
                    disabled={!!viewingPdfId || !!downloadingPdfId}
                >
                    {viewingPdfId === item.id ? (
                        <ActivityIndicator color="#6366f1" size="small" />
                    ) : (
                        <>
                            <Ionicons name="eye-outline" size={16} color="#6366f1" />
                            <Text style={styles.viewPdfBtnText}>View PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.downloadTextBtn}
                    onPress={() => downloadPDF(item)}
                    disabled={!!viewingPdfId || !!downloadingPdfId}
                >
                    {downloadingPdfId === item.id ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={16} color="white" />
                            <Text style={styles.downloadBtnText}>Share PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {item.remarks && (
                <View style={styles.remarksBox}>
                    <Text style={styles.remarksTitle}>Remarks:</Text>
                    <Text style={styles.remarksText}>{item.remarks}</Text>
                </View>
            )}
        </View>
    );

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
                        <Text style={styles.title}>Medical Reports</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchReports} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : reports.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="document-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No medical reports found.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={reports}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.list}
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
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
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
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: 'normal',
        marginTop: 16,
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#6366f1',
        borderRadius: 10,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        padding: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    reportIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    orgName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    date: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'bold',
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 16,
    },
    statLabel: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    statusFit: {
        backgroundColor: '#f0fdf4',
        borderColor: '#dcfce7',
    },
    statusText: {
        color: '#4b5563',
        fontSize: 11,
        fontWeight: 'bold',
    },
    statusFitText: {
        color: '#166534',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    viewPdfBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    viewPdfBtnText: {
        color: '#6366f1',
        fontSize: 12,
        fontWeight: 'bold',
    },
    downloadIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f3ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadTextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#6366f1',
        borderRadius: 8,
    },
    downloadBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    remarksBox: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    remarksTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    remarksText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
});

export default MedicalReportsModal;
