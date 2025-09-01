// App.tsx: The main application component that orchestrates the entire UI and state management.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Action, FilePayload, CanvasItem, StandardLoads, CanvasBeamInputItem, ConfirmAttachmentAnalysisAction, StatusMessage, Project } from './customTypes/types';
import { BeamInput, Element as StructuralElement, SupportFixityType, LoadType, LoadCaseType } from './customTypes/structuralElement';
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
import { ChatIcon, PanelRightOpenIcon, PanelLeftCloseIcon } from './components/utility/icons';
import { MainChatInterface } from './components/chat/MainChatInterface';
import { ProcessAiDecision } from './AIProcesses/ProcessAiDecision';
import { ProcessAiActions } from './AIProcesses/ProcessAiActions';


const MAX_HISTORY_STATES = 30;
type AppContext = 'chat' | 'canvas' | 'attachm.';
type FormMode = 'create' | 'edit' | 'duplicate';

const App: React.FC = () => {
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
  // Ref to hold handles for all rendered BeamAnalysisDisplay components to allow programmatic control.
  const analysisDisplayRefs = useRef<Record<string, BeamAnalysisDisplayHandle | null>>({});
  // State for managing the width of the resizable canvas panel.
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth / 3);
  // State to hold the global library of structural sections.
  const [sections, setSections] = useState<SectionProperties[]>([]);
  // State to hold the global library of projects.
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetches or refreshes the list of sections from the database.
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

  // Fetches or refreshes the list of projects from the database.
  const refreshProjects = useCallback(async () => {
    try {
        // TODO: Replace with actual user ID from Firebase Auth
        // For now, we'll use a placeholder or skip if no user is authenticated
        const userId = 'demo-user-id'; // Replace with actual user ID from auth
        const fetchedProjects = await projectService.getUserProjects(userId);
        setProjects(fetchedProjects);
        // Optional: add a success status message if needed
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.warn(`Error fetching projects: ${errorMessage}`);
        // Don't show error message to user for now, as this might be expected during development
        // addMessage({ sender: 'ai', text: `Error fetching projects: ${errorMessage}`, type: 'error' });
    }
  }, []);

  // Initial fetch of sections when the app loads.
  useEffect(() => {
    refreshSections();
  }, [refreshSections]);

  // Initial fetch of projects when the app loads.
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);
  
  // Saves a snapshot of the current messages state to the history for undo purposes.
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

  // Handles the undo action, reverting the chat to its last saved state.
  const handleUndo = useCallback(() => {
    if (history.length > 0) {
        const lastState = history[history.length - 1];
        setMessages(lastState);
        setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  // Utility function to add a new message to the chat history.
  // Using useCallback to ensure function identity is stable where needed.
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
  
  // Generic handler to deactivate a form in a message
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

  // --- BeamInputForm Handlers ---
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

  const handleBeamFormCancel = useCallback((messageId: string, formIndex: number) => {
    deactivateFormInMessage(messageId, formIndex);
  }, [deactivateFormInMessage]);

  // --- StructuralElementForm Handlers ---
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
  
  const handleElementFormSubmit = useCallback(async (data: StructuralElement, messageId: string, formIndex: number) => {
      // Set loading status for this specific message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, statusMessage: { type: 'loading', message: `Designing "${data.name}"...` } }
            : msg
        )
      );

      try {
        const results = await designAllCombinations(data);
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId && msg.elementData) {
              const newElementData = [...msg.elementData];
              newElementData[formIndex] = { ...newElementData[formIndex], designResults: results };
              return { ...msg, elementData: newElementData, statusMessage: { type: 'success', message: `Design complete for "${data.name}".`, timestamp: new Date().toLocaleTimeString() } };
            }
            return msg;
          })
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, statusMessage: { type: 'error', message: `Design Failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString() } }
              : msg
          )
        );
      }
  }, []);

  const handleElementFormCancel = useCallback((messageId: string, formIndex: number) => {
      deactivateFormInMessage(messageId, formIndex);
  }, [deactivateFormInMessage]);

  const handleElementFormSave = useCallback(async (data: StructuralElement, messageId?: string) => {
      // If messageId is provided, update that specific message's status
      if (messageId) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, statusMessage: { type: 'loading', message: `Saving "${data.name}"...` } }
              : msg
          )
        );
      }

      // In a real app, you would call a service to save to a database (e.g., Firestore)
      // For this example, we'll simulate a save and update the state.
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      setMessages(prev =>
          prev.map(msg => {
              if (msg.elementData?.some(el => el.name === data.name)) {
                  const updatedMsg = {
                      ...msg,
                      elementData: msg.elementData.map(el =>
                          el.name === data.name ? { ...el, isSaved: true } : el
                      ),
                  };

                  // If this is the message that contains the element, update its status
                  if (messageId && msg.id === messageId) {
                    updatedMsg.statusMessage = { type: 'success', message: `Successfully saved "${data.name}".`, timestamp: new Date().toLocaleTimeString() };
                  }

                  return updatedMsg;
              }
              return msg;
          })
      );
  }, []);
  
  // --- StructuralSection Handlers ---
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

  // AI Action Processing
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

  useEffect(() => {
    aiActionProcessor.updateDependencies(messages, setMessages);
  }, [messages, setMessages, aiActionProcessor]);
  
  const processAiActions = useCallback(async (actions: Action[]) => {
      for (const action of actions) {
          switch (action.type) {
              case 'update_beam_form': {
                  // This logic remains specific and might be better here than in the processor class
                  saveHistorySnapshot();
                  setMessages(prevMessages => {
                      // ... logic to find and update the correct beam form message
                      return prevMessages; // placeholder
                  });
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

  // --- Quick Action Handlers ---
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
        span: 5,
        spacing: 0.6,
        section_count: 1,
        sectionName: defaultSectionName,
        sections: firstSection ? [firstSection] : [],
        supports: [
            { position: 0, fixity: SupportFixityType.Pinned },
            { position: 5, fixity: SupportFixityType.Roller }
        ],
        appliedLoads: [
            {
                type: LoadType.UDL,
                position: ['0', '5'],
                forces: [
                    { magnitude: [300], loadCase: LoadCaseType.Dead },
                    { magnitude: [9000], loadCase: LoadCaseType.Live }
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
      let promptWithContext = userMessageText;
      if (beamsInContext.length > 0) {
          promptWithContext += `\n\n# Current Context State ('${context}')\n${JSON.stringify(beamsInContext, null, 2)}`;
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
  
  // --- Canvas Handlers ---
  const handleAddToCanvas = useCallback((msg: ChatMessage, formIndex?: number) => {
    let newItem: CanvasItem | null = null;
    const index = typeof formIndex === 'number' ? formIndex : 0;
    switch (msg.type) {
        case 'text': case 'error': newItem = { id: crypto.randomUUID(), type: 'text', title: 'Note', content: msg.text }; break;
        case 'beam_input_form': if (msg.beamInputsData?.[index]) newItem = { id: crypto.randomUUID(), type: 'beam_input', data: msg.beamInputsData[index] }; break;
        case 'beam_output_display': if (msg.beamOutputData && msg.beamInputsData?.[0]) newItem = { id: crypto.randomUUID(), type: 'beam_output', inputData: msg.beamInputsData[0], outputData: msg.beamOutputData }; break;
    }
    if (newItem) { setCanvasItems(prev => [...prev, newItem as CanvasItem]); setSelectedCanvasItemId(newItem.id); setIsCanvasOpen(true); }
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


  return (
    <>
      <UploadDrawingModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSubmit={handleDrawingAnalysis} />
      <ManageSectionsModal 
        isOpen={isSectionsModalOpen}
        onClose={() => setIsSectionsModalOpen(false)}
        sections={sections}
        onSave={handleSaveSection}
        onDelete={handleDeleteSection}
      />
      <div className="flex h-screen bg-base-200 font-sans overflow-hidden">
        <div className="flex-grow flex flex-col h-full relative">
            {!isFirebaseConfigured && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 text-sm" role="alert">
                    <p className="font-bold">Persistence is Disabled</p>
                    <p>To save and manage custom sections, add your Firebase project credentials to the <code>config/firebase.ts</code> file.</p>
                </div>
            )}
          <header className="flex-shrink-0 bg-primary text-white shadow-md z-10">
            <div className="w-full px-4 py-3 flex items-center justify-between">
              <div className="flex items-center">
                  <ChatIcon className="w-8 h-8 mr-3" />
                  <h1 className="text-xl font-bold">Structural Analysis AI</h1>
              </div>
              <button onClick={() => setIsCanvasOpen(prev => !prev)} className="p-2 rounded-full hover:bg-black/20 transition-colors" title={isCanvasOpen ? "Close Canvas" : "Open Canvas"}>
                  {isCanvasOpen ? <PanelLeftCloseIcon className="w-6 h-6" /> : <PanelRightOpenIcon className="w-6 h-6" />}
              </button>
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
          />
        </div>
        
        {isCanvasOpen && (
            <>
                <div onMouseDown={handleMouseDownOnResizer} className="w-1.5 h-full cursor-col-resize bg-base-300 hover:bg-primary transition-colors flex-shrink-0" />
                <div className="h-full flex flex-col bg-base-100 shadow-lg flex-shrink-0" style={{ width: `${canvasWidth}px` }}>
                    <Canvas items={canvasItems} selectedItemId={selectedCanvasItemId} onSelectItem={setSelectedCanvasItemId}
                        onCloseItem={handleRemoveCanvasItem} onUpdateItem={handleUpdateCanvasItem} onAnalyzeInCanvas={handleAnalyzeInCanvas} />
                </div>
            </>
        )}
      </div>
    </>
  );
};

export default App;
