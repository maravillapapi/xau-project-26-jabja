import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Calendar, LogIn, LogOut, MapPin } from 'lucide-react';
import { db, formatDate, getTimestamp } from '../db/database';
import { useAuth } from '../contexts/AuthContext';

interface AttendanceRecord {
    id?: number;
    siteId: number;
    date: string;
    checkIn: string;
    checkOut: string | null;
    workerId: number;
    workerName: string;
    status: 'present' | 'absent' | 'late' | 'left_early';
}

interface AttendancePageProps {
    siteId: number;
}

export function AttendancePage({ siteId }: AttendancePageProps) {
    const { user, viewMode } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        loadTodayAttendance();
        return () => clearInterval(timer);
    }, [siteId]);

    const loadTodayAttendance = async () => {
        const today = formatDate();
        const savedRecords = localStorage.getItem(`attendance_${siteId}_${today}`);
        if (savedRecords) {
            const records = JSON.parse(savedRecords);
            setTodayRecords(records);
            const myRecord = records.find((r: AttendanceRecord) => r.workerId === user?.id);
            if (myRecord) {
                setIsCheckedIn(!myRecord.checkOut);
                setCheckInTime(myRecord.checkIn);
            }
        }
    };

    const handleCheckIn = () => {
        const time = currentTime.toTimeString().slice(0, 5);
        const today = formatDate();

        const newRecord: AttendanceRecord = {
            id: Date.now(),
            siteId,
            date: today,
            checkIn: time,
            checkOut: null,
            workerId: user?.id || 0,
            workerName: `${user?.firstName} ${user?.lastName}`,
            status: currentTime.getHours() >= 9 ? 'late' : 'present'
        };

        const updatedRecords = [...todayRecords, newRecord];
        setTodayRecords(updatedRecords);
        localStorage.setItem(`attendance_${siteId}_${today}`, JSON.stringify(updatedRecords));
        setIsCheckedIn(true);
        setCheckInTime(time);
    };

    const handleCheckOut = () => {
        const time = currentTime.toTimeString().slice(0, 5);
        const today = formatDate();

        const updatedRecords = todayRecords.map(record => {
            if (record.workerId === user?.id && !record.checkOut) {
                return { ...record, checkOut: time };
            }
            return record;
        });

        setTodayRecords(updatedRecords);
        localStorage.setItem(`attendance_${siteId}_${today}`, JSON.stringify(updatedRecords));
        setIsCheckedIn(false);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { cls: string; label: string }> = {
            present: { cls: 'badge-success', label: 'Présent' },
            absent: { cls: 'badge-danger', label: 'Absent' },
            late: { cls: 'badge-warning', label: 'En retard' },
            left_early: { cls: 'badge-warning', label: 'Parti tôt' }
        };
        return badges[status] || badges.present;
    };

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <h1><Clock size={26} /> Pointage</h1>
                <p className="page-description">Enregistrer votre présence</p>
            </div>

            {/* Check-in Card */}
            <div className="checkin-card">
                <div className="checkin-time">{formatTime(currentTime)}</div>
                <div className="checkin-date">{formatDateDisplay(currentTime)}</div>

                {!isCheckedIn ? (
                    <button className="checkin-btn" onClick={handleCheckIn}>
                        <LogIn size={20} style={{ display: 'inline', marginRight: 8 }} />
                        Pointer l'arrivée
                    </button>
                ) : (
                    <button className="checkin-btn checked" onClick={handleCheckOut}>
                        <LogOut size={20} style={{ display: 'inline', marginRight: 8 }} />
                        Pointer le départ
                    </button>
                )}
            </div>

            {/* Today's Status */}
            {isCheckedIn && checkInTime && (
                <div className="card mb-md">
                    <div className="flex items-center gap-md">
                        <div className="stat-icon success"><CheckCircle size={22} /></div>
                        <div>
                            <div className="font-bold">Présent aujourd'hui</div>
                            <div className="text-sm text-muted">Arrivée à {checkInTime}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="stats-scroll mb-md">
                <div className="stat-card">
                    <div className="stat-value text-success">{todayRecords.filter(r => r.status === 'present').length}</div>
                    <div className="stat-label">Présents</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{todayRecords.filter(r => r.status === 'late').length}</div>
                    <div className="stat-label">En retard</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{todayRecords.filter(r => r.checkOut).length}</div>
                    <div className="stat-label">Partis</div>
                </div>
            </div>

            {/* Today's Attendance List - Supervisor/Admin only */}
            {(viewMode === 'admin' || viewMode === 'supervisor') && (
                <div className="card">
                    <div className="card-title">
                        <Calendar size={20} />
                        Présences du jour
                    </div>
                    {todayRecords.length > 0 ? (
                        <div className="list-view" style={{ marginTop: '0.5rem' }}>
                            {todayRecords.map(record => {
                                const badge = getStatusBadge(record.status);
                                return (
                                    <div key={record.id} className="list-item" style={{ padding: '0.875rem' }}>
                                        <div className="list-item-header">
                                            <div>
                                                <div className="list-item-title">{record.workerName}</div>
                                                <div className="list-item-subtitle">
                                                    <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                    Arrivée: {record.checkIn}
                                                    {record.checkOut && ` • Départ: ${record.checkOut}`}
                                                </div>
                                            </div>
                                            <span className={`badge ${badge.cls}`}>{badge.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '1.5rem' }}>
                            Aucun pointage enregistré aujourd'hui
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
