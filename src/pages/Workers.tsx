import { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, UserCheck, UserX, Clock } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type Worker, getTimestamp, formatDate } from '../db/database';

interface WorkersPageProps {
    siteId: number;
}

export function WorkersPage({ siteId }: WorkersPageProps) {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', role: '', phone: '', team: 'Équipe A',
        status: 'active' as 'active' | 'inactive' | 'leave', hireDate: formatDate()
    });

    useEffect(() => { loadWorkers(); }, [siteId]);

    const loadWorkers = async () => {
        try {
            const data = await db.workers.where('siteId').equals(siteId).sortBy('lastName');
            setWorkers(data);
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const workerData = { siteId, ...formData, updatedAt: getTimestamp() };
            if (editingWorker?.id) await db.workers.update(editingWorker.id, workerData);
            else await db.workers.add({ ...workerData, createdAt: getTimestamp() });
            await loadWorkers();
            closeModal();
        } catch (error) { console.error('Error:', error); }
    };

    const handleEdit = (w: Worker) => {
        setEditingWorker(w);
        setFormData({ firstName: w.firstName, lastName: w.lastName, role: w.role, phone: w.phone, team: w.team, status: w.status, hireDate: w.hireDate });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Supprimer ce travailleur ?')) { await db.workers.delete(id); await loadWorkers(); }
    };

    const closeModal = () => {
        setIsModalOpen(false); setEditingWorker(null);
        setFormData({ firstName: '', lastName: '', role: '', phone: '', team: 'Équipe A', status: 'active', hireDate: formatDate() });
    };

    const getStatusBadge = (s: string) => {
        const badges: Record<string, { cls: string; icon: JSX.Element; label: string }> = {
            active: { cls: 'badge-success', icon: <UserCheck size={12} />, label: 'Actif' },
            inactive: { cls: 'badge-danger', icon: <UserX size={12} />, label: 'Inactif' },
            leave: { cls: 'badge-warning', icon: <Clock size={12} />, label: 'En congé' }
        };
        const b = badges[s] || badges.active;
        return <span className={`badge ${b.cls}`}>{b.icon} {b.label}</span>;
    };

    const filteredWorkers = workers.filter(w => {
        const fullName = `${w.firstName} ${w.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || w.role.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch && (!filterStatus || w.status === filterStatus);
    });

    const activeCount = workers.filter(w => w.status === 'active').length;

    return (
        <div className="main-content animate-fade">
            <div className="page-header"><h1><Users size={24} /> Personnel</h1><p className="page-description">Gestion des travailleurs</p></div>

            <div className="stats-scroll mb-md">
                <div className="stat-card"><div className="stat-value">{workers.length}</div><div className="stat-label">Total</div></div>
                <div className="stat-card"><div className="stat-value text-success">{activeCount}</div><div className="stat-label">Actifs</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{workers.filter(w => w.status === 'leave').length}</div><div className="stat-label">En congé</div></div>
            </div>

            <div className="card mb-md">
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
                </div>
                <select className="form-select mt-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="active">Actif</option><option value="inactive">Inactif</option><option value="leave">En congé</option>
                </select>
            </div>

            <button className="btn btn-primary btn-block mb-md" onClick={() => setIsModalOpen(true)}><Plus size={20} /> Nouveau travailleur</button>

            <div className="list-view">
                {loading ? <div className="card"><div className="skeleton" style={{ height: 100 }} /></div> : filteredWorkers.length > 0 ? (
                    filteredWorkers.map(w => (
                        <div key={w.id} className="list-item">
                            <div className="list-item-header">
                                <div><div className="list-item-title">{w.firstName} {w.lastName}</div><div className="list-item-subtitle">{w.role}</div></div>
                                {getStatusBadge(w.status)}
                            </div>
                            <div className="list-item-meta">
                                <span className="badge badge-gold">{w.team}</span>
                                <span className="text-xs text-muted flex items-center gap-sm"><Phone size={12} />{w.phone}</span>
                            </div>
                            <div className="list-item-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(w)}>✏️ Modifier</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(w.id!)}>🗑️</button>
                            </div>
                        </div>
                    ))
                ) : <div className="card empty-state"><Users /><h3>Aucun travailleur</h3><p>Ajoutez votre premier membre</p></div>}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingWorker ? 'Modifier' : 'Nouveau travailleur'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Annuler</button><button className="btn btn-primary" onClick={handleSubmit}>{editingWorker ? 'Enregistrer' : 'Ajouter'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-2">
                        <div className="form-group"><label className="form-label">Prénom</label><input type="text" className="form-input" placeholder="Jean" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Nom</label><input type="text" className="form-input" placeholder="Kabongo" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Rôle</label><input type="text" className="form-input" placeholder="Mineur" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Téléphone</label><input type="tel" className="form-input" placeholder="+243..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                    <div className="grid grid-2">
                        <div className="form-group"><label className="form-label">Équipe</label><select className="form-select" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })}><option>Équipe A</option><option>Équipe B</option><option>Équipe C</option></select></div>
                        <div className="form-group"><label className="form-label">Statut</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'leave' })}><option value="active">Actif</option><option value="inactive">Inactif</option><option value="leave">En congé</option></select></div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
