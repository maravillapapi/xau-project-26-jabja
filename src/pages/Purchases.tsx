import { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, Camera, Clock, Receipt } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type Purchase, getTimestamp, formatDate, formatTime, fileToBase64 } from '../db/database';

interface PurchasesPageProps {
    siteId: number;
}

export function PurchasesPage({ siteId }: PurchasesPageProps) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [receiptPreview, setReceiptPreview] = useState<string>('');
    const [receiptError, setReceiptError] = useState(false);

    const [formData, setFormData] = useState({
        item: '',
        amount: '',
        currency: 'USD',
        supplier: '',
        category: 'consumables' as Purchase['category'],
        notes: '',
        receiptPhoto: ''
    });

    useEffect(() => {
        loadPurchases();
    }, [siteId]);

    const loadPurchases = async () => {
        try {
            const data = await db.purchases.where('siteId').equals(siteId).reverse().sortBy('createdAt');
            setPurchases(data);
        } catch (error) {
            console.error('Error loading purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setReceiptPreview(base64);
                setFormData({ ...formData, receiptPhoto: base64 });
                setReceiptError(false);
            } catch (error) {
                console.error('Error uploading receipt:', error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate receipt is required
        if (!formData.receiptPhoto && !editingPurchase?.receiptPhoto) {
            setReceiptError(true);
            return;
        }

        try {
            const now = new Date();
            const purchaseData = {
                siteId,
                item: formData.item,
                amount: Number(formData.amount),
                currency: formData.currency,
                supplier: formData.supplier,
                category: formData.category,
                receiptPhoto: formData.receiptPhoto || editingPurchase?.receiptPhoto || '',
                purchaseDate: formatDate(now),
                purchaseTime: formatTime(now),
                notes: formData.notes,
                updatedAt: getTimestamp()
            };

            if (editingPurchase?.id) {
                await db.purchases.update(editingPurchase.id, purchaseData);
            } else {
                await db.purchases.add({
                    ...purchaseData,
                    createdAt: getTimestamp()
                });
            }

            await loadPurchases();
            closeModal();
        } catch (error) {
            console.error('Error saving purchase:', error);
        }
    };

    const handleEdit = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setFormData({
            item: purchase.item,
            amount: String(purchase.amount),
            currency: purchase.currency,
            supplier: purchase.supplier,
            category: purchase.category,
            notes: purchase.notes,
            receiptPhoto: ''
        });
        setReceiptPreview(purchase.receiptPhoto);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Supprimer cet achat ?')) {
            try {
                await db.purchases.delete(id);
                await loadPurchases();
            } catch (error) {
                console.error('Error deleting purchase:', error);
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPurchase(null);
        setReceiptPreview('');
        setReceiptError(false);
        setFormData({
            item: '',
            amount: '',
            currency: 'USD',
            supplier: '',
            category: 'consumables',
            notes: '',
            receiptPhoto: ''
        });
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            equipment: 'Équipement',
            consumables: 'Consommables',
            maintenance: 'Maintenance',
            transport: 'Transport',
            other: 'Autre'
        };
        return labels[cat] || cat;
    };

    const formatAmount = (amount: number, currency: string) => {
        return `${amount.toLocaleString()} ${currency}`;
    };

    const filteredPurchases = purchases.filter(p =>
        p.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalSpent = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1><DollarSign size={24} /> Achats</h1>
                        <p className="page-description">Gestion des achats avec reçus</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="card mb-md">
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Rechercher un achat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 40 }}
                    />
                </div>
                {filteredPurchases.length > 0 && (
                    <div className="mt-sm text-sm text-muted">
                        Total: <span className="font-bold text-gold">{formatAmount(totalSpent, 'USD')}</span>
                    </div>
                )}
            </div>

            {/* Quick Add Button - Mobile */}
            <button
                className="btn btn-primary btn-block mb-md"
                onClick={() => setIsModalOpen(true)}
                style={{ display: 'flex' }}
            >
                <Plus size={20} /> Nouvel achat
            </button>

            {/* Purchases List */}
            <div className="list-view">
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 100 }} /></div>
                ) : filteredPurchases.length > 0 ? (
                    filteredPurchases.map(purchase => (
                        <div key={purchase.id} className="list-item">
                            <div className="list-item-header">
                                <div>
                                    <div className="list-item-title">{purchase.item}</div>
                                    <div className="list-item-subtitle">{purchase.supplier}</div>
                                </div>
                                <div className="list-item-value">{formatAmount(purchase.amount, purchase.currency)}</div>
                            </div>
                            <div className="list-item-meta">
                                <span className="badge badge-gold">{getCategoryLabel(purchase.category)}</span>
                                <span className="text-xs text-muted flex items-center gap-sm">
                                    <Clock size={12} /> {purchase.purchaseDate} à {purchase.purchaseTime}
                                </span>
                            </div>
                            {purchase.receiptPhoto && (
                                <div className="mt-sm">
                                    <img
                                        src={purchase.receiptPhoto}
                                        alt="Reçu"
                                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                        onClick={() => window.open(purchase.receiptPhoto, '_blank')}
                                    />
                                </div>
                            )}
                            <div className="list-item-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(purchase)}>✏️ Modifier</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(purchase.id!)}>🗑️ Supprimer</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card empty-state">
                        <DollarSign />
                        <h3>Aucun achat</h3>
                        <p>Ajoutez votre premier achat avec reçu</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingPurchase ? 'Modifier l\'achat' : 'Nouvel achat'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingPurchase ? 'Enregistrer' : 'Ajouter'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Article <span className="form-required">*</span></label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: Huile moteur"
                            value={formData.item}
                            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Montant <span className="form-required">*</span></label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="500"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Devise</label>
                            <select
                                className="form-select"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="USD">USD</option>
                                <option value="CDF">CDF</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Fournisseur</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nom du fournisseur"
                            value={formData.supplier}
                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Catégorie</label>
                        <select
                            className="form-select"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as Purchase['category'] })}
                        >
                            <option value="equipment">Équipement</option>
                            <option value="consumables">Consommables</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="transport">Transport</option>
                            <option value="other">Autre</option>
                        </select>
                    </div>

                    {/* Receipt Upload - REQUIRED */}
                    <div className="form-group">
                        <label className="form-label">
                            <Receipt size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Reçu / Facture <span className="form-required">* Obligatoire</span>
                        </label>
                        <label className={`photo-upload ${receiptPreview ? 'has-photo' : ''} ${receiptError ? 'border-danger' : ''}`} style={receiptError ? { borderColor: 'var(--danger)' } : {}}>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleReceiptUpload}
                                style={{ display: 'none' }}
                            />
                            {receiptPreview ? (
                                <img src={receiptPreview} alt="Reçu" className="photo-preview" />
                            ) : (
                                <>
                                    <Camera size={32} className="photo-upload-icon" />
                                    <div className="photo-upload-text">Prendre une photo ou choisir</div>
                                    <div className="photo-upload-required">⚠️ Un reçu est obligatoire</div>
                                </>
                            )}
                        </label>
                        {receiptError && (
                            <div className="text-danger text-sm mt-sm">Veuillez ajouter un reçu pour valider l'achat</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Notes additionnelles..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}
