// App.tsx: The main application component that orchestrates the entire UI and state management.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Action, FilePayload, CanvasItem, StandardLoads, CanvasBeamInputItem, ConfirmAttachmentAnalysisAction, StatusMessage, Project } from './customTypes/types';
import { BeamInput, Element as StructuralElement, SupportFixityType, LoadType, LoadCaseType, LoadCombinationUtils } from './customTypes/structuralElement';
import { MaterialType, SectionProperties } from './customTypes/SectionProperties';
import { getAiDecision } from './services/geminiService';
import { analyzeBeam, designAllCombinations } from './services/analysisService';
import { sectionService } from './services/sectionService';
import { projectService } from './services/projectService';
import { isFirebaseConfigured } from './config/firebase';
import { BeamAnalysisDisplay, type BeamAnalysisDisplayHandle } from './components/structuralEngineering/BeamAnalysisDisplay';
import { UploadDrawingModal } from './components/chat/UploadDrawingModal';
import { ManageSectionsModal } from './components/structuralEngineering/ManageSectionsModal';
import { Canvas } from './components/Canvas';
import { ChatIcon, PanelRightOpenIcon, PanelLeftCloseIcon, FolderIcon } from './components/utility/icons';
import { MainChatInterface } from './components/chat/MainChatInterface';
import { ProcessAiDecision } from './AIProcesses/ProcessAiDecision';
import { ProcessAiActions } from './AIProcesses/ProcessAiActions';
import SignIn from './components/auth/SignIn';
import { auth } from './config/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ProjectsDrawer } from './components/projects/ProjectsDrawer';
import { ConfirmDeleteModal } from './components/utility/ConfirmDeleteModal';
import { UserProfileModal } from './components/auth/UserProfile';
import { projectTransferRegistry } from './services/projectTransferRegistry';


const MAX_HISTORY_STATES = 30;
type AppContext = 'chat' | 'canvas' | 'attachm.';
type FormMode = 'create' | 'edit' | 'duplicate';

const App: React.FC = () => {
  //#region constants and states
  // State for managing the list of chat messages.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // State for storing snapshots of the message history for the undo functionality.
  const [history, setHistory] = useState<ChatMessage[][]>([]);
  // State for the user's current input in the chat box.
  const [userInput, setUserInput] = useState('');
  // State to hold the file selected by the user for upload.
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  // State to indicate when the app is busy (e.g., waiting for AI response or analysis).
  const [isLoading, setIsLoading] = useState(false);
  // State to control the visibility of the drawing upload modal.
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // State to control visibility of the sections management modal
  const [isSectionsModalOpen, setIsSectionsModalOpen] = useState(false);
  // State for managing items pinned to the canvas.
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  // State to control the visibility of the canvas panel.
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  // State to track the currently selected item in the canvas.
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  // State to determine the context of user commands (chat or canvas).
  const [context, setContext] = useState<AppContext>('chat');
  // State for the current authenticated user
  const [user, setUser] = useState<User | null>(null);
  // Ref to hold handles for all rendered BeamAnalysisDisplay components to allow programmatic control.
  const analysisDisplayRefs = useRef<Record<string, BeamAnalysisDisplayHandle | null>>({});
  // State for managing the width of the resizable canvas panel.
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth / 3);
  // State to hold the global library of structural sections.
  const [sections, setSections] = useState<SectionProperties[]>([]);
  // State to hold the global library of projects.
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsDrawerOpen, setIsProjectsDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [elementToDelete, setElementToDelete] = useState<StructuralElement | null>(null);
  //User profile
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  
  //#endregion





  //#region Call backs
  /** 
   *  Fetches or refreshes the list of sections from the database. 
   * */
  const refreshSections = useCallback(async () => {
    try {
        const fetchedSections = await sectionService.getAllSections();
        setSections(fetchedSections);
        // Optional: add a success status message if needed
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addMessage({ sender: 'ai', text: `Error fetching sections: ${errorMessage}`, type: 'error' });
    }
  }, []);

  /** Fetches or refreshes the list of projects from the database. */
  const refreshProjects = useCallback(async () => {
    try {
        const userId = user?.uid || 'demo-user-id'; // Use actual user ID if authenticated
        const fetchedProjects = await projectService.getUserProjects(userId);
        setProjects(fetchedProjects);
        // Optional: add a success status message if needed
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.warn(`Error fetching projects: ${errorMessage}`);
        // Don't show error message to user for now, as this might be expected during development
        // addMessage({ sender: 'ai', text: `Error fetching projects: ${errorMessage}`, type: 'error' });
    }
  }, [user]);
  //#endregion






  //#region useEffects
  // Initial fetch of sections when the app loads.
  useEffect(() => {
    refreshSections();
  }, [refreshSections]);

  // Initial fetch of projects when the app loads.
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Listen for authentication state changes
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
      });
      return unsubscribe;
    }
  }, []);
  //#endregion






  //#region Message Management
  /** Saves a snapshot of the current messages state to the history for undo purposes. */
  const saveHistorySnapshot = () => {
    setHistory(prev => {
        const newHistory = [...prev, messages];
        // Cap the history size to prevent excessive memory usage.
        if (newHistory.length > MAX_HISTORY_STATES) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_STATES);
        }
        return newHistory;
    });
  };

  /** Handles the undo action, reverting the chat to its last saved state. */
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
        const lastState = history[history.length - 1];
        setMessages(lastState);
        setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  /** Utility function to add a new message to the chat history.
   * Using useCallback to ensure function identity is stable where needed.
   */
  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage = { ...message, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);
  
  // Effect to validate the selected context and provide user feedback.
  useEffect(() => {
    // Validate 'canvas' context
    if (context === 'canvas' && canvasItems.length === 0) {
      addMessage({
        sender: 'ai',
        text: "The 'Canvas' context is not available because there are no items pinned to the canvas. I've switched you back to the 'Chat' context.",
        type: 'error',
      });
      setContext('chat');
    }
    // Validate 'attachm.' context
    else if (context === 'attachm.' && !fileToUpload) {
      addMessage({
        sender: 'ai',
        text: "The 'Attachm.' context is not available because there is no file attached. Please attach a file first. I've switched you back to the 'Chat' context.",
        type: 'error',
      });
      setContext('chat');
    }
  }, [context, canvasItems, fileToUpload, addMessage]);

  /** Generic handler to deactivate a form in a message */
  const deactivateFormInMessage = useCallback((messageId: string, formIndex: number) => {
      setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId && msg.isFormActive) {
          const newIsFormActive = [...msg.isFormActive];
          newIsFormActive[formIndex] = false;
          return { ...msg, isFormActive: newIsFormActive };
        }
        return msg;
      })
    );
  }, []);
  //#endregion





  //#region Form Handlers



  //#region --- BeamInput ---
  /**
   * Handles changes to the beam input form within a specific message.
   * @param messageId - The ID of the message containing the form.
   * @param formIndex - The index of the form within the message (for messages with multiple forms).
   * @param updatedData - The updated beam input data from the form.
   */
  const handleBeamFormChange = useCallback((messageId: string, formIndex: number, updatedData: BeamInput) => {
      setMessages(prev =>
        prev.map(msg => {
            if (msg.id === messageId && msg.beamInputsData) {
                const newBeamInputsData = [...msg.beamInputsData];
                newBeamInputsData[formIndex] = updatedData;
                return { ...msg, beamInputsData: newBeamInputsData };
            }
            return msg;
        })
      );
  }, []);

  /** Handles the submission of the beam input form.
   * Initiates analysis and updates the chat with results or errors.
   * @param data - The beam input data.
   * @param messageId - The ID of the message being updated.
   * @param formIndex - The index of the form being submitted.
   */
  const handleBeamFormSubmit = useCallback(async (data: BeamInput, messageId: string, formIndex: number) => {
    deactivateFormInMessage(messageId, formIndex);
    setIsLoading(true);
    const thinkingMsg = addMessage({ sender: 'ai', text: `Analyzing "${data.Name}"...`, type: 'text' });

    try {
      const result = await analyzeBeam(data);
      addMessage({
        sender: 'ai',
        text: `Analysis complete for "${data.Name}". Here are the results:`,
        type: 'beam_output_display',
        beamOutputData: result,
        beamInputsData: [data],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addMessage({ sender: 'ai', text: `Analysis Failed: ${errorMessage}`, type: 'error' });
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.filter(m => m.id !== thinkingMsg.id)); // remove "analyzing..." message
    }
  }, [deactivateFormInMessage, addMessage]);

  /** Handles cancellation of the beam input form.
   * Deactivates the form and resets any temporary state.
   */
  const handleBeamFormCancel = useCallback((messageId: string, formIndex: number) => {
    deactivateFormInMessage(messageId, formIndex);
  }, [deactivateFormInMessage]);
  //#endregion






  //#region --- Element ---
  const handleElementFormChange = useCallback((messageId: string, formIndex: number, updatedData: StructuralElement) => {
      setMessages(prev =>
        prev.map(msg => {
            if (msg.id === messageId && msg.elementData) {
                const newElementData = [...msg.elementData];
                newElementData[formIndex] = updatedData;
                return { ...msg, elementData: newElementData };
            }
            return msg;
        })
      );
  }, []);
  
  /**
   * Handles the submission of the structural element form.
   * @param data - The structural element data.
   * @param messageId - The ID of the message being updated.
   * @param formIndex - The index of the form being submitted.
   */
  const handleElementFormSubmit = useCallback(async (data: StructuralElement, messageId: string, formIndex: number) => {
    // Create a local elementData copy
    let elementData: StructuralElement = { ...data };

    // Clear element status locally and show loading state in the message
    elementData.statusMessage = undefined;
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'loading', message: `Preparing design for "${elementData.name}"...`, timestamp: new Date().toLocaleTimeString() } } : msg));

    try {
      // 1) Validate at least one load combination exists (we can still rely on reaction generator to add missing reaction combos later)
      if (!elementData.loadCombinations || elementData.loadCombinations.length === 0) {
        const errMsg = `Cannot design "${elementData.name}": no load combinations found.`;
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'error', message: errMsg, timestamp: new Date().toLocaleTimeString() } } : msg));
        return;
      }

      // 2) Ensure individual reaction load combinations exist (idempotent)
      const comboUtils = new LoadCombinationUtils();
      elementData = comboUtils.reactionLoadCombinations(elementData, { forceRegenerate: false, includeInactive: false, customFactors: {} });

      // Update message status: starting design
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'loading', message: `Designing "${elementData.name}" (${elementData.loadCombinations?.length || 0} combos)...`, timestamp: new Date().toLocaleTimeString() } } : msg));

      // 3) Call design API for all combinations
      const { results: designResults, updatedElement: elementWithReactions } = await designAllCombinations(elementData);

      // 4) Attach results and metadata
      // Build a minimal StatusMessage.user object and cast through unknown to satisfy our app User type
      const statusUser = user ? ({
        id: (user as any).uid || '',
        firstName: (user as any).displayName ? String((user as any).displayName).split(' ')[0] : '',
        lastName: (user as any).displayName ? String((user as any).displayName).split(' ').slice(1).join(' ') : '',
        email: (user as any).email || '',
        displayName: (user as any).displayName || '',
        country: '',
        discipline: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        role: ''
      } as unknown as any) : undefined;

      const updatedElement: StructuralElement = {
        ...elementWithReactions, // Use element with populated support reactions
        designResults,
        isSaved: false,
        updatedAt: new Date(),
        version: (elementWithReactions.version || 0) + 1,
        statusMessage: { type: 'success', message: `Design complete for "${elementWithReactions.name}". ${designResults.length} result(s).`, timestamp: new Date().toLocaleTimeString(), user: statusUser }
      };

      // 5) Update element inside projects state if present
      if (updatedElement.projectId) {
        setProjects(prev => prev.map(p => {
          if (p.id === updatedElement.projectId) {
            const existingIndex = (p.elements || []).findIndex(el => el.id === updatedElement.id);
            if (existingIndex > -1) {
              const newEls = [...(p.elements || [])];
              newEls[existingIndex] = updatedElement;
              return { ...p, elements: newEls };
            }
            // If not found, append
            return { ...p, elements: [...(p.elements || []), updatedElement] };
          }
          return p;
        }));
      }

      // 6) Update the original chat message with the updated element and success status
      setMessages(prev => prev.map(msg => {
          if (msg.id === messageId && msg.elementData) {
            const newElementData = [...msg.elementData];
            newElementData[formIndex] = updatedElement;
            return { ...msg, elementData: newElementData, statusMessage: { type: 'success', message: `Design complete for "${updatedElement.name}".`, timestamp: new Date().toLocaleTimeString() } };
          }
          return msg;
        }));

        // Optionally clear status after a short delay
        setTimeout(() => setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: undefined } : msg)), 5000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Analysis and design failed', error);
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'error', message: `Design Failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString() } } : msg));
      }
  
    }, [user, setProjects, setMessages]);
  
    /** Handles cancellation of the structural element form.
     * Deactivates the form and resets any temporary state.
     * @param messageId - The ID of the message containing the form.
     * @param formIndex - The index of the form within the message.
     */
    const handleElementFormCancel = useCallback((messageId: string, formIndex: number) => {
        deactivateFormInMessage(messageId, formIndex);
    }, [deactivateFormInMessage]);

  /** Handles saving the structural element to the database.
   * Implements optimistic UI updates and error handling.
   * @param data - The structural element data to save.
   * @param messageId - (Optional) The ID of the message associated with the element, for status updates.
   */
  const handleElementFormSave = useCallback(async (data: StructuralElement, messageId?: string) => {
      if (!data) return;

      // 1) recompute combos locally to ensure server receives freshest computed results
      const comboUtils = new LoadCombinationUtils();
      let elementToSave: StructuralElement = { ...data };

      // Ensure reaction combos exist (idempotent) and compute results for every combo
      try {
        elementToSave = comboUtils.reactionLoadCombinations ? comboUtils.reactionLoadCombinations(elementToSave as any, { forceRegenerate: false, includeInactive: false, customFactors: {} }) as any : elementToSave;
        // compute results for each combination
        if (elementToSave.loadCombinations && elementToSave.appliedLoads) {
          elementToSave.loadCombinations = elementToSave.loadCombinations.map(c => {
            try {
              const computed = comboUtils.computeLoadCombination(elementToSave.appliedLoads || [], c) || [];
              return { ...c, computedResult: computed };
            } catch (err) {
              console.warn('computeLoadCombination failed during save', err);
              return { ...c };
            }
          });
        }
      } catch (err) {
        console.warn('Failed to ensure reaction combos before save', err);
      }

      // 2) optimistic UI: mark as saving in message and disable save button via statusMessage
      if (messageId) {
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'loading', message: `Saving "${elementToSave.name}"...`, timestamp: new Date().toLocaleTimeString() } } : msg));
      }

      try {
        // 3) require projectId for saving; if missing, fail-fast and surface message
        const projectId = elementToSave.projectId;
        if (!projectId) throw new Error('Please select a Project before saving.');

        // 4) call service upsert
        const savedId = await projectService.upsertElement(projectId, elementToSave);
        // commit any transfer loads to the registry
        elementToSave.appliedLoads
          .filter(load => (load as any).transfer)
          .forEach(load => projectTransferRegistry.commitTransferLoad(load as any));

        // 5) Update local projects state: replace or append element with server id
        setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          const existingIndex = (p.elements || []).findIndex(el => el.id === savedId || el.name === elementToSave.name);
          const savedElement = { ...elementToSave, id: savedId, isSaved: true, updatedAt: new Date() } as StructuralElement;
          if (existingIndex > -1) {
            const newEls = [...(p.elements || [])];
            newEls[existingIndex] = savedElement;
            return { ...p, elements: newEls };
          }
          return { ...p, elements: [...(p.elements || []), savedElement] };
        }));

        // 6) Update messages with success and set isSaved
        setMessages(prev => prev.map(msg => {
          if (!msg.elementData) return msg;
          const newElementData = msg.elementData.map(el => el.name === elementToSave.name ? { ...el, id: savedId, isSaved: true, updatedAt: new Date() } : el);
          if (messageId && msg.id === messageId) {
            return { ...msg, elementData: newElementData, statusMessage: { type: 'success', message: `Saved "${elementToSave.name}".`, timestamp: new Date().toLocaleTimeString() } };
          }
          return { ...msg, elementData: newElementData };
        }));

        // clear status after delay
        if (messageId) setTimeout(() => setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: undefined } : msg)), 3000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Save failed:', error);
        if (messageId) {
          setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, statusMessage: { type: 'error', message: `Save failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString() } } : msg));
        }
      }
  }, [setMessages, setProjects]);

  // New handlers for ElementCard
  const handleElementDoubleClick = useCallback((element: StructuralElement) => {
    // Add element to canvas for editing
    const newCanvasItem: CanvasItem = {
      id: crypto.randomUUID(),
      type: 'element',
      data: element,
    };
    setCanvasItems(prev => [...prev, newCanvasItem]);
    setIsCanvasOpen(true); // Ensure canvas is open
    addMessage({ sender: 'ai', text: `Element "${element.name}" added to canvas for editing.`, type: 'text' });
  }, [setCanvasItems, setIsCanvasOpen, addMessage]);

  const handleElementDelete = useCallback(async (elementId: string) => {
    // Find the element to delete (for modal display)
    const element = projects.flatMap(p => p.elements || []).find(e => e.id === elementId);
    if (element) {
      setElementToDelete(element);
      setIsDeleteModalOpen(true);
    }
  }, [projects]);

  const confirmElementDelete = useCallback(async () => {
    if (!elementToDelete) return;
    try {
      await projectService.archiveElement(elementToDelete.projectId!, elementToDelete.id); // Server soft delete
      setProjects(prev => prev.map(p => ({ ...p, elements: p.elements?.filter(e => e.id !== elementToDelete.id) })));
      addMessage({ sender: 'ai', text: `Element "${elementToDelete.name}" deleted successfully.`, type: 'text' });
    } catch (error) {
      addMessage({ sender: 'ai', text: `Failed to delete element: ${error.message}`, type: 'error' });
    } finally {
      setIsDeleteModalOpen(false);
      setElementToDelete(null);
    }
  }, [elementToDelete, setProjects, addMessage]);

  const handleElementDuplicate = useCallback(async (element: StructuralElement) => {
    if (!element.projectId || !element.id) {
      addMessage({ sender: 'ai', text: 'Cannot duplicate an element without a project or ID.', type: 'error' });
      return;
    }
    try {
      // 1. Call the dedicated service function to duplicate the element on the server
      const newElementId = await projectService.duplicateElement(element.projectId, element.id);
      
      // 2. Fetch the newly created element from the server to get all its data
      const newElement = await projectService.getElement(element.projectId, newElementId);

      if (newElement) {
        // 3. Add the new element to the top of the list in the local state
        setProjects(prev => prev.map(p => 
          p.id === element.projectId 
            ? { ...p, elements: [newElement, ...(p.elements || [])] } 
            : p
        ));
        addMessage({ sender: 'ai', text: `Element duplicated as "${newElement.name}".`, type: 'text' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addMessage({ sender: 'ai', text: `Failed to duplicate element: ${errorMessage}`, type: 'error' });
    }
  }, [setProjects, addMessage]);

  //#endregion
  



  //#region --- Section ---
  /**
   * Save a section (create or update)
   * @param sectionData The section data to save
   * @param mode The mode of the operation (create, edit, duplicate)
   * @returns The saved section data or null if failed
   */
  const handleSaveSection = async (sectionData: SectionProperties, mode: FormMode): Promise<SectionProperties | null> => {
    try {
        if (mode === 'edit') {
            await sectionService.updateSection(sectionData.id, sectionData);
            // Return the updated section data (caller can refresh/listen to refreshed sections)
            await refreshSections();
            return sectionData;
        } else { // 'create' or 'duplicate'
            const { id, ...newSectionData } = sectionData;
            await sectionService.createSection(newSectionData as SectionProperties);
            // After creating, refresh and return the created data (ID may be assigned by the service)
            await refreshSections();
            return sectionData;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addMessage({ sender: 'ai', text: `Failed to save section: ${errorMessage}`, type: 'error' });
        return null;
    }
  };
  /** Deletes a section by ID and refreshes the sections list.
   * @param sectionId The ID of the section to delete
   * @returns True if deletion was successful, false otherwise
   */
  const handleDeleteSection = async (sectionId: string): Promise<boolean> => {
      if (!sectionId) return false;
      try {
          await sectionService.deleteSection(sectionId);
          await refreshSections();
          return true;
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          addMessage({ sender: 'ai', text: `Failed to delete section: ${errorMessage}`, type: 'error' });
          return false;
      }
  };
  //#endregion






  //#region AI Processes
  // AI Action Processing
  /**
   * Processes AI-generated actions and executes corresponding handlers.
   * Uses a ref to maintain a stable instance of ProcessAiActions.
   */
  const aiActionProcessor = useRef(
      new ProcessAiActions(
          messages,
          setMessages,
          handleBeamFormSubmit,
          handleBeamFormCancel,
          handleElementFormSubmit,
          handleElementFormCancel
      )
  ).current;

  // Update dependencies in aiActionProcessor whenever they change
  useEffect(() => {
    aiActionProcessor.updateDependencies(messages, setMessages);
  }, [messages, setMessages, aiActionProcessor]);

  /**
   * Processes AI-generated actions and executes corresponding handlers.
   * @param actions - Array of actions generated by the AI.
   */
  const processAiActions = useCallback(async (actions: Action[]) => {
      for (const action of actions) {
          switch (action.type) {
              case 'update_beam_form': {
                  saveHistorySnapshot();
                  
                  if (action.targetContext === 'canvas') {
                      // Update canvas items
                      setCanvasItems(prevItems => {
                          return prevItems.map(item => {
                              if (item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName) {
                                  return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                              }
                              return item;
                          });
                      });
                  } else {
                      // Update chat messages
                      setMessages(prevMessages => {
                          return prevMessages.map(msg => {
                              if (msg.type === 'beam_input_form' && msg.beamInputsData) {
                                  const updatedBeamData = msg.beamInputsData.map(beam => {
                                      if (beam.Name === action.targetBeamName) {
                                          return { ...beam, ...action.updatedProperties };
                                      }
                                      return beam;
                                  });
                                  return { ...msg, beamInputsData: updatedBeamData };
                              }
                              return msg;
                          });
                      });
                  }
                  break;
              }
              case 'update_element_form': {
                  saveHistorySnapshot();
                  
                  if (action.targetContext === 'canvas') {
                      // Update canvas items
                      setCanvasItems(prevItems => {
                          return prevItems.map(item => {
                              if (item.type === 'element' && (item as any).data?.name === action.targetElementName) {
                                  return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                              }
                              return item;
                          });
                      });
                  } else {
                      // Update chat messages
                      setMessages(prevMessages => {
                          return prevMessages.map(msg => {
                              if (msg.type === 'element_form' && msg.elementData) {
                                  const updatedElementData = msg.elementData.map(element => {
                                      if (element.name === action.targetElementName) {
                                          return { ...element, ...action.updatedProperties };
                                      }
                                      return element;
                                  });
                                  return { ...msg, elementData: updatedElementData };
                              }
                              return msg;
                          });
                      });
                  }
                  break;
              }
              case 'download_analysis': {
                  // ... download logic
                  break;
              }
              default:
                  aiActionProcessor.processAction(action);
          }
      }
  }, [aiActionProcessor, saveHistorySnapshot]);

  // AI Decision Processing
  /**
   * Processes the AI's decision output and triggers action processing.
   * Uses a ref to maintain a stable instance of ProcessAiDecision.
   * @param decision - The decision object returned by the AI.
   */
  const aiDecisionProcessor = useRef(new ProcessAiDecision(addMessage, (actions) => processAiActions(actions))).current;
  const processAiDecision = useCallback(async (decision: any) => {
    aiDecisionProcessor.processDecision(decision);
  }, [aiDecisionProcessor]);

  // Handles clicks on interactive buttons within a chat message (e.g., Proceed/Cancel).
  const handleActionClick = async (messageId: string, action: Action) => {
    // Disable the buttons on the message that was clicked.
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, actionsConsumed: true } : msg));

    switch (action.type) {
      case 'confirm_attachment_analysis':
        setIsLoading(true);
        // Add a new user message to show what is being processed.
        addMessage({ sender: 'user', text: `${action.userMessageText} (Confirmed analysis of ${action.fileName})`, type: 'text' });
        try {
          const chatHistory = messages.map(m => ({ role: m.sender, parts: [{text: m.text}] }));
          // Re-run the AI decision, but force the context to 'attachm.' to bypass confirmation.
          const decision = await getAiDecision(action.userMessageText, chatHistory, action.userFile, 'attachm.');
          await processAiDecision(decision);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          addMessage({ sender: 'ai', text: `Error: ${errorMessage}`, type: 'error' });
        } finally {
          setIsLoading(false);
        }
        break;
      
      case 'cancel_attachment_analysis':
        addMessage({ sender: 'ai', text: "Okay, I won't analyze the file.", type: 'text' });
        break;
    }
  };
  //#endregion






  //#region --- Quick Action ---
  const handleAddBeamClick = () => {
    const beamCount = messages.reduce((count, msg) => msg.beamInputsData ? count + msg.beamInputsData.length : count, 0);
    const newBeamData: BeamInput = JSON.parse(JSON.stringify({
        Name: `My Beam ${beamCount + 1}`, sectionName: "2/240x45 SG8", Span: 3, E: 8, I: 0.00010368, A: 0.0216,
        Supports: [{ position: 0, fixity: 'Pinned' }, { position: 3, fixity: 'Roller' }],
        Loads: [{ name: "Uniform Load", type: 'UDL', magnitude: [3000], position: ['0', '3'] }],
    }));
    addMessage({ sender: 'ai', text: `Here is a new form for "${newBeamData.Name}". Please define its properties.`, type: 'beam_input_form', beamInputsData: [newBeamData], isFormActive: [true] });
  };

  const handleAddElementClick = () => {
    const elementCount = messages.reduce((count, msg) => msg.elementData ? count + msg.elementData.length : count, 0);
    
    // Get the first section from the database if available
    const firstSection = sections.length > 0 ? sections[0] : null;
    const defaultSectionName = firstSection ? firstSection.name : "240x45 SG8";
    
    const newElementData: StructuralElement = {
        name: `New Element ${elementCount + 1}`,
        type: 'Joist',
        span: 2.5,
        spacing: 0.6,
        section_count: 1,
        sectionName: defaultSectionName,
        sections: firstSection ? [firstSection] : [],
        supports: [
            { position: 0, fixity: SupportFixityType.Pinned },
            { position: 2.5, fixity: SupportFixityType.Roller }
        ],
        appliedLoads: [
            {
                type: LoadType.UDL,
                position: ['0', '2.5'],
                forces: [
                    { magnitude: [400], loadCase: LoadCaseType.Dead },
                    { magnitude: [450], loadCase: LoadCaseType.Live }
                ]
            }
        ],
        loadCombinations: [
            {
                name: '1.2G + 1.5Q',
                combinationType: "Ultimate",
                loadCaseFactors: [
                    { loadCaseType: LoadCaseType.Dead, factor: 1.2, termFactor: 1.0 },
                    { loadCaseType: LoadCaseType.Live, factor: 1.5, termFactor: 1.0 }
                ]
            },
            {
                name: 'G + 0.7Q',
                combinationType: "Serviceability",
                loadCaseFactors: [
                    { loadCaseType: LoadCaseType.Dead, factor: 1.0, termFactor: 1.0 },
                    { loadCaseType: LoadCaseType.Live, factor: 1.0, termFactor: 0.7 }
                ]
            }
        ],
        designParameters: {
            countryOfStandard: "New Zealand",
            // Fix: Use MaterialType enum member for type safety.
            materialType: MaterialType.Timber
        },
        reactions: [],
    };
    addMessage({
        sender: 'ai',
        text: `Here is a new form for "${newElementData.name}". Please define its properties.`,
        type: 'element_form',
        elementData: [newElementData],
        isFormActive: [true]
    });
  };

  const handleElementClick = useCallback((element: StructuralElement) => {
    addMessage({
      sender: 'ai',
      text: `Loaded element "${element.name}" from project. You can edit its properties below.`,
      type: 'element_form',
      elementData: [element],
      isFormActive: [true]
    });
  }, [addMessage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { alert("File is too large. Please upload a file smaller than 10MB."); return; }
      setFileToUpload(file);
    }
  };
  
  const handleDrawingAnalysis = async (file: File, standardLoads: StandardLoads) => {
    setIsUploadModalOpen(false);
    setIsLoading(true);
    addMessage({ sender: 'user', text: `Analyzing drawing: ${file.name}`, type: 'text' });

    try {
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
      const fileData = await fileDataPromise;
      const filePayload: FilePayload = { mimeType: file.type, data: fileData };
      const chatHistory = messages.map(m => ({ role: m.sender, parts: [{text: m.text}] }));
      const analysisPrompt = `Analyze this drawing... ${JSON.stringify(standardLoads, null, 2)}`;
      const decision = await getAiDecision(analysisPrompt, chatHistory, filePayload, 'attachm.');
      await processAiDecision(decision);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addMessage({ sender: 'ai', text: `Error: ${errorMessage}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getBeamInputsFromContext = (context: AppContext, selectedItemId: string | null): BeamInput[] => {
        if (context === 'canvas') {
            if (!selectedItemId) return [];
            const selectedItem = canvasItems.find((item): item is CanvasBeamInputItem => item.id === selectedItemId && item.type === 'beam_input');
            return selectedItem ? [selectedItem.data] : [];
        } else { // context === 'chat' or 'attachm.'
            const chatBeams: BeamInput[] = [];
            messages.forEach(msg => {
                if (msg.type === 'beam_input_form' && msg.beamInputsData) {
                    msg.beamInputsData.forEach(beam => {
                        const existingIndex = chatBeams.findIndex(b => b.Name === beam.Name);
                        if (existingIndex !== -1) chatBeams[existingIndex] = beam;
                        else chatBeams.push(beam);
                    });
                }
            });
            return chatBeams;
        }
  };

  const getElementsFromContext = (context: AppContext, selectedItemId: string | null): StructuralElement[] => {
        if (context === 'canvas') {
            if (!selectedItemId) return [];
            const selectedItem = canvasItems.find(item => item.id === selectedItemId && item.type === 'element');
            return selectedItem ? [(selectedItem as any).data] : [];
        } else { // context === 'chat' or 'attachm.'
            const chatElements: StructuralElement[] = [];
            messages.forEach(msg => {
                if (msg.type === 'element_form' && msg.elementData) {
                    msg.elementData.forEach(element => {
                        const existingIndex = chatElements.findIndex(e => e.name === element.name);
                        if (existingIndex !== -1) chatElements[existingIndex] = element;
                        else chatElements.push(element);
                    });
                }
            });
            return chatElements;
        }
  };

  const handleSendMessage = async () => {
    if ((userInput.trim() === '' && !fileToUpload) || isLoading) return;

    const userMessageText = userInput;
    const userMessageFile = fileToUpload;
    let messageText = userMessageText;
    if (userMessageFile) messageText += `\n\n(File attached: ${userMessageFile.name})`;

    addMessage({ sender: 'user', text: messageText, type: 'text' });
    setUserInput('');
    setIsLoading(true);

    try {
      let filePayload: FilePayload | undefined = undefined;
      if (userMessageFile) {
        const reader = new FileReader();
        const fileDataPromise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(userMessageFile);
        });
        const fileData = await fileDataPromise;
        filePayload = { mimeType: userMessageFile.type, data: fileData };
      }

      const chatHistory = messages.map(m => ({ role: m.sender, parts: [{text: m.text}] }));
      const beamsInContext = getBeamInputsFromContext(context, selectedCanvasItemId);
      const elementsInContext = getElementsFromContext(context, selectedCanvasItemId);
      
      let promptWithContext = userMessageText;
      
      // Add beam context if available
      if (beamsInContext.length > 0) {
          promptWithContext += `\n\n# Current Beam Context ('${context}')\n${JSON.stringify(beamsInContext, null, 2)}`;
      }
      
      // Add element context if available
      if (elementsInContext.length > 0) {
          promptWithContext += `\n\n# Current Element Context ('${context}')\n${JSON.stringify(elementsInContext, null, 2)}`;
      }

      const decision = await getAiDecision(promptWithContext, chatHistory, filePayload, context);
      await processAiDecision(decision);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addMessage({ sender: 'ai', text: `Error: ${errorMessage}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  //#endregion







  //#region --- Canvas ---
  const handleAddToCanvas = useCallback((msg: ChatMessage, formIndex?: number) => {
    let newItem: CanvasItem | null = null;
    const index = typeof formIndex === 'number' ? formIndex : 0;
    switch (msg.type) {
        case 'text': case 'error': newItem = { id: crypto.randomUUID(), type: 'text', title: 'Note', content: msg.text }; break;
        case 'beam_input_form': if (msg.beamInputsData?.[index]) newItem = { id: crypto.randomUUID(), type: 'beam_input', data: msg.beamInputsData[index] }; break;
        case 'beam_output_display': if (msg.beamOutputData && msg.beamInputsData?.[0]) newItem = { id: crypto.randomUUID(), type: 'beam_output', inputData: msg.beamInputsData[0], outputData: msg.beamOutputData }; break;
        case 'element_form': if (msg.elementData?.[index]) newItem = { id: crypto.randomUUID(), type: 'element', data: msg.elementData[index] }; break;
    }
    if (newItem) {
      setCanvasItems(prev => [...prev, newItem as CanvasItem]);
      setSelectedCanvasItemId(newItem.id);
      setIsCanvasOpen(true);
      // If the source message contained an active form, deactivate it so the form closes when pinned
      if (msg.id && typeof formIndex === 'number') {
        setMessages(prev => prev.map(m => {
          if (m.id === msg.id && m.isFormActive) {
            const newIsFormActive = [...m.isFormActive];
            newIsFormActive[formIndex] = false;
            return { ...m, isFormActive: newIsFormActive };
          }
          return m;
        }));
      }
    }
  }, []);

  const handleRemoveCanvasItem = useCallback((id: string) => {
    setCanvasItems(prev => {
        const newItems = prev.filter(item => item.id !== id);
        if (selectedCanvasItemId === id) setSelectedCanvasItemId(newItems.length > 0 ? newItems[newItems.length - 1].id : null);
        if (newItems.length === 0) setIsCanvasOpen(false);
        return newItems;
    });
  }, [selectedCanvasItemId]);
  
  const handleUpdateCanvasItem = useCallback((updatedItem: CanvasItem) => {
      setCanvasItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);
  
  const handleAnalyzeInCanvas = useCallback(async (beamInput: BeamInput) => {
    setIsLoading(true);
    try {
        const result = await analyzeBeam(beamInput);
        const newItem: CanvasItem = { id: crypto.randomUUID(), type: 'beam_output', inputData: beamInput, outputData: result };
        setCanvasItems(prev => [...prev, newItem]);
        setSelectedCanvasItemId(newItem.id);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addMessage({ sender: 'ai', text: `Canvas Analysis Failed: ${errorMessage}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  }, [addMessage]);

  // Canvas Element Handlers
  const handleSaveInCanvas = useCallback(async (element: StructuralElement, itemId: string) => {
    try {
      // Reuse existing save logic with load combination computation
      const comboUtils = new LoadCombinationUtils();
      let elementToSave: StructuralElement = { ...element };

      // Ensure reaction combos exist and compute results for every combo
      try {
        elementToSave = comboUtils.reactionLoadCombinations ? comboUtils.reactionLoadCombinations(elementToSave as any, { forceRegenerate: false, includeInactive: false, customFactors: {} }) as any : elementToSave;
        if (elementToSave.loadCombinations && elementToSave.appliedLoads) {
          elementToSave.loadCombinations = elementToSave.loadCombinations.map(c => {
            try {
              const computed = comboUtils.computeLoadCombination(elementToSave.appliedLoads || [], c) || [];
              return { ...c, computedResult: computed };
            } catch (err) {
              console.warn('computeLoadCombination failed during canvas save', err);
              return { ...c };
            }
          });
        }
      } catch (err) {
        console.warn('Failed to ensure reaction combos before canvas save', err);
      }

      // Require projectId for saving
      const projectId = elementToSave.projectId;
      if (!projectId) throw new Error('Please select a Project before saving.');

      // Call service upsert
      const savedId = await projectService.upsertElement(projectId, elementToSave);
      // commit any transfer loads to the registry
      elementToSave.appliedLoads
        .filter(load => (load as any).transfer)
        .forEach(load => projectTransferRegistry.commitTransferLoad(load as any));

      // Update local projects state
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        const existingIndex = (p.elements || []).findIndex(el => el.id === savedId || el.name === elementToSave.name);
        const savedElement = { ...elementToSave, id: savedId, isSaved: true, updatedAt: new Date() } as StructuralElement;
        if (existingIndex > -1) {
          const newEls = [...(p.elements || [])];
          newEls[existingIndex] = savedElement;
          return { ...p, elements: newEls };
        }
        return { ...p, elements: [...(p.elements || []), savedElement] };
      }));

      // Update the canvas item with saved element
      setCanvasItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, data: { ...elementToSave, id: savedId, isSaved: true, updatedAt: new Date() } } as CanvasItem : item
      ));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Canvas save failed:', error);
      throw error; // Re-throw to let Canvas component handle status message
    }
  }, [setProjects, setCanvasItems]);

  const handleDesignInCanvas = useCallback(async (element: StructuralElement, itemId: string) => {
    try {
      // Validate at least one load combination exists
      if (!element.loadCombinations || element.loadCombinations.length === 0) {
        throw new Error(`Cannot design "${element.name}": no load combinations found.`);
      }

      // Ensure individual reaction load combinations exist
      const comboUtils = new LoadCombinationUtils();
      let elementData = comboUtils.reactionLoadCombinations(element, { forceRegenerate: false, includeInactive: false, customFactors: {} });

      // Call design API for all combinations
      const { results: designResults, updatedElement: elementWithReactions } = await designAllCombinations(elementData);

      // Build updated element with results
      const updatedElement: StructuralElement = {
        ...elementWithReactions, // Use element with populated support reactions
        designResults,
        updatedAt: new Date(),
        version: (elementWithReactions.version || 0) + 1,
      };

      // Update element inside projects state if present
      if (updatedElement.projectId) {
        setProjects(prev => prev.map(p => {
          if (p.id === updatedElement.projectId) {
            const existingIndex = (p.elements || []).findIndex(el => el.id === updatedElement.id);
            if (existingIndex > -1) {
              const newEls = [...(p.elements || [])];
              newEls[existingIndex] = updatedElement;
              return { ...p, elements: newEls };
            }
            // If not found, append
            return { ...p, elements: [...(p.elements || []), updatedElement] };
          }
          return p;
        }));
      }

      // Update the canvas item with design results
      setCanvasItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, data: updatedElement } as CanvasItem : item
      ));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Canvas design failed:', error);
      throw error; // Re-throw to let Canvas component handle status message
    }
  }, [setProjects, setCanvasItems]);

  const handleCanvasStatusUpdate = useCallback((itemId: string, status: StatusMessage | null) => {
    // Optional: Could add global status handling here if needed
    // For now, Canvas handles its own status display
  }, []);
  
  const handleMouseDownOnResizer = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (event: MouseEvent) => {
        const newWidth = window.innerWidth - event.clientX;
        const minWidth = 400; const maxWidth = window.innerWidth - 500; 
        if (newWidth >= minWidth && newWidth <= maxWidth) setCanvasWidth(newWidth);
    };
    const handleMouseUp = () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);
  //#enregion
  
  //#endregion Handlers





  //#region --- Render ---
  return (
    <>
      <UploadDrawingModal isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSubmit={handleDrawingAnalysis} 
      />

      <ManageSectionsModal 
        isOpen={isSectionsModalOpen}
        onClose={() => setIsSectionsModalOpen(false)}
        sections={sections}
        onSave={handleSaveSection}
        onDelete={handleDeleteSection}
      />
      
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        elementName={elementToDelete?.name || ''}
        onConfirm={confirmElementDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
         
      />

      <div className={`flex h-screen bg-base-200 font-sans overflow-hidden transition-all duration-300`}>
        <ProjectsDrawer
          isOpen={isProjectsDrawerOpen}
          onClose={() => setIsProjectsDrawerOpen(false)}
          projects={projects}
          elements={selectedProject ? selectedProject.elements || [] : []}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          onBackToProjects={() => setSelectedProject(null)}
          onAddProject={() => { /* TODO */ }}
          onEditProject={() => { /* TODO */ }}
          onDeleteProject={() => { /* TODO */ }}
          onElementClick={handleElementClick}
          onElementDoubleClick={handleElementDoubleClick}
          onElementDelete={handleElementDelete}
          onElementDuplicate={handleElementDuplicate}
        />
        <div className={`flex-grow flex flex-col h-full relative transition-all duration-300 ${isProjectsDrawerOpen ? 'ml-80' : 'ml-0'}`}>
            {!isFirebaseConfigured && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 text-sm" role="alert">
                    <p className="font-bold">Persistence is Disabled</p>
                    <p>Database Server is down <code>Dtabase Error</code> file.</p>
                </div>
            )}
          
          {/* App Bar  */}
          <header className="flex-shrink-0 bg-primary text-white shadow-md z-10">
            <div className="w-full px-4 py-2 flex items-center justify-between">
              
              {/* Header */}
              <div className="flex items-center">
                  <button onClick={() => setIsProjectsDrawerOpen(prev => !prev)} className="p-2 rounded-full hover:bg-black/20 transition-colors mr-2" title="Toggle Projects">
                    <FolderIcon className="w-6 h-6" />
                  </button>
                  <h1 className="text-xl font-bold">RosarcLABs</h1>
              </div>

              {/* Left side of App bar */}
              <div className="flex items-center gap-4">

                {/* Sign In Component */}
                <SignIn 
                  user={user} 
                  onAuthStateChange={setUser} 
                  onViewProfile={() => setIsUserProfileModalOpen(true)} />

                {/* Toggle Canvas Button */}
                <button onClick={() => setIsCanvasOpen(prev => !prev)} className="p-2 rounded-full hover:bg-black/20 transition-colors" title={isCanvasOpen ? "Close Canvas" : "Open Canvas"}>
                    {isCanvasOpen ? <PanelLeftCloseIcon className="w-6 h-6" /> : <PanelRightOpenIcon className="w-6 h-6" />}
                </button>

              </div>
            </div>
          </header>
          
          <MainChatInterface
            messages={messages} isLoading={isLoading} userInput={userInput} setUserInput={setUserInput}
            fileToUpload={fileToUpload} setFileToUpload={setFileToUpload} context={context} setContext={setContext}
            handleSendMessage={handleSendMessage} handleAddBeamClick={handleAddBeamClick}
            handleAddElementClick={handleAddElementClick}
            setIsUploadModalOpen={setIsUploadModalOpen}
            handleOpenSectionsModal={() => setIsSectionsModalOpen(true)}
            isPersistenceEnabled={isFirebaseConfigured}
            handleFileChange={handleFileChange}
            handleFormChange={handleBeamFormChange} handleFormSubmit={handleBeamFormSubmit} handleFormCancel={handleBeamFormCancel}
            handleAddToCanvas={handleAddToCanvas} analysisDisplayRefs={analysisDisplayRefs} handleUndo={handleUndo}
            handleActionClick={handleActionClick}
            handleElementFormChange={handleElementFormChange}
            handleElementFormSubmit={handleElementFormSubmit}
            handleElementFormCancel={handleElementFormCancel}
            handleElementFormSave={handleElementFormSave}
            sections={sections}
            user={user}
            projects={projects}
          />
        </div>
        
        {isCanvasOpen && (
            <>
                <div onMouseDown={handleMouseDownOnResizer} className="w-1.5 h-full cursor-col-resize bg-base-300 hover:bg-primary transition-colors flex-shrink-0" />
                <div className="h-full flex flex-col bg-base-100 shadow-lg flex-shrink-0" style={{ width: `${canvasWidth}px` }}>
          <Canvas items={canvasItems} 
            selectedItemId={selectedCanvasItemId} 
            onSelectItem={setSelectedCanvasItemId}
            onCloseItem={handleRemoveCanvasItem} 
            onUpdateItem={handleUpdateCanvasItem} 
            onAnalyzeInCanvas={handleAnalyzeInCanvas}
            onElementSave={handleSaveInCanvas}
            onElementDesign={handleDesignInCanvas}
            onStatusUpdate={handleCanvasStatusUpdate}
            sections={sections}
            projects={projects}
          />
                </div>
            </>
        )}
      </div>
    </>
  );
  //#endregion Render
};

export default App;
