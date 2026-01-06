import { useState, useEffect } from 'react';
import { Gem, Users, DollarSign, TrendingUp, TrendingDown, Calendar, FileText, Plus, Clock, Target, CheckCircle } from 'lucide-react';
import { db, type Settings, getSettings, formatDate, getYesterdayDate, getMonthStart } from '../db/database';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
    siteId: number;
    onNavigate: (page: string) => void;
}

interface Stats {
    todayProduction: number;
    yesterdayProduction: number;
    weekProduction: number;
    lastWeekProduction: number;
    monthProduction: number;
    activeWorkers: number;
    todayPurchases: number;
    yesterdayPurchases: number;
    workingDaysThisMonth: number;
    dailyTarget: number;
}

export function Dashboard({ siteId, onNavigate }: DashboardProps) {
    const { user, viewMode, isAdmin, isSupervisor } = useAuth();
    const [stats, setStats] = useState<Stats>({
        todayProduction: 0, yesterdayProduction: 0, weekProduction: 0, lastWeekProduction: 0,
        monthProduction: 0, activeWorkers: 0, todayPurchases: 0, yesterdayPurchases: 0,
        workingDaysThisMonth: 0, dailyTarget: 300
    });
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('Bonjour');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Bonjour');
        else if (hour < 18) setGreeting('Bon après-midi');
        else setGreeting('Bonsoir');

        loadData();
    }, [siteId]);

    const loadData = async () => {
        try {
            const [settingsData, productions, workers, purchases] = await Promise.all([
                getSettings(),
                db.productions.where('siteId').equals(siteId).toArray(),
                db.workers.where('siteId').equals(siteId).toArray(),
                db.purchases.where('siteId').equals(siteId).toArray()
            ]);

            setSettings(settingsData);

            const today = formatDate();
            const yesterday = getYesterdayDate();
            const monthStart = getMonthStart();
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
            const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            const todayProd = productions.filter(p => p.date === today).reduce((s, p) => s + p.quantityGrams, 0);
            const yesterdayProd = productions.filter(p => p.date === yesterday).reduce((s, p) => s + p.quantityGrams, 0);
            const weekProd = productions.filter(p => new Date(p.date) >= weekAgo).reduce((s, p) => s + p.quantityGrams, 0);
            const lastWeekProd = productions.filter(p => new Date(p.date) >= twoWeeksAgo && new Date(p.date) < weekAgo).reduce((s, p) => s + p.quantityGrams, 0);
            const monthProd = productions.filter(p => p.date >= monthStart).reduce((s, p) => s + p.quantityGrams, 0);

            const uniqueDays = new Set(productions.filter(p => p.date >= monthStart).map(p => p.date));
            const todayPurch = purchases.filter(p => p.purchaseDate === today).reduce((s, p) => s + p.amount, 0);
            const yesterdayPurch = purchases.filter(p => p.purchaseDate === yesterday).reduce((s, p) => s + p.amount, 0);
            const active = workers.filter(w => w.status === 'active').length;

            setStats({
                todayProduction: todayProd, yesterdayProduction: yesterdayProd,
                weekProduction: weekProd, lastWeekProduction: lastWeekProd,
                monthProduction: monthProd, activeWorkers: active,
                todayPurchases: todayPurch, yesterdayPurchases: yesterdayPurch,
                workingDaysThisMonth: uniqueDays.size, dailyTarget: 300
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatG = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`;

    const getChange = (current: number, previous: number) => {
        if (previous === 0) return { value: 0, type: 'neutral' as const };
        const change = Math.round(((current - previous) / previous) * 100);
        return { value: change, type: change > 0 ? 'positive' as const : change < 0 ? 'negative' as const : 'neutral' as const };
    };

    const targetProgress = Math.min(100, Math.round((stats.todayProduction / stats.dailyTarget) * 100));

    if (loading) {
        return (
            <div className="main-content">
                <div className="stats-scroll">
                    {[1, 2, 3, 4].map(i => <div key={i} className="stat-card"><div className="skeleton" style={{ height: 100 }} /></div>)}
                </div>
            </div>
        );
    }

    const vsYesterday = getChange(stats.todayProduction, stats.yesterdayProduction);
    const vsLastWeek = getChange(stats.weekProduction, stats.lastWeekProduction);

    return (
        <div className="main-content animate-fade">
            {/* Greeting */}
            <div className="page-header">
                <div className="flex items-center gap-md">
                    <div className="avatar">
                        <div className="avatar-ring" />
                        <div className="avatar-inner">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                    </div>
                    <div>
                        <p className="text-muted text-sm">{greeting}</p>
                        <h1 style={{ fontSize: '1.375rem', marginTop: 0 }}>{user?.firstName} {user?.lastName}</h1>
                    </div>
                </div>
            </div>

            {/* Daily Target Progress - Worker View */}
            {viewMode === 'worker' && (
                <div className="card mb-md">
                    <div className="flex items-center justify-between mb-md">
                        <div className="flex items-center gap-sm">
                            <Target size={20} className="text-primary-color" />
                            <span className="font-semibold">Objectif du jour</span>
                        </div>
                        <span className="font-bold">{targetProgress}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${targetProgress}%`,
                            background: targetProgress >= 100 ? 'var(--success)' : 'var(--gradient-primary)',
                            borderRadius: 4,
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <div className="flex justify-between mt-sm text-sm text-muted">
                        <span>{formatG(stats.todayProduction)}</span>
                        <span>Objectif: {formatG(stats.dailyTarget)}</span>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-scroll">
                <div className="stat-card">
                    <div className="stat-icon gold"><Gem size={22} /></div>
                    <div className="stat-value">{formatG(stats.todayProduction)}</div>
                    <div className="stat-label">Aujourd'hui</div>
                    {settings?.showVsYesterday && vsYesterday.value !== 0 && (
                        <div className={`stat-change ${vsYesterday.type}`}>
                            {vsYesterday.type === 'positive' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {vsYesterday.value > 0 ? '+' : ''}{vsYesterday.value}%
                        </div>
                    )}
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Calendar size={22} /></div>
                    <div className="stat-value">{formatG(stats.weekProduction)}</div>
                    <div className="stat-label">Cette semaine</div>
                    {settings?.showVsLastWeek && vsLastWeek.value !== 0 && (
                        <div className={`stat-change ${vsLastWeek.type}`}>
                            {vsLastWeek.type === 'positive' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {vsLastWeek.value > 0 ? '+' : ''}{vsLastWeek.value}%
                        </div>
                    )}
                </div>

                {isSupervisor && (
                    <div className="stat-card">
                        <div className="stat-icon success"><Users size={22} /></div>
                        <div className="stat-value">{stats.activeWorkers}</div>
                        <div className="stat-label">Travailleurs actifs</div>
                    </div>
                )}

                {settings?.showWorkingDays && (
                    <div className="stat-card">
                        <div className="stat-icon"><CheckCircle size={22} /></div>
                        <div className="stat-value">{stats.workingDaysThisMonth}</div>
                        <div className="stat-label">Jours travaillés</div>
                    </div>
                )}
            </div>

            {/* Comparison Cards - Admin/Supervisor */}
            {isSupervisor && (settings?.showProductionComparison || settings?.showPurchaseComparison) && (
                <div className="comparison-grid mt-md">
                    {settings?.showProductionComparison && (
                        <>
                            <div className="comparison-card">
                                <div className="comparison-label">vs Hier</div>
                                <div className="comparison-value">{formatG(stats.todayProduction)}</div>
                                <div className={`comparison-change ${vsYesterday.type === 'positive' ? 'up' : vsYesterday.type === 'negative' ? 'down' : ''}`}>
                                    {vsYesterday.value > 0 ? '+' : ''}{vsYesterday.value}%
                                </div>
                            </div>
                            <div className="comparison-card">
                                <div className="comparison-label">vs Semaine</div>
                                <div className="comparison-value">{formatG(stats.weekProduction)}</div>
                                <div className={`comparison-change ${vsLastWeek.type === 'positive' ? 'up' : vsLastWeek.type === 'negative' ? 'down' : ''}`}>
                                    {vsLastWeek.value > 0 ? '+' : ''}{vsLastWeek.value}%
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
                <button className="quick-action" onClick={() => onNavigate('attendance')}>
                    <Clock size={28} />
                    Pointage
                </button>
                <button className="quick-action" onClick={() => onNavigate('production')}>
                    <Plus size={28} />
                    Production
                </button>
                {isSupervisor && (
                    <>
                        <button className="quick-action" onClick={() => onNavigate('purchases')}>
                            <DollarSign size={28} />
                            Achat
                        </button>
                        <button className="quick-action" onClick={() => onNavigate('reports')}>
                            <FileText size={28} />
                            Rapport
                        </button>
                    </>
                )}
            </div>

            {/* Month Summary - Admin/Supervisor */}
            {isSupervisor && (
                <div className="card mt-md">
                    <div className="card-title">
                        <TrendingUp size={20} />
                        Résumé mensuel
                    </div>
                    <div className="flex justify-between items-center" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                        <span className="text-muted">Production totale</span>
                        <span className="font-bold text-primary-color">{formatG(stats.monthProduction)}</span>
                    </div>
                    <div className="flex justify-between items-center" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                        <span className="text-muted">Jours travaillés</span>
                        <span className="font-semibold">{stats.workingDaysThisMonth} jours</span>
                    </div>
                    <div className="flex justify-between items-center" style={{ padding: '0.75rem 0' }}>
                        <span className="text-muted">Moyenne quotidienne</span>
                        <span className="font-semibold">{stats.workingDaysThisMonth > 0 ? formatG(Math.round(stats.monthProduction / stats.workingDaysThisMonth)) : '0 g'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
