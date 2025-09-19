// components/Canvas.tsx: Renders the side panel for pinned items.

import React, { useState } from 'react';
import { CanvasItem, CanvasTextItem, CanvasBeamInputItem, StatusMessage } from '../customTypes/types';
import type { Element as StructuralElement } from '../customTypes/structuralElement';
import { BeamInput } from '../customTypes/structuralElement';
import { CloseIcon } from './utility/icons';
import StructuralElementForm from './structuralEngineering/StructuralElementForm';
import { BeamInputForm } from '././structuralEngineering/BeamInputForm';
import { BeamAnalysisDisplay } from '././structuralEngineering/BeamAnalysisDisplay';
import { Spinner } from './utility/Spinner';

interface CanvasProps {
    items: CanvasItem[];
    selectedItemId: string | null;
    onSelectItem: (id: string | null) => void;
    onCloseItem: (id: string) => void;
    onUpdateItem: (item: CanvasItem) => void;
    onAnalyzeInCanvas: (beamInput: BeamInput, itemId: string) => Promise<void>;
    // New handlers for element actions inside the Canvas
    onElementSave?: (element: StructuralElement, itemId: string) => Promise<void>;
    onElementDesign?: (element: StructuralElement, itemId: string) => Promise<void>;
    // Status message callbacks
    onStatusUpdate?: (itemId: string, status: StatusMessage | null) => void;
    // Context data for StructuralElementForm
    sections?: any[];
    projects?: any[];
}

// A wrapper for the currently displayed item in the canvas, providing a title bar.
const SelectedItemWrapper: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
        <div className="flex justify-between items-center p-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 truncate pr-2">{title}</h3>
        </div>
        <div className="p-4 bg-white rounded-b-lg relative">
            {children}
        </div>
    </div>
);

// Specific component for editable text items
const TextCanvasItem: React.FC<{ item: CanvasTextItem; onUpdate: (item: CanvasTextItem) => void }> = ({ item, onUpdate }) => {
    const [content, setContent] = useState(item.content);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    };

    const handleBlur = () => {
        onUpdate({ ...item, content });
    };

    return (
        <textarea
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="w-full h-48 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
            aria-label="Text note editor"
        />
    );
};


export const Canvas: React.FC<CanvasProps> = ({ 
    items, 
    selectedItemId,
    onSelectItem,
    onCloseItem, 
    onUpdateItem, 
    onAnalyzeInCanvas,
    onElementSave,
    onElementDesign,
    onStatusUpdate,
    sections = [],
    projects = []
}) => {
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [elementStatusMessages, setElementStatusMessages] = useState<Record<string, StatusMessage | null>>({});

    const handleFormSubmit = async (data: BeamInput, itemId: string) => {
        setAnalyzingId(itemId);
        await onAnalyzeInCanvas(data, itemId);
        setAnalyzingId(null);
    };

    // Helper to update status message for a specific element
    const updateElementStatus = (itemId: string, status: StatusMessage | null) => {
        setElementStatusMessages(prev => ({ ...prev, [itemId]: status }));
        if (onStatusUpdate) {
            onStatusUpdate(itemId, status);
        }
    };

    // Enhanced element save handler with status messages
    const handleElementSave = async (data: StructuralElement, itemId: string) => {
        updateElementStatus(itemId, { 
            type: 'loading', 
            message: `Saving "${data.name}"...`, 
            timestamp: new Date().toLocaleTimeString() 
        });

        try {
            if (typeof onElementSave === 'function') {
                await onElementSave(data, itemId);
            }
            // Don't call onUpdateItem here - App.tsx handlers already update canvas items
            
            updateElementStatus(itemId, { 
                type: 'success', 
                message: `Saved "${data.name}".`, 
                timestamp: new Date().toLocaleTimeString() 
            });

            // Clear status after delay
            setTimeout(() => updateElementStatus(itemId, null), 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateElementStatus(itemId, { 
                type: 'error', 
                message: `Save failed: ${errorMessage}`, 
                timestamp: new Date().toLocaleTimeString() 
            });
        }
    };

    // Enhanced element design handler with status messages
    const handleElementDesign = async (data: StructuralElement, itemId: string) => {
        updateElementStatus(itemId, { 
            type: 'loading', 
            message: `Designing "${data.name}" (${data.loadCombinations?.length || 0} combos)...`, 
            timestamp: new Date().toLocaleTimeString() 
        });

        try {
            if (typeof onElementDesign === 'function') {
                await onElementDesign(data, itemId);
            }
            // Don't call onUpdateItem here - App.tsx handlers already update canvas items with design results
            
            updateElementStatus(itemId, { 
                type: 'success', 
                message: `Design complete for "${data.name}".`, 
                timestamp: new Date().toLocaleTimeString() 
            });

            // Clear status after delay
            setTimeout(() => updateElementStatus(itemId, null), 5000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateElementStatus(itemId, { 
                type: 'error', 
                message: `Design failed: ${errorMessage}`, 
                timestamp: new Date().toLocaleTimeString() 
            });
        }
    };
    
    // Helper to get a short title for the chip.
    const getChipTitle = (item: CanvasItem) => {
        switch (item.type) {
            case 'text':
                return item.title || 'Note';
            case 'beam_input':
                return item.data.Name;
            case 'element':
                // element items store the Element under `data`
                return (item as any).data?.name || 'Element';
            case 'beam_output':
                return item.inputData.Name;
            default:
                return 'Item';
        }
    };
    
    const selectedItem = items.find(item => item.id === selectedItemId);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl font-bold text-neutral">Canvas</h2>
                <p className="text-sm text-gray-500">A workspace for your pinned items.</p>
            </div>
            
            {/* Chips for navigation */}
            {items.length > 0 && (
                <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white overflow-x-auto">
                    <div className="flex items-center gap-2">
                        {items.map(item => (
                            <div key={item.id} className="relative group flex-shrink-0">
                                <button
                                    onClick={() => onSelectItem(item.id)}
                                    className={`flex items-center gap-2 pl-3 pr-8 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                        selectedItemId === item.id 
                                        ? 'bg-blue-600 text-white shadow' 
                                        : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-300'
                                    }`}
                                >
                                    <span>{getChipTitle(item)}</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onCloseItem(item.id); }} 
                                    className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1 rounded-full transition-colors ${
                                        selectedItemId === item.id
                                        ? 'text-white/70 hover:text-white hover:bg-black/20'
                                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-300'
                                    }`}
                                    aria-label={`Remove ${getChipTitle(item)}`}
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Canvas Content */}
            <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
                {items.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        <p>Your canvas is empty.</p>
                        <p className="text-sm">Hover over chat items and click the pin icon to add them here.</p>
                    </div>
                )}
                {selectedItem && (() => {
                    switch (selectedItem.type) {
                        case 'text':
                            return (
                                <SelectedItemWrapper title={selectedItem.title}>
                                    <TextCanvasItem item={selectedItem} onUpdate={onUpdateItem as (i: CanvasTextItem) => void} />
                                </SelectedItemWrapper>
                            );
                        case 'element':
                            // Render a full StructuralElementForm inside the Canvas for elements.
                            const elementData = (selectedItem as any).data;
                            const elementProjectId = elementData?.projectId;
                            const elementProject = projects.find(p => p.id === elementProjectId);
                            const elementDataList = elementProject?.elements || [];
                            
                            return (
                                <SelectedItemWrapper title={`Element: ${elementData?.name || 'Element'}`}>
                                    <StructuralElementForm
                                        elementData={elementData}
                                        isFormActive={true}
                                        onSubmit={(data) => handleElementDesign(data, selectedItem.id)}
                                        onCancel={() => onCloseItem(selectedItem.id)}
                                        onSave={(data) => handleElementSave(data, selectedItem.id)}
                                        statusMessage={elementStatusMessages[selectedItem.id] || null}
                                        sections={sections}
                                        projectData={projects}
                                        elementDataList={elementDataList}
                                    />
                                </SelectedItemWrapper>
                            );
                                                case 'beam_input': {
                                                         const isAnalyzing = analyzingId === selectedItem.id;
                                                         const inputItem = selectedItem as CanvasBeamInputItem;
                                                         return (
                                                                <SelectedItemWrapper title={`Edit: ${inputItem.data.Name}`}>
                                                                     {isAnalyzing && (
                                                                             <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                                                                                     <Spinner />
                                                                                     <span className="ml-2">Analyzing...</span>
                                                                             </div>
                                                                     )}
                                                                     <BeamInputForm
                                                                                initialData={inputItem.data}
                                                                                onChange={(updatedData) => onUpdateItem({ ...inputItem, data: updatedData })}
                                                                                onSubmit={(data) => handleFormSubmit(data, inputItem.id)}
                                                                                submitButtonText="Analyze in Canvas"
                                                                        />
                                                                     {/* Render analysis results in same chip when available */}
                                                                     {inputItem.outputData && (
                                                                         <div className="mt-4">
                                                                             <BeamAnalysisDisplay input={inputItem.data} output={inputItem.outputData} />
                                                                         </div>
                                                                     )}
                                                                </SelectedItemWrapper>
                                                         );
                                                }
                        case 'beam_output':
                            return (
                                <SelectedItemWrapper title={`Results: ${selectedItem.inputData.Name}`}>
                                    <BeamAnalysisDisplay input={selectedItem.inputData} output={selectedItem.outputData} />
                                </SelectedItemWrapper>
                            );
                        default:
                            return null;
                    }
                })()}
            </div>
        </div>
    );
};