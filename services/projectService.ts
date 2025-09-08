// services/projectService.ts: Service for managing projects in Firestore
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Project } from '../customTypes/types';
import { Element } from '../customTypes/structuralElement';
import { createDefaultProject } from '../components/utility/defaults';

class ProjectService {
  private projectsCollection = collection(db, 'projects');

  /**
   * Sanitize data for Firestore by removing undefined values
   */
  private sanitizeForFirestore(obj: any, path: string = ''): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.sanitizeForFirestore(item, `${path}[${index}]`));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          sanitized[key] = this.sanitizeForFirestore(value, path ? `${path}.${key}` : key);
        } else {
          // Log undefined values for debugging
          console.warn(`Removed undefined value at path: ${path ? `${path}.${key}` : key}`);
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Create a new project
   */
  async createProject(ownerId: string, projectName: string, projectData?: Partial<Project>): Promise<string> {
    const defaultProject = createDefaultProject(ownerId, projectName);
    const project: Omit<Project, 'id'> = {
      ...defaultProject,
      ...projectData,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(this.projectsCollection, project);
    return docRef.id;
  }

  /**
   * Get a specific project
   */
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
      }
      return null;
    } catch (error: unknown) {
      console.error('Error getting project:', error);
      return null;
    }
  }

  /**
   * Get all projects for a user (one-time fetch)
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    if (!userId) {
      throw new Error('User ID is required to fetch projects');
    }

    try {
      const q = query(
        this.projectsCollection,
        where('ownerId', '==', userId),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const projectPromises = snapshot.docs.map(async (doc) => {
        const projectData = doc.data();

        // Fetch elements to compute count
        const elementsRef = collection(db, 'projects', doc.id, 'elements');
        // Use simple orderBy to avoid composite index requirement
        const elementsSnapshot = await getDocs(query(elementsRef, orderBy('createdAt', 'desc')));
        const allElements = elementsSnapshot.docs.map(elementDoc => ({
          id: elementDoc.id,
          ...elementDoc.data()
        })) as Element[];

        // Filter active elements in memory
        const elements = allElements.filter(element => element.isActive !== false);

        return {
          id: doc.id,
          ...projectData,
          elements: elements,
          elementCount: elements.length, // Always compute from loaded elements
          isActive: projectData.isActive ?? true,
          createdAt: projectData.createdAt || new Date(),
          updatedAt: projectData.updatedAt || new Date()
        } as Project;
      });

      const projects = await Promise.all(projectPromises);
      return projects;
    } catch (error: unknown) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  }

  /**
   * Subscribe to projects for a user with enhanced error handling
   */
  subscribeToUserProjects(
      userId: string,
      callback: (projects: Project[]) => void,
      onError?: (error: Error) => void
  ): () => void {
      if (!userId) {
        console.warn('ProjectService: Cannot subscribe without userId');
        return () => {};
      }

      const q = query(
        this.projectsCollection,
        where('ownerId', '==', userId),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q,
        async (snapshot) => {
          try {
            const projectPromises = snapshot.docs.map(async (doc) => {
              const projectData = doc.data();

              // Fetch elements from the subcollection for each project
              const elementsRef = collection(db, 'projects', doc.id, 'elements');
              // Use simple orderBy to avoid composite index requirement
              const elementsSnapshot = await getDocs(query(elementsRef, orderBy('createdAt', 'desc')));
              const allElements = elementsSnapshot.docs.map(elementDoc => ({
                id: elementDoc.id,
                ...elementDoc.data()
              })) as Element[];

              // Filter active elements in memory
              const elements = allElements.filter(element => element.isActive !== false);

              return {
                id: doc.id,
                ...projectData,
                // Populate elements from the subcollection fetch
                elements: elements,
                // Always compute count from loaded elements (single source of truth)
                elementCount: elements.length,
                isActive: projectData.isActive ?? true,
                createdAt: projectData.createdAt || new Date(),
                updatedAt: projectData.updatedAt || new Date()
              } as Project;
            });

            const projects = await Promise.all(projectPromises);

            console.log(`ProjectService: Loaded ${projects.length} projects for user ${userId}`);
            callback(projects);
          } catch (processingError) {
              console.error('ProjectService: Error processing projects snapshot:', processingError);
              onError?.(processingError as Error);
          }
        },
        (error) => {
          console.error('ProjectService: Error in subscription:', error);
          if (error.code === 'failed-precondition') {
            console.error('Firestore Index Required: Please create a composite index for projects collection');
            console.error('Index fields: ownerId (Ascending), isActive (Ascending), updatedAt (Descending)');
          }
          onError?.(error);
        }
      );

      return unsubscribe;
    }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const { elements, ...otherUpdates } = updates;
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...otherUpdates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete project (soft delete)
   */
  async archiveProject(projectId: string): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Share project with another user
   */
  async shareProject(projectId: string, userEmail: string): Promise<void> {
    // TODO: Implement project sharing logic
    // This would typically involve adding the user to the project's participants array
    console.log('Project sharing not yet implemented', projectId, userEmail);
  }

  /**
   * Add element to project (implements Firestore ID best practices)
   */
  async addElementToProject(projectId: string, element: Element): Promise<string> {
    console.log('Adding element to project:', projectId);

    const elementsRef = collection(db, 'projects', projectId, 'elements');
    const projectRef = doc(db, 'projects', projectId);

    // Remove id field to avoid duplication with Firestore document ID
    const { id, ...elementDataWithoutId } = element;

    const elementToSave = {
      ...elementDataWithoutId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      version: 1
    };

    // Let Firestore auto-generate the document ID
    const docRef = await addDoc(elementsRef, elementToSave);

    // Update project timestamp only (elementCount will be computed when loaded)
    await updateDoc(projectRef, {
      updatedAt: serverTimestamp()
    });

    console.log('Element added with Firestore ID:', docRef.id);
    return docRef.id;
  }

  /**
   * Remove element from project
   */
  async removeElementFromProject(projectId: string, elementId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (project) {
      const updatedElements = project.elements.filter(el => el.id !== elementId);
      await this.updateProject(projectId, { elements: updatedElements });
    }
  }

  /**
   * Update element in project
   */
  async updateElementInProject(projectId: string, elementId: string, elementUpdates: any): Promise<void> {
    const project = await this.getProject(projectId);
    if (project) {
      const updatedElements = project.elements.map(el =>
        el.id === elementId ? { ...el, ...elementUpdates } : el
      );
      await this.updateProject(projectId, { elements: updatedElements });
    }
  }

  // ===========================================
  // ELEMENT SUBCOLLECTION METHODS
  // ===========================================

  /**
   * Save a new element to project's elements subcollection and update parent project
   */
  async saveElement(projectId: string, element: Element): Promise<string> {
    const elementsRef = collection(db, 'projects', projectId, 'elements');
    const projectRef = doc(db, 'projects', projectId);

    const elementToSave = {
      ...element,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1
    };

    // Sanitize data to remove undefined values before saving to Firestore
    const sanitizedElementToSave = this.sanitizeForFirestore(elementToSave);

    // Add element to subcollection
    const docRef = await addDoc(elementsRef, sanitizedElementToSave);

    // Update parent project document timestamp only (elementCount will be computed when loaded)
    await updateDoc(projectRef, {
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  /**
   * Update an existing element in project's elements subcollection and update parent project
   */
  async updateElement(projectId: string, elementId: string, element: Element): Promise<void> {
    console.log('Updating element:', elementId, 'in project:', projectId);

    const elementRef = doc(db, 'projects', projectId, 'elements', elementId);
    const projectRef = doc(db, 'projects', projectId);

    // Get current element to increment version
    const currentElement = await getDoc(elementRef);
    const currentVersion = currentElement.exists() ? currentElement.data()?.version || 1 : 1;

    // Remove id field to avoid overwriting Firestore document ID
    const { id, ...elementDataWithoutId } = element;

    const elementToUpdate = {
      ...elementDataWithoutId,
      updatedAt: serverTimestamp(),
      version: currentVersion + 1,
      previousVersion: currentVersion
    };

    // Sanitize data to remove undefined values before saving to Firestore
    const sanitizedElementToUpdate = this.sanitizeForFirestore(elementToUpdate);

    // Update element in subcollection
    await updateDoc(elementRef, sanitizedElementToUpdate);

    // Update parent project document timestamp only (elementCount doesn't change for updates)
    await updateDoc(projectRef, {
      updatedAt: serverTimestamp()
    });

    console.log('Element updated successfully');
  }

  /**
   * Upsert element: create new element if no id, otherwise update existing element.
   * Returns the element id (new or existing).
   */
  async upsertElement(projectId: string, element: Element): Promise<string> {
    if (!projectId) throw new Error('projectId is required to save element');
    // If element has an id assume update
    if (element.id) {
      await this.updateElement(projectId, element.id, element);
      return element.id;
    }
    // Otherwise create
    const newId = await this.saveElement(projectId, element);
    return newId;
  }

  /**
   * Get a specific element from project's elements subcollection
   */
  async getElement(projectId: string, elementId: string): Promise<Element | null> {
    try {
      const elementRef = doc(db, 'projects', projectId, 'elements', elementId);
      const elementSnap = await getDoc(elementRef);

      if (elementSnap.exists()) {
        return { id: elementSnap.id, ...elementSnap.data() } as Element;
      }
      return null;
    } catch (error) {
      console.error('Error getting element:', error);
      return null;
    }
  }

  /**
   * Get all elements from project's elements subcollection
   */
  async getProjectElements(projectId: string): Promise<Element[]> {
    try {
      const elementsRef = collection(db, 'projects', projectId, 'elements');
      // Use simple orderBy query to avoid composite index requirement
      const q = query(elementsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      // Filter active elements in memory to avoid index requirement
      const allElements = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Element[];

      // Filter out inactive elements (isActive === false)
      const activeElements = allElements.filter(element => element.isActive !== false);

      console.log(`Loaded ${activeElements.length} active elements out of ${allElements.length} total elements for project ${projectId}`);
      return activeElements;
    } catch (error) {
      console.error('Error getting project elements:', error);
      return [];
    }
  }

  /**
   * Subscribe to project elements changes (real-time)
   */
  subscribeToProjectElements(
    projectId: string,
    callback: (elements: Element[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const elementsRef = collection(db, 'projects', projectId, 'elements');
    // Use simple orderBy query to avoid composite index requirement
    const q = query(elementsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Get all elements and filter active ones in memory
        const allElements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Element[];

        // Filter out inactive elements (isActive === false)
        const activeElements = allElements.filter(element => element.isActive !== false);

        console.log(`Real-time update: ${activeElements.length} active elements out of ${allElements.length} total for project ${projectId}`);
        callback(activeElements);
      },
      (error) => {
        console.error('Error in elements subscription:', error);
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * Archive an element (soft delete with version history) and update parent project
   */
  async archiveElement(projectId: string, elementId: string): Promise<void> {
    console.log('archiveElement called with:', { projectId, elementId });

    if (!projectId || !elementId) {
      throw new Error('Invalid projectId or elementId provided');
    }

    const elementRef = doc(db, 'projects', projectId, 'elements', elementId);
    const projectRef = doc(db, 'projects', projectId);

    try {
      // Check if element exists first
      const elementSnap = await getDoc(elementRef);
      if (!elementSnap.exists()) {
        console.error('Element not found:', elementId);
        throw new Error(`Element with ID ${elementId} not found in project ${projectId}`);
      }

      console.log('Element found, archiving...');

      // Archive the element
      await updateDoc(elementRef, {
        isActive: false,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Element archived, updating project timestamp...');

      // Update parent project document timestamp only (elementCount will be computed when loaded)
      await updateDoc(projectRef, {
        updatedAt: serverTimestamp()
      });

      console.log('Project timestamp updated successfully');
    } catch (error) {
      console.error('Error in archiveElement:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing element in project's elements subcollection
   */
  async duplicateElement(projectId: string, elementId: string): Promise<string> {
    console.log('Duplicating element:', elementId, 'in project:', projectId);

    try {
      // Get the original element
      const originalElementRef = doc(db, 'projects', projectId, 'elements', elementId);
      const originalElementSnap = await getDoc(originalElementRef);

      if (!originalElementSnap.exists()) {
        throw new Error('Element not found');
      }

      const originalElement = originalElementSnap.data() as Element;

      // Create a copy with modified name and reset metadata
      // Remove fields that should not be copied or set to undefined
      const { id, previousVersion, designResults, isSaved, firestoreId, createdAt, updatedAt, version, archivedAt, ...cleanElement } = originalElement;

      const duplicatedElement = {
        ...cleanElement,
        name: `${originalElement.name} (Copy)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
        isSaved: false
        // Note: We don't include previousVersion, designResults, or other undefined fields
        // because Firestore doesn't support undefined values
      };

      // Save the duplicated element
      const elementsRef = collection(db, 'projects', projectId, 'elements');
      const docRef = await addDoc(elementsRef, duplicatedElement);

      // Update parent project document timestamp
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        updatedAt: serverTimestamp()
      });

      console.log('Element duplicated with new ID:', docRef.id);
      return docRef.id;

    } catch (error) {
      console.error('Error duplicating element:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();
