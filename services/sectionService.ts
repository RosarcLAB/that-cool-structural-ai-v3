// services/sectionService.ts: Service for managing global sections collection in Firestore
import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    type CollectionReference,
    type DocumentData,
    type Query
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { SectionProperties } from '../customTypes/SectionProperties';

class SectionService {
    private sectionsCollection: CollectionReference<DocumentData> | null = null;

    constructor() {
        if (isFirebaseConfigured && db) {
            this.sectionsCollection = collection(db, 'sections');
        }
    }

    private checkConfiguration(operation: string): void {
        if (!isFirebaseConfigured || !this.sectionsCollection) {
            throw new Error(`Firebase is not configured. Cannot ${operation}. Please add your credentials in config/firebase.ts.`);
        }
    }

    /**
     * Create a new section
     */
    async createSection(sectionData: SectionProperties): Promise<string> {
        this.checkConfiguration('create section');
        const { id, ...data } = sectionData; // Exclude client-side ID from Firestore document
        const docRef = await addDoc(this.sectionsCollection!, data);
        return docRef.id;
    }

    /**
     * Get a specific section
     */
    async getSection(sectionId: string): Promise<SectionProperties | null> {
        if (!isFirebaseConfigured || !db) return null;
        const sectionRef = doc(db, 'sections', sectionId);
        const sectionSnap = await getDoc(sectionRef);
        if (sectionSnap.exists()) {
            return { id: sectionSnap.id, ...sectionSnap.data() } as SectionProperties;
        }
        return null;
    }

    /**
     * Get all sections. Returns an empty array if Firebase is not configured.
     */
    async getAllSections(filter?: Partial<SectionProperties>): Promise<SectionProperties[]> {
        if (!isFirebaseConfigured || !this.sectionsCollection) {
            return []; // Fail gracefully for read operations
        }

        let q: Query<DocumentData> = this.sectionsCollection;
        if (filter?.material) {
            q = query(this.sectionsCollection, where('material', '==', filter.material));
        }
        const snapshot = await getDocs(q);
        const sections: SectionProperties[] = [];
        snapshot.forEach((doc) => {
            sections.push({ id: doc.id, ...doc.data() } as SectionProperties);
        });
        return sections;
    }

    /**
     * Update section
     */
    async updateSection(sectionId: string, updates: Partial<Omit<SectionProperties, 'id'>>): Promise<void> {
        this.checkConfiguration('update section');
        const sectionRef = doc(db!, 'sections', sectionId);
        await updateDoc(sectionRef, updates);
    }

    /**
     * Delete section
     */
    async deleteSection(sectionId: string): Promise<void> {
        this.checkConfiguration('delete section');
        const sectionRef = doc(db!, 'sections', sectionId);
        await deleteDoc(sectionRef);
    }
}

export const sectionService = new SectionService();
