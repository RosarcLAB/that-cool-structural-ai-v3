// components/chat/MainChatInterface.tsx: The main UI for the chat, including messages and input controls.

import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Action,  } from '../../customTypes/types';
import { BeamInput, StatusMessage,  Element as StructuralElement } from '../../customTypes/structuralElement';
import { SectionProperties } from '../../customTypes/SectionProperties';
import { BeamInputForm } from '../structuralEngineering/BeamInputForm';
import { BeamAnalysisDisplay, type BeamAnalysisDisplayHandle } from '../structuralEngineering/BeamAnalysisDisplay';
// FIX: Changed to default import as StructuralElementForm is now a default export.
import StructuralElementForm from '../structuralEngineering/StructuralElementForm';
import { TextEditorHandle } from '../utility/TextEditor';
import { Spinner } from '../utility/Spinner';
import { SendIcon, UploadIcon, AddIcon, DocumentMagnifyingGlassIcon, PanelRightOpenIcon, ChatBubbleLeftRightIcon, MicrophoneIcon, CloseIcon, BuildingBlockIcon, ListBulletIcon, PinIcon, OfficePinIcon } from '../utility/icons';

// HACK: Add barebones type for SpeechRecognition to fix build error.
interface SpeechRecognition {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void;
  onstart: () => void; onend: () => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: { results: { transcript: string }[][] }) => void;
}

type AppContext = 'chat' | 'canvas' | 'attachm.';

// Props definition for the MainChatInterface component.
interface MainChatInterfaceProps {
    messages: ChatMessage[];
    isLoading: boolean;
    userInput: string;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    fileToUpload: File | null;
    setFileToUpload: React.Dispatch<React.SetStateAction<File | null>>;
    context: AppContext;
    setContext: React.Dispatch<React.SetStateAction<AppContext>>;
    handleSendMessage: () => Promise<void>;
    handleAddBeamClick: () => void;
    handleAddElementClick: () => void;
    setIsUploadModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleOpenSectionsModal: () => void;
    isPersistenceEnabled: boolean;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    sections: SectionProperties[];
    projects: any[]; // Add project prop
    user: any; // Add user prop for authentication status
    // BeamInputForm handlers
    handleFormChange: (messageId: string, formIndex: number, updatedData: BeamInput) => void;
    handleFormSubmit: (data: BeamInput, messageId: string, formIndex: number) => Promise<void>;
    handleFormCancel: (messageId: string, formIndex: number) => void;
    // StructuralElementForm handlers
    handleElementFormChange: (messageId: string, formIndex: number, updatedData: StructuralElement) => void;
    handleElementFormSubmit: (data: StructuralElement, messageId: string, formIndex: number) => Promise<void>;
    handleElementFormCancel: (messageId: string, formIndex: number) => void;
    handleElementFormSave: (data: StructuralElement, messageId?: string) => Promise<void>;
    // statusMessage: StatusMessage | null; // Removed - now each message has its own statusMessage
    // General handlers
    handleAddToCanvas: (msg: ChatMessage, formIndex?: number) => void;
    analysisDisplayRefs: React.MutableRefObject<Record<string, BeamAnalysisDisplayHandle | null>>;
    handleUndo: () => void;
    handleActionClick: (messageId: string, action: Action) => void;
    /** Batch print all element forms */
 }

// Helper function to parse message text and render special links (like Undo) as buttons.
const renderMessageText = (text: string, handleUndo: () => void) => {
    const undoRegex = /\[Undo\]\(action:undo\)/g;
    const parts = text.split(undoRegex);
    if (parts.length <= 1) return <p className="whitespace-pre-wrap">{text}</p>;
    return (
        <p className="whitespace-pre-wrap">
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && (
                        <button onClick={handleUndo} className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-md hover:bg-blue-200 transition-colors text-sm">Undo</button>
                    )}
                </React.Fragment>
            ))}
        </p>
    );
};

export const MainChatInterface: React.FC<MainChatInterfaceProps> = ({
    messages, isLoading, userInput, setUserInput, fileToUpload, setFileToUpload,
    context, setContext, handleSendMessage, handleAddBeamClick, handleAddElementClick, setIsUploadModalOpen,
    handleOpenSectionsModal, isPersistenceEnabled, handleFileChange, handleFormChange, handleFormSubmit, handleFormCancel,
    handleAddToCanvas, analysisDisplayRefs, handleUndo, handleActionClick, 
    handleElementFormChange, handleElementFormSubmit, handleElementFormCancel, handleElementFormSave,
    sections, user, projects
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Track previous messages length so we only auto-scroll when a new message is appended.
    const prevMessagesLengthRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSpeechSupported = !!SpeechRecognitionAPI;

    // Registry for element form download callbacks
    const elementDownloadCallbacks = useRef<Record<string, () => void>>({});



    useEffect(() => {
        const prevLength = prevMessagesLengthRef.current;
        const currLength = messages.length;
        // Only scroll when a new message is appended (length increased).
        if (currLength > prevLength) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLengthRef.current = currLength;
    }, [messages]);

    const handleToggleListening = () => {
        if (!isSpeechSupported) { console.error("Speech recognition not supported."); return; }
        if (isListening) { recognitionRef.current?.stop(); return; }
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
        recognition.onerror = (event) => { console.error('Speech recognition error:', event.error); setIsListening(false); };
        recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; setUserInput(prev => prev ? `${prev} ${transcript}` : transcript); };
        recognition.start();
    };

    //#region Form actions
    
   
    // Batch conditions for showing form action chips
    // Use explicit counts so empty arrays don't incorrectly evaluate as "present".
    const beamInputFormsCount = messages.reduce((count, m) => {
        if (m.type === 'beam_input_form' && Array.isArray(m.beamInputsData) && Array.isArray(m.isFormActive)) {
            // Count only forms still active (not cancelled)
            return count + m.beamInputsData.filter((_, idx) => m.isFormActive![idx]).length;
        }
        return count;
    }, 0);

    const elementFormsCount = messages.reduce((count, m) => {
        if (m.type === 'element_form' && Array.isArray(m.elementData) && Array.isArray(m.isFormActive)) {
            // Count only element forms still active
            return count + m.elementData.filter((_, idx) => m.isFormActive![idx]).length;
        }
        return count;
    }, 0);

    const beamOutputCount = messages.reduce((count, m) => {
        return (m.type === 'beam_output_display' && m.beamOutputData && Array.isArray(m.beamInputsData) && m.beamInputsData.length > 0)
            ? count + 1
            : count;
    }, 0);

    // Backwards-compatible booleans
    const hasBeamInputForm = beamInputFormsCount > 0;
    const hasElementForm = elementFormsCount > 0;
    // Build set of active beam names (forms still live)
    const activeBeamNames = new Set<string>();
    messages.forEach(msg => {
        if (msg.type === 'beam_input_form' && Array.isArray(msg.beamInputsData) && Array.isArray(msg.isFormActive)) {
            msg.beamInputsData.forEach((data, idx) => {
                if (msg.isFormActive![idx]) activeBeamNames.add(data.Name);
            });
        }
    });
    const hasBeamOutput = messages.some(msg =>
        msg.type === 'beam_output_display'
        // && msg.beamInputsData?.[0]
        // && activeBeamNames.has(msg.beamInputsData[0].Name)
    ) || elementFormsCount > 0;

    // Glow state for Download All (pulse for 4s)
    const [downloadGlowing, setDownloadGlowing] = useState(false);
    useEffect((count = 4000) => {
        if (hasBeamOutput) {
            setDownloadGlowing(true);
            const timer = setTimeout(() => setDownloadGlowing(false), count);
            return () => clearTimeout(timer);
        }
    }, [hasBeamOutput]);
    // Glow state for Analyse/Design All (pulse for 4s)
    const [analyseGlowing, setAnalyseGlowing] = useState(false);
    useEffect((count = 4000) => {
        if (hasBeamInputForm || hasElementForm) {
            setAnalyseGlowing(true);
            const timer = setTimeout(() => setAnalyseGlowing(false), count);
            return () => clearTimeout(timer);
        }
    }, [hasBeamInputForm, hasElementForm]);

    
    // Handlers for form actions - Download All, Analyse All
    // Batch Form Action handlers
    /**
     * Analyze all beam input forms in the chat by submitting each form.
     */
    const analyseDesignAll = () => {
        messages.forEach(msg => {
            if (msg.type === 'beam_input_form' && Array.isArray(msg.beamInputsData) && Array.isArray(msg.isFormActive)) {
                msg.beamInputsData.forEach((data, i) => {
                    if (msg.isFormActive![i]) {
                        void handleFormSubmit(data, msg.id, i);
                    }
                });
            }
            if (msg.type === 'element_form' && Array.isArray(msg.elementData) && Array.isArray(msg.isFormActive)) {
                msg.elementData.forEach((data, i) => {
                    if (msg.isFormActive![i]) {
                        void handleElementFormSubmit(data, msg.id, i);
                    }
                });
            }
        });
    };

    /**
     * Download all beam output displays and element form documents in the chat.
     */
    const downloadAll = () => {
        console.log("[DEBUG] downloadAll called");
        console.log("[DEBUG] elementDownloadCallbacks keys:", Object.keys(elementDownloadCallbacks.current));
        
        messages.forEach(msg => {
            // Download beam analysis PDFs
            if (
                msg.type === 'beam_output_display'
                
            ) {
                const beamName = msg.beamInputsData[0].Name;
                analysisDisplayRefs.current[beamName]?.downloadPdf?.();
            }
            
            // Download element form PDFs (from TextEditor documents)
            if (
                msg.type === 'element_form' 
                
            ) {
                console.log("[DEBUG] Processing element_form message:", msg.id);
                msg.elementData.forEach((element, index) => {
                    const elementKey = `${msg.id}-${index}`;
                    console.log("[DEBUG] Checking element:", elementKey, "exists:", !!elementDownloadCallbacks.current[elementKey]);
                    
                    // Check if callback exists instead of relying on isFormActive
                    if (elementDownloadCallbacks.current[elementKey]) {
                        console.log("[DEBUG] Calling download for:", elementKey);
                        elementDownloadCallbacks.current[elementKey]();
                    } else {
                        console.log("[DEBUG] No callback found for:", elementKey);
                    }
                });
            }
        });
    };
    //#endregion

    return (
        <>  
            {/** Chat messages render*/}
            <main className="flex-grow container mx-auto p-4 overflow-y-auto flex flex-col">
                <div className="flex-grow space-y-4">
                    {messages.map((msg) => (

                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        
                        {/* Avatar for AI sender */}
                        {msg.sender === 'ai' && 
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">R</div>
                        }
                        
                        {/* Message Renders */}
                        <div className={`relative group max-w-2xl p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-base-100 text-gray-800 rounded-bl-none'} ${msg.type.endsWith('_form') || msg.type.endsWith('display') ? 'w-full' : ''}`}>
                            {/* This button renders where the Ai ask to undo a change */}
                            {msg.text && ( 
                                <div className="mb-2">{renderMessageText(msg.text, handleUndo)}</div> 
                            )}

                            {/* Interactive Action Buttons */}
                            {msg.actions && !msg.actionsConsumed && (
                                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                                    {msg.actions.map((action, index) => {
                                        if (action.type === 'confirm_attachment_analysis') {
                                            return <button key={index} onClick={() => handleActionClick(msg.id, action)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-focus transition-colors text-sm">Proceed</button>;
                                        }
                                        if (action.type === 'cancel_attachment_analysis') {
                                            return <button key={index} onClick={() => handleActionClick(msg.id, action)} className="px-4 py-2 bg-gray-200 text-neutral font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm">Cancel</button>;
                                        }
                                        return null;
                                    })}
                                </div>
                            )}

                            {/* Beam Input Forms */}
                            {msg.type === 'beam_input_form' && msg.beamInputsData && (
                            <div className="space-y-4">
                                {msg.beamInputsData.map((beamInput, index) => (
                                <div key={`${msg.id}-${index}`} className="relative group/form">
                                    <BeamInputForm 
                                        initialData={beamInput} 
                                        onChange={(data) => handleFormChange(msg.id, index, data)} 
                                        isFormActive={!!msg.isFormActive?.[index]} 
                                        onSubmit={(data) => handleFormSubmit(data, msg.id, index)} 
                                        onCancel={() => handleFormCancel(msg.id, index)} />
                                    <button onClick={() => handleAddToCanvas(msg, index)} 
                                            title="Pin to canvas" 
                                            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white shadow-md hover:bg-gray-100 text-gray-600 opacity-0 group-hover/form:opacity-100 transition-opacity">
                                        <PanelRightOpenIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                                ))}
                            </div>
                            )}

                            {/* Element Form */}
                            {msg.type === 'element_form' && msg.elementData && (
                                <div className="space-y-4">
                                    {msg.elementData.map((element, index) => (
                                        <div key={`${msg.id}-${index}`} className="relative group/form">
                                            <StructuralElementForm
                                                elementData={element}
                                                isFormActive={!!msg.isFormActive?.[index]}
                                                onChange={(data) => handleElementFormChange(msg.id, index, data)}
                                                onSubmit={(data) => handleElementFormSubmit(data, msg.id, index)}
                                                onCancel={() => handleElementFormCancel(msg.id, index)}
                                                onSave={(data) => handleElementFormSave(data, msg.id)}
                                                statusMessage={msg.statusMessage || null}
                                                sections={sections}
                                                projectData={projects}
                                                // Provide the list of elements for the element's project so the form can offer project-scoped candidates
                                                elementDataList={projects.find(p => p.id === element.projectId)?.elements || []}
                                                onPin={() => handleAddToCanvas(msg, index)}
                                                onRegisterDownload={(downloadCallback) => {
                                                    const elementKey = `${msg.id}-${index}`;
                                                    elementDownloadCallbacks.current[elementKey] = downloadCallback;
                                                }}
                                            />
                                            {/* Floating Pin Button - Only show when form is active */}
                                            {msg.isFormActive?.[index] && (
                                                <button
                                                    onClick={() => handleAddToCanvas(msg, index)}
                                                    title="Pin to canvas"
                                                    style={{
                                                        position: 'absolute',
                                                        left: msg.sender === 'user' ? 'unset' : 12,
                                                        right: msg.sender === 'user' ? 12 : 'unset',
                                                        bottom: -28,
                                                        backgroundColor: 'white',
                                                        boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                                                        color: 'red',
                                                        border: '2px solid',
                                                        borderColor: 'rgba(59,130,246,0.3)',
                                                        padding: 8,
                                                        zIndex: 2,
                                                        borderRadius: '9999px',
                                                        transition: 'background 0.2s, box-shadow 0.2s'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, transform: 'rotate(-45deg)' }}>
                                                        <path d="M12.707 2.293a1 1 0 00-1.414 0L9 4.586 5.707 7.879a1 1 0 00-.293.707V11a1 1 0 00.293.707l6 6a1 1 0 001.414 0l2.293-2.293L21 13.414a1 1 0 000-1.414l-8.293-8.293zM7.5 9.914L9 8.414 14.586 14 13.086 15.5 7.5 9.914z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Beam Output Display */}
                            {msg.type === 'beam_output_display' && msg.beamOutputData && msg.beamInputsData?.[0] && (() => {
                                const beamName = msg.beamInputsData[0].Name;
                                return (
                                <div className="relative group/form">
                                    <BeamAnalysisDisplay ref={(el: BeamAnalysisDisplayHandle | null) => { analysisDisplayRefs.current[beamName] = el; }} output={msg.beamOutputData} input={msg.beamInputsData[0]} />
                                    <button onClick={() => handleAddToCanvas(msg)} title="Pin to canvas" className="absolute top-2 right-2 p-1.5 rounded-full bg-white shadow-md hover:bg-gray-100 text-gray-600 opacity-0 group-hover/form:opacity-100 transition-opacity">
                                        <PanelRightOpenIcon className="w-5 h-5 text-red-500" />
                                    </button>
                                </div>
                                );
                            })()}

                            {/* Normal Text */}
                            {(msg.type === 'text' || msg.type === 'error') && !msg.actions && (
                                <button onClick={() => handleAddToCanvas(msg)} title="Pin to canvas" className="absolute top-1 right-1 p-1 rounded-full bg-white/20 hover:bg-white/40 text-current opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PanelRightOpenIcon className="w-5 h-5 text-red-500" />
                                </button>
                            )}
                        </div>

                        {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{user?.displayName.charAt(0) || 'U'}</div>}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">R</div>
                            <div className="max-w-2xl p-4 rounded-2xl bg-base-100 text-gray-800 rounded-bl-none">
                                <div className="flex items-center space-x-2"> <Spinner /> <span className="italic text-gray-500">AI is thinking...</span> </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />

                    
                </div>
            </main>

            {/** Input area */}
            <footer className="flex-shrink-0 bg-base-100 border-t border-base-300 z-10">
                <div className="container mx-auto p-4 space-y-3">

                    {/** Action buttons first line - Quick Analysis stays visible; other actions are auth-gated */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Quick Analysis : to open beamInputForm (always visible) */}
                        <button onClick={handleAddBeamClick} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral bg-base-200 hover:bg-base-300 rounded-full transition-colors"> <AddIcon className="w-4 h-4" /> Quick Analysis </button>

                        {/* The rest behind the sign in wall */}
                        {user && (
                        <>
                        
                        {/* Element Button : to open StructuralElementForm */}
                        <button onClick={handleAddElementClick} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral bg-base-200 hover:bg-base-300 rounded-full transition-colors"> <BuildingBlockIcon className="w-4 h-4" /> New Element </button>
                        
                        {/* Upload Drawing Button : to open file input dialog */}
                        <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral bg-base-200 hover:bg-base-300 rounded-full transition-colors"> <DocumentMagnifyingGlassIcon className="w-4 h-4" /> Analyze Drawing </button>
                        
                        {/* Manage Sections Button : to open sections modal */}
                        <button
                            onClick={handleOpenSectionsModal}
                            disabled={!isPersistenceEnabled}
                            title={!isPersistenceEnabled ? "Requires Firebase configuration to save and manage sections" : "Manage Sections"}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral bg-base-200 hover:bg-base-300 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ListBulletIcon className="w-4 h-4" /> Manage Sections
                        </button>

                        {/** Batch action chips */}
                        {/* Show Analyse/Design All if there is at least one beam input form and one element form */}
                        {(hasBeamInputForm || hasElementForm) && (
                            <button
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${analyseGlowing ? 'animate-pulse' : ''}`}
                                onClick={analyseDesignAll}
                                style={{ boxShadow: '0 6px 18px rgba(59,130,246,0.12)' }}
                            >
                                Analyse/Design All
                            </button>
                        )}

                        {/* Download All if there is at least one beam input form and one element form */}
                        { hasBeamOutput && (
                            <button
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-full transition-colors ${downloadGlowing ? 'animate-pulse' : ''}`}
                                onClick={downloadAll}
                                style={{ boxShadow: '0 6px 20px rgba(255,182,193,0.45)' }}
                            >
                                Download All
                            </button>
                        )}
                            
 
                        {/* Show attached file chip if there is a file */}
                        {fileToUpload && (
                            <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                                <UploadIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-xs">{fileToUpload.name}</span>
                                <button onClick={() => setFileToUpload(null)} className="p-1 rounded-full hover:bg-blue-200 transition-colors" aria-label="Remove attached file"> <CloseIcon className="w-4 h-4" /> </button>
                            </div>
                        )}
                        </>
                        )}
                    </div>

                    {/** Input area second line*/}
                    <div className="flex items-center gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                        
                        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-3 rounded-full hover:bg-base-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors" aria-label="Upload drawing" title="Upload PDF, PNG, or JPG drawing"> <UploadIcon className="w-6 h-6 text-neutral" /> </button>

                        {/* Voice input button */}
                        {isSpeechSupported && (
                            <button onClick={handleToggleListening} disabled={isLoading} className={`p-3 rounded-full transition-colors ${ isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-base-200 text-neutral' } disabled:bg-gray-300 disabled:cursor-not-allowed`} aria-label={isListening ? "Stop listening" : "Start voice input"} title={isListening ? "Stop listening" : "Start voice input"}> <MicrophoneIcon className="w-6 h-6" /> </button>
                        )}

                        {/** Context selector and Input field*/}
                        <div className="relative flex items-center w-full border border-base-300 rounded-full focus-within:ring-2 focus-within:ring-primary transition-shadow bg-white">
                            <div className="relative inline-block text-left group">
                                <button className="flex items-center gap-2 pl-4 pr-3 py-2 text-sm font-medium text-neutral bg-base-200 h-full rounded-l-full border-r border-base-300 hover:bg-base-300 transition-colors">
                                    <ChatBubbleLeftRightIcon className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden sm:inline">Context:</span>
                                    <span className="font-bold capitalize">{context}</span>
                                </button>
                                <div className="absolute bottom-full mb-2 w-40 origin-bottom-left bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        <a href="#" onClick={(e) => { e.preventDefault(); setContext('chat'); }} className={`block px-4 py-2 text-sm ${context === 'chat' ? 'bg-teal-100 text-teal-800' : 'text-gray-700 hover:bg-gray-100'}`} role="menuitem">Chat</a>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setContext('canvas'); }} className={`block px-4 py-2 text-sm ${context === 'canvas' ? 'bg-teal-100 text-teal-800' : 'text-gray-700 hover:bg-gray-100'}`} role="menuitem">Canvas</a>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setContext('attachm.'); }} className={`block px-4 py-2 text-sm ${context === 'attachm.' ? 'bg-teal-100 text-teal-800' : 'text-gray-700 hover:bg-gray-100'}`} role="menuitem">Attachm.</a>
                                    </div>
                                </div>
                            </div>
                            
                            <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Describe your beam, upload a drawing, or ask a question..." className="w-full px-4 py-2 border-none focus:outline-none bg-transparent" disabled={isLoading} />
                        </div>

                        {/** Send button */}
                        <button onClick={handleSendMessage} disabled={isLoading || (!userInput.trim() && !fileToUpload)} className="bg-primary text-white p-3 rounded-full hover:bg-primary-focus disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors" aria-label="Send message"> <SendIcon className="w-6 h-6" /> </button>
                    </div>
                </div>
            </footer>
        </>
    );
};
