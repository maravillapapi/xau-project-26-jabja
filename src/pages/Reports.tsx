import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Gem, Users, Box, TrendingUp, FileText } from 'lucide-react';
import { db, type Production, type Worker, type InventoryItem } from '../db/database';

interface ReportData {
    totalProduction: number;
    productionByTeam: Record<string, number>;
    productionByShift: Record<string, number>;
    activeWorkers: number;
    totalWorkers: number;
    inventoryValue: number;
    lowStockItems: number;
    dailyAverage: number;
}

export function ReportsPage() {
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateReport();
    }, [dateRange]);

    const generateReport = async () => {
        setLoading(true);
        try {
            const productions = await db.productions.toArray();
            const workers = await db.workers.toArray();
            const inventory = await db.inventory.toArray();

            // Filter productions by date range
            const filteredProductions = productions.filter(p =>
                p.date >= dateRange.start && p.date <= dateRange.end
            );

            // Calculate production stats
            const totalProduction = filteredProductions.reduce((sum, p) => sum + p.quantityGrams, 0);

            const productionByTeam: Record<string, number> = {};
            const productionByShift: Record<string, number> = {};

            filteredProductions.forEach(p => {
                productionByTeam[p.team] = (productionByTeam[p.team] || 0) + p.quantityGrams;
                productionByShift[p.shift] = (productionByShift[p.shift] || 0) + p.quantityGrams;
            });

            // Calculate workers stats
            const activeWorkers = workers.filter(w => w.status === 'active').length;

            // Calculate inventory stats
            const lowStockItems = inventory.filter(item => item.quantity <= item.minQuantity).length;

            // Calculate daily average
            const daysDiff = Math.max(1, Math.ceil(
                (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
            ));
            const dailyAverage = Math.round(totalProduction / daysDiff);

            setReportData({
                totalProduction,
                productionByTeam,
                productionByShift,
                activeWorkers,
                totalWorkers: workers.length,
                inventoryValue: inventory.length,
                lowStockItems,
                dailyAverage
            });
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = async () => {
        try {
            const productions = await db.productions
                .filter(p => p.date >= dateRange.start && p.date <= dateRange.end)
                .toArray();

            const headers = ['Date', 'Quantité (g)', 'Équipe', 'Quart', 'Notes'];
            const rows = productions.map(p => [
                p.date,
                p.quantityGrams,
                p.team,
                p.shift,
                p.notes
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `production_${dateRange.start}_${dateRange.end}.csv`;
            link.click();
        } catch (error) {
            console.error('Error exporting CSV:', error);
        }
    };

    const formatGrams = (grams: number): string => {
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(2)} kg`;
        }
        return `${grams} g`;
    };

    const getShiftLabel = (shift: string): string => {
        const labels: Record<string, string> = {
            morning: 'Matin',
            afternoon: 'Après-midi',
            night: 'Nuit'
        };
        return labels[shift] || shift;
    };

    const getPercentage = (value: number, total: number): number => {
        return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    return (
        <div className="main-content animate-fade-in">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>
                            <BarChart3 size={28} />
                            Rapports
                        </h1>
                        <p className="page-description">Analyses et exports de données</p>
                    </div>
                    <button className="btn btn-primary" onClick={exportCSV}>
                        <Download size={20} />
                        Exporter CSV
                    </button>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-md flex-wrap">
                    <Calendar size={20} className="text-muted" />
                    <span className="text-muted">Période :</span>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                    <span className="text-muted">à</span>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 'auto' }}
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card">
                            <div className="skeleton" style={{ height: 150 }} />
                        </div>
                    ))}
                </div>
            ) : reportData && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-4" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Gem />
                            </div>
                            <div className="stat-value">{formatGrams(reportData.totalProduction)}</div>
                            <div className="stat-label">Production totale</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <TrendingUp />
                            </div>
                            <div className="stat-value">{formatGrams(reportData.dailyAverage)}</div>
                            <div className="stat-label">Moyenne quotidienne</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <Users />
                            </div>
                            <div className="stat-value">{reportData.activeWorkers}/{reportData.totalWorkers}</div>
                            <div className="stat-label">Travailleurs actifs</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: reportData.lowStockItems > 0 ? 'var(--warning)' : 'var(--gradient-gold)' }}>
                                <Box />
                            </div>
                            <div className="stat-value">{reportData.lowStockItems}</div>
                            <div className="stat-label">Articles en stock bas</div>
                        </div>
                    </div>

                    {/* Detailed Reports */}
                    <div className="grid grid-2">
                        {/* Production by Team */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <Users size={20} />
                                    Production par équipe
                                </h3>
                            </div>
                            <div style={{ padding: 'var(--spacing-md)' }}>
                                {Object.entries(reportData.productionByTeam).length > 0 ? (
                                    Object.entries(reportData.productionByTeam)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([team, amount]) => (
                                            <div key={team} style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <div className="flex justify-between mb-xs">
                                                    <span className="font-medium">{team}</span>
                                                    <span className="text-gold font-semibold">{formatGrams(amount)}</span>
                                                </div>
                                                <div style={{
                                                    height: 8,
                                                    background: 'var(--bg-tertiary)',
                                                    borderRadius: 'var(--radius-full)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${getPercentage(amount, reportData.totalProduction)}%`,
                                                        height: '100%',
                                                        background: 'var(--gradient-gold)',
                                                        borderRadius: 'var(--radius-full)',
                                                        transition: 'width 0.5s ease'
                                                    }} />
                                                </div>
                                                <div className="text-sm text-muted mt-xs">
                                                    {getPercentage(amount, reportData.totalProduction)}% du total
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                                        <FileText />
                                        <p className="text-muted">Aucune donnée pour cette période</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Production by Shift */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <Calendar size={20} />
                                    Production par quart
                                </h3>
                            </div>
                            <div style={{ padding: 'var(--spacing-md)' }}>
                                {Object.entries(reportData.productionByShift).length > 0 ? (
                                    Object.entries(reportData.productionByShift)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([shift, amount]) => (
                                            <div key={shift} style={{ marginBottom: 'var(--spacing-md)' }}>
                                                <div className="flex justify-between mb-xs">
                                                    <span className="font-medium">{getShiftLabel(shift)}</span>
                                                    <span className="text-gold font-semibold">{formatGrams(amount)}</span>
                                                </div>
                                                <div style={{
                                                    height: 8,
                                                    background: 'var(--bg-tertiary)',
                                                    borderRadius: 'var(--radius-full)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${getPercentage(amount, reportData.totalProduction)}%`,
                                                        height: '100%',
                                                        background: 'var(--gradient-gold)',
                                                        borderRadius: 'var(--radius-full)',
                                                        transition: 'width 0.5s ease'
                                                    }} />
                                                </div>
                                                <div className="text-sm text-muted mt-xs">
                                                    {getPercentage(amount, reportData.totalProduction)}% du total
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="empty-state" style={{ padding: 'var(--spacing-lg)' }}>
                                        <FileText />
                                        <p className="text-muted">Aucune donnée pour cette période</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
