import Dexie, { type EntityTable } from 'dexie';

// Types
export interface Site {
    id?: number;
    name: string;
    location: string;
    isActive: boolean;
    createdAt: string;
}

export interface Production {
    id?: number;
    siteId: number;
    date: string;
    quantityGrams: number;
    team: string;
    shift: 'morning' | 'afternoon' | 'night';
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export interface Worker {
    id?: number;
    siteId: number;
    firstName: string;
    lastName: string;
    role: string;
    phone: string;
    team: string;
    status: 'active' | 'inactive' | 'leave';
    hireDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryItem {
    id?: number;
    siteId: number;
    name: string;
    category: 'equipment' | 'tools' | 'spare_parts' | 'consumables' | 'safety';
    quantity: number;
    unit: string;
    minQuantity: number;
    condition: 'good' | 'fair' | 'poor' | 'broken';
    location: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export interface Purchase {
    id?: number;
    siteId: number;
    item: string;
    amount: number;
    currency: string;
    supplier: string;
    category: 'equipment' | 'consumables' | 'maintenance' | 'transport' | 'other';
    receiptPhoto: string; // base64
    purchaseDate: string;
    purchaseTime: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export interface DailyReport {
    id?: number;
    siteId: number;
    date: string;
    summary: string;
    incidents: string;
    observations: string;
    photos: string[]; // base64 array
    productionTotal: number;
    workersPresent: number;
    createdAt: string;
    updatedAt: string;
}

export interface Settings {
    id?: number;
    showVsYesterday: boolean;
    showVsLastWeek: boolean;
    showWorkingDays: boolean;
    showProductionComparison: boolean;
    showPurchaseComparison: boolean;
    theme: 'dark' | 'light';
    language: 'fr' | 'en';
    updatedAt: string;
}

// Database class
class GoldMineDatabase extends Dexie {
    sites!: EntityTable<Site, 'id'>;
    productions!: EntityTable<Production, 'id'>;
    workers!: EntityTable<Worker, 'id'>;
    inventory!: EntityTable<InventoryItem, 'id'>;
    purchases!: EntityTable<Purchase, 'id'>;
    dailyReports!: EntityTable<DailyReport, 'id'>;
    settings!: EntityTable<Settings, 'id'>;

    constructor() {
        super('GoldMineCongo');

        this.version(2).stores({
            sites: '++id, name, isActive',
            productions: '++id, siteId, date, team, shift',
            workers: '++id, siteId, firstName, lastName, status',
            inventory: '++id, siteId, name, category',
            purchases: '++id, siteId, purchaseDate, category',
            dailyReports: '++id, siteId, date',
            settings: '++id'
        });
    }
}

export const db = new GoldMineDatabase();

// Helper functions
export const formatDate = (date: Date = new Date()): string => {
    return date.toISOString().split('T')[0];
};

export const formatTime = (date: Date = new Date()): string => {
    return date.toTimeString().split(' ')[0].slice(0, 5);
};

export const getTimestamp = (): string => {
    return new Date().toISOString();
};

// Get active site
export const getActiveSite = async (): Promise<Site | undefined> => {
    return await db.sites.where('isActive').equals(1).first();
};

// Comparison helpers
export const getYesterdayDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
};

export const getLastWeekDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDate(d);
};

export const getMonthStart = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
    });
};

// Seed data
export const seedDatabase = async () => {
    const sitesCount = await db.sites.count();

    if (sitesCount === 0) {
        // Add default site
        const siteId = await db.sites.add({
            name: 'Site Kolwezi',
            location: 'Kolwezi, Lualaba',
            isActive: true,
            createdAt: getTimestamp()
        });

        // Add default settings
        await db.settings.add({
            showVsYesterday: true,
            showVsLastWeek: true,
            showWorkingDays: true,
            showProductionComparison: true,
            showPurchaseComparison: true,
            theme: 'dark',
            language: 'fr',
            updatedAt: getTimestamp()
        });

        // Add sample workers
        await db.workers.bulkAdd([
            { siteId, firstName: 'Jean', lastName: 'Kabongo', role: 'Chef d\'équipe', phone: '+243 812 345 678', team: 'Équipe A', status: 'active', hireDate: '2023-01-15', createdAt: getTimestamp(), updatedAt: getTimestamp() },
            { siteId, firstName: 'Marie', lastName: 'Mutombo', role: 'Opératrice', phone: '+243 823 456 789', team: 'Équipe A', status: 'active', hireDate: '2023-03-20', createdAt: getTimestamp(), updatedAt: getTimestamp() },
            { siteId, firstName: 'Pierre', lastName: 'Tshisekedi', role: 'Mineur', phone: '+243 834 567 890', team: 'Équipe B', status: 'active', hireDate: '2022-11-10', createdAt: getTimestamp(), updatedAt: getTimestamp() },
        ]);

        // Add sample productions
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            await db.productions.add({
                siteId,
                date: formatDate(date),
                quantityGrams: Math.floor(Math.random() * 300) + 100,
                team: i % 2 === 0 ? 'Équipe A' : 'Équipe B',
                shift: ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)] as 'morning' | 'afternoon' | 'night',
                notes: '',
                createdAt: getTimestamp(),
                updatedAt: getTimestamp()
            });
        }

        // Add sample inventory
        await db.inventory.bulkAdd([
            { siteId, name: 'Foreuse hydraulique', category: 'equipment', quantity: 3, unit: 'unité', minQuantity: 2, condition: 'good', location: 'Entrepôt', notes: '', createdAt: getTimestamp(), updatedAt: getTimestamp() },
            { siteId, name: 'Casques de sécurité', category: 'safety', quantity: 25, unit: 'pièces', minQuantity: 20, condition: 'good', location: 'Vestiaire', notes: '', createdAt: getTimestamp(), updatedAt: getTimestamp() },
        ]);
    }
};

// Get settings
export const getSettings = async (): Promise<Settings> => {
    const settings = await db.settings.toCollection().first();
    return settings || {
        showVsYesterday: true,
        showVsLastWeek: true,
        showWorkingDays: true,
        showProductionComparison: true,
        showPurchaseComparison: true,
        theme: 'dark',
        language: 'fr',
        updatedAt: getTimestamp()
    };
};

export const updateSettings = async (updates: Partial<Settings>) => {
    const existing = await db.settings.toCollection().first();
    if (existing?.id) {
        await db.settings.update(existing.id, { ...updates, updatedAt: getTimestamp() });
    }
};
