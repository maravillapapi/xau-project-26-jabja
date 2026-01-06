import { useState, useEffect } from 'react';
import { FileText, Plus, Camera, Calendar, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type DailyReport, getTimestamp, formatDate, fileToBase64 } from '../db/database';

interface DailyReportsPageProps {
    siteId: number;
}

export function DailyReportsPage({ siteId }: DailyReportsPageProps) {
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
    const [photos, setPhotos] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        date: formatDate(),
        summary: '',
        incidents: '',
        observations: '',
        productionTotal: '',
        workersPresent: ''
    });

    useEffect(() => {
        loadReports();
    }, [siteId]);

    const loadReports = async () => {
        try {
            const data = await db.dailyReports.where('siteId').equals(siteId).reverse().sortBy('date');
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newPhotos: string[] = [];
            for (let i = 0; i < files.length && photos.length + newPhotos.length < 6; i++) {
                try {
                    const base64 = await fileToBase64(files[i]);
                    newPhotos.push(base64);
                } catch (error) {
                    console.error('Error uploading photo:', error);
                }
            }
            setPhotos([...photos, ...newPhotos]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const reportData = {
                siteId,
                date: formData.date,
                summary: formData.summary,
                incidents: formData.incidents,
                observations: formData.observations,
                photos: photos,
                productionTotal: Number(formData.productionTotal) || 0,
                workersPresent: Number(formData.workersPresent) || 0,
                updatedAt: getTimestamp()
            };

            if (editingReport?.id) {
                await db.dailyReports.update(editingReport.id, reportData);
            } else {
                await db.dailyReports.add({
                    ...reportData,
                    createdAt: getTimestamp()
                });
            }

            await loadReports();
            closeModal();
        } catch (error) {
            console.error('Error saving report:', error);
        }
    };

    const handleEdit = (report: DailyReport) => {
        setEditingReport(report);
        setFormData({
            date: report.date,
            summary: report.summary,
            incidents: report.incidents,
            observations: report.observations,
            productionTotal: String(report.productionTotal),
            workersPresent: String(report.workersPresent)
        });
        setPhotos(report.photos || []);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Supprimer ce rapport ?')) {
            try {
                await db.dailyReports.delete(id);
                await loadReports();
            } catch (error) {
                console.error('Error deleting report:', error);
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingReport(null);
        setPhotos([]);
        setFormData({
            date: formatDate(),
            summary: '',
            incidents: '',
            observations: '',
            productionTotal: '',
            workersPresent: ''
        });
    };

    const formatDateDisplay = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <h1><FileText size={24} /> Rapports journaliers</h1>
                <p className="page-description">Compte-rendus quotidiens avec photos</p>
            </div>

            {/* Quick Add */}
            <button className="btn btn-primary btn-block mb-md" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} /> Nouveau rapport
            </button>

            {/* Reports List */}
            <div className="list-view">
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 150 }} /></div>
                ) : reports.length > 0 ? (
                    reports.map(report => (
                        <div key={report.id} className="list-item">
                            <div className="list-item-header">
                                <div>
                                    <div className="list-item-title flex items-center gap-sm">
                                        <Calendar size={16} className="text-gold" />
                                        {formatDateDisplay(report.date)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-sm">
                                <div className="text-sm">{report.summary || <span className="text-muted">Pas de résumé</span>}</div>
                            </div>

                            {report.incidents && (
                                <div className="mt-sm" style={{ background: 'var(--danger-light)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                                    <div className="flex items-center gap-sm text-danger text-xs font-semibold">
                                        <AlertTriangle size={14} /> Incidents
                                    </div>
                                    <div className="text-sm" style={{ color: '#991b1b' }}>{report.incidents}</div>
                                </div>
                            )}

                            <div className="list-item-meta mt-sm">
                                <span className="badge badge-gold">Production: {report.productionTotal}g</span>
                                <span className="badge badge-success">{report.workersPresent} présents</span>
                            </div>

                            {report.photos && report.photos.length > 0 && (
                                <div className="photos-grid">
                                    {report.photos.slice(0, 3).map((photo, i) => (
                                        <img key={i} src={photo} alt={`Photo ${i + 1}`} onClick={() => window.open(photo, '_blank')} style={{ cursor: 'pointer' }} />
                                    ))}
                                    {report.photos.length > 3 && (
                                        <div className="photo-add" style={{ background: 'var(--bg-tertiary)' }}>
                                            +{report.photos.length - 3}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="list-item-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(report)}>✏️ Modifier</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(report.id!)}>🗑️ Supprimer</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card empty-state">
                        <FileText />
                        <h3>Aucun rapport</h3>
                        <p>Créez votre premier rapport journalier</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingReport ? 'Modifier le rapport' : 'Nouveau rapport'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingReport ? 'Enregistrer' : 'Créer'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Production totale (g)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="250"
                                value={formData.productionTotal}
                                onChange={(e) => setFormData({ ...formData, productionTotal: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Travailleurs présents</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="12"
                                value={formData.workersPresent}
                                onChange={(e) => setFormData({ ...formData, workersPresent: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Résumé de la journée</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Activités principales, avancement..."
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4, color: 'var(--warning)' }} />
                            Incidents / Problèmes
                        </label>
                        <textarea
                            className="form-textarea"
                            placeholder="Pannes, accidents, difficultés..."
                            value={formData.incidents}
                            onChange={(e) => setFormData({ ...formData, incidents: e.target.value })}
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Observations</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Notes, recommandations..."
                            value={formData.observations}
                            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    {/* Photos Upload */}
                    <div className="form-group">
                        <label className="form-label">
                            <Camera size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Photos (max 6)
                        </label>
                        <div className="photos-grid">
                            {photos.map((photo, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={photo} alt={`Photo ${i + 1}`} />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(i)}
                                        style={{
                                            position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                                            background: 'var(--danger)', border: 'none', borderRadius: '50%',
                                            color: 'white', fontSize: 12, cursor: 'pointer'
                                        }}
                                    >×</button>
                                </div>
                            ))}
                            {photos.length < 6 && (
                                <label className="photo-add">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        onChange={handlePhotoUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <Plus size={24} />
                                </label>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
