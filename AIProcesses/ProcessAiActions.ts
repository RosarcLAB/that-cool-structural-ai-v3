import { Action, ChatMessage, CanvasItem } from '../customTypes/types';
import { BeamInput, Element as StructuralElement, SupportFixityType, LoadType, LoadCaseType } from '../customTypes/structuralElement';
import { projectTransferRegistry } from '../services/projectTransferRegistry';

/**
 * ProcessAiActions class handles the processing of AI-requested actions
 * such as submit, cancel, submit_all, form manipulation operations, and canvas/chat updates.
 */
export class ProcessAiActions {
    private messages: ChatMessage[] = [];
    private setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void = () => {};
    private canvasItems: CanvasItem[] = [];
    private setCanvasItems: (callback: (prevItems: CanvasItem[]) => CanvasItem[]) => void = () => {};
    private saveHistorySnapshot: () => void = () => {};
    private handleBeamInputFormSubmit: (data: BeamInput, msgId: string, formIndex: number) => Promise<void>;
    private handleBeamInputFormCancel: (msgId: string, formIndex: number) => void;
    private handleElementFormSubmit: (data: StructuralElement, msgId: string, formIndex: number) => Promise<void>;
    private handleElementFormCancel: (msgId: string, formIndex: number) => void;

    constructor(
        messages: ChatMessage[],
        setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void,
        canvasItems: CanvasItem[],
        setCanvasItems: (callback: (prevItems: CanvasItem[]) => CanvasItem[]) => void,
        saveHistorySnapshot: () => void,
        handleBeamInputFormSubmit: (data: BeamInput, msgId: string, formIndex: number) => Promise<void>,
        handleBeamInputFormCancel: (msgId: string, formIndex: number) => void,
        handleElementFormSubmit: (data: StructuralElement, msgId: string, formIndex: number) => Promise<void>,
        handleElementFormCancel: (msgId: string, formIndex: number) => void
    ) {
        this.updateDependencies(messages, setMessages, canvasItems, setCanvasItems, saveHistorySnapshot);
        this.handleBeamInputFormSubmit = handleBeamInputFormSubmit;
        this.handleBeamInputFormCancel = handleBeamInputFormCancel;
        this.handleElementFormSubmit = handleElementFormSubmit;
        this.handleElementFormCancel = handleElementFormCancel;
    }
    
    public updateDependencies(
        messages: ChatMessage[],
        setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void,
        canvasItems: CanvasItem[],
        setCanvasItems: (callback: (prevItems: CanvasItem[]) => CanvasItem[]) => void,
        saveHistorySnapshot: () => void
    ) {
        this.messages = messages;
        this.setMessages = setMessages;
        this.canvasItems = canvasItems;
        this.setCanvasItems = setCanvasItems;
        this.saveHistorySnapshot = saveHistorySnapshot;
    }


    /**
     * Finds the last message containing an active form of a specific type.
     */
    private findLastActiveFormMessage(type: 'beam_input_form' | 'element_form'): ChatMessage | undefined {
        return [...this.messages].reverse().find(m =>
            m.sender === 'ai' && m.type === type && m.isFormActive?.some(isActive => isActive)
        );
    }

    /**
     * Processes a single action
     * @param action - The action to process
     */
    public processAction(action: Action): void {
        const lastBeamFormMessage = this.findLastActiveFormMessage('beam_input_form');
        const lastElementFormMessage = this.findLastActiveFormMessage('element_form');

        switch (action.type) {
            case 'submit':
                // FIX: The type of `action` is narrowed to `FormAction`, but `FormAction['type']` is a union.
                // This is not compatible with `handleSubmitAction` which expects `type` to be exactly `'submit'`.
                // We create a new object with the correctly narrowed type. `action.targetIndex` is safe to access here.
                this.handleSubmitAction({ type: 'submit', targetIndex: action.targetIndex }, lastBeamFormMessage, lastElementFormMessage);
                break;
            case 'cancel':
                // FIX: The type of `action` is narrowed to `FormAction`, but `FormAction['type']` is a union.
                // This is not compatible with `handleCancelAction` which expects `type` to be exactly `'cancel'`.
                // We create a new object with the correctly narrowed type. `action.targetIndex` is safe to access here.
                this.handleCancelAction({ type: 'cancel', targetIndex: action.targetIndex }, lastBeamFormMessage, lastElementFormMessage);
                break;
            case 'submit_all':
                this.handleSubmitAllAction(lastBeamFormMessage, lastElementFormMessage);
                break;
            case 'update_beam_form':
                this.handleUpdateBeamFormAction(action);
                break;
            case 'update_element_form':
                this.handleUpdateElementFormAction(action);
                break;
            case 'download_analysis':
                this.handleDownloadAnalysisAction(action);
                break;
            case 'add_load_transfer':
                this.handleAddLoadTransferAction(action);
                break;
            case 'remove_load_transfer':
                this.handleRemoveLoadTransferAction(action);
                break;
            // ... other top-level actions
            default:
                this.handleFormManipulationAction(action, lastBeamFormMessage, lastElementFormMessage);
        }
    }
    
    private handleFormManipulationAction(action: Action, lastBeamFormMessage?: ChatMessage, lastElementFormMessage?: ChatMessage): void {
        if (!('targetIndex' in action) || typeof action.targetIndex !== 'number') return;

        // Cast to FormManipulationAction to access new properties
        const manipulationAction = action as any; // FormManipulationAction type

        console.log('🎯 Form manipulation routing:', {
            actionType: action.type,
            hasTargetContext: !!manipulationAction.targetContext,
            hasTargetElementName: !!manipulationAction.targetElementName,
            hasTargetBeamName: !!manipulationAction.targetBeamName,
            targetIndex: manipulationAction.targetIndex
        });

        // Check if action has location context information
        if (manipulationAction.targetContext && manipulationAction.targetElementName) {
            // Location-aware element handling
            console.log('➡️ Routing to location-aware element manipulation');
            this.handleElementManipulation(manipulationAction);
        } else if (manipulationAction.targetContext && manipulationAction.targetBeamName) {
            // Location-aware beam handling
            console.log('➡️ Routing to location-aware beam manipulation');
            this.handleBeamManipulation(manipulationAction);
        } else {
            // Fallback to legacy behavior with smart detection
            // This handles most cases where AI doesn't provide targetElementName/targetBeamName
            console.log('➡️ Routing to legacy form manipulation');
            this.handleLegacyFormManipulation(action, lastBeamFormMessage, lastElementFormMessage);
        }
    }

    /**
     * Handles element manipulation actions with location awareness
     */
    private handleElementManipulation(action: any): void {
        this.saveHistorySnapshot();
        
        if (action.targetContext === 'canvas') {
            // Update canvas items
            this.setCanvasItems(prevItems => {
                return prevItems.map(item => {
                    if (item.type === 'element' && (item as any).data?.name === action.targetElementName) {
                        const updatedElement = this.manipulateElementData({ ...(item as any).data }, action);
                        return { ...item, data: updatedElement };
                    }
                    return item;
                });
            });
        } else {
            // Update chat messages - use smart detection to find the item
            const targetItem = this.findElementInMessages(action.targetElementName);
            if (targetItem) {
                this.setMessages(prevMessages => {
                    return prevMessages.map(msg => {
                        if (msg.type === 'element_form' && msg.elementData) {
                            const updatedElementData = msg.elementData.map(element => {
                                if (element.name === action.targetElementName) {
                                    return this.manipulateElementData(element, action);
                                }
                                return element;
                            });
                            return { ...msg, elementData: updatedElementData };
                        }
                        return msg;
                    });
                });
            } else {
                // Smart detection: check canvas first, then update there
                const canvasItem = this.canvasItems.find(item => 
                    item.type === 'element' && (item as any).data?.name === action.targetElementName
                );
                if (canvasItem) {
                    this.setCanvasItems(prevItems => {
                        return prevItems.map(item => {
                            if (item.type === 'element' && (item as any).data?.name === action.targetElementName) {
                                const updatedElement = this.manipulateElementData({ ...(item as any).data }, action);
                                return { ...item, data: updatedElement };
                            }
                            return item;
                        });
                    });
                }
            }
        }
    }

    /**
     * Handles beam manipulation actions with location awareness
     */
    private handleBeamManipulation(action: any): void {
        console.log('🔧 Beam manipulation called:', {
            actionType: action.type,
            targetContext: action.targetContext,
            targetBeamName: action.targetBeamName,
            canvasItemsCount: this.canvasItems.length
        });

        this.saveHistorySnapshot();
        
        if (action.targetContext === 'canvas') {
            console.log('🖼️ Updating canvas beam');
            // Update canvas items
            this.setCanvasItems(prevItems => {
                return prevItems.map(item => {
                    if (item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName) {
                        console.log('✅ Found matching beam in canvas:', (item as any).data?.Name);
                        const updatedBeam = this.manipulateBeamData({ ...(item as any).data }, action);
                        return { ...item, data: updatedBeam };
                    }
                    return item;
                });
            });
        } else {
            console.log('💬 Updating chat beam');
            // Update chat messages - use smart detection to find the item
            const targetItem = this.findBeamInMessages(action.targetBeamName);
            console.log('🔍 Target item found in messages:', !!targetItem);
            
            if (targetItem) {
                this.setMessages(prevMessages => {
                    return prevMessages.map(msg => {
                        if (msg.type === 'beam_input_form' && msg.beamInputsData) {
                            const updatedBeamData = msg.beamInputsData.map(beam => {
                                if (beam.Name === action.targetBeamName) {
                                    console.log('✅ Found matching beam in chat:', beam.Name);
                                    return this.manipulateBeamData(beam, action);
                                }
                                return beam;
                            });
                            return { ...msg, beamInputsData: updatedBeamData };
                        }
                        return msg;
                    });
                });
            } else {
                console.log('🔄 Smart detection: checking canvas');
                // Smart detection: check canvas first, then update there
                const canvasItem = this.canvasItems.find(item => 
                    item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName
                );
                console.log('🖼️ Canvas item found:', !!canvasItem);
                
                if (canvasItem) {
                    this.setCanvasItems(prevItems => {
                        return prevItems.map(item => {
                            if (item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName) {
                                console.log('✅ Updating beam via smart detection:', (item as any).data?.Name);
                                const updatedBeam = this.manipulateBeamData({ ...(item as any).data }, action);
                                return { ...item, data: updatedBeam };
                            }
                            return item;
                        });
                    });
                } else {
                    console.warn('⚠️ No beam found with name:', action.targetBeamName);
                }
            }
        }
    }

    /**
     * Legacy form manipulation handler for backward compatibility
     */
    private handleLegacyFormManipulation(action: Action, lastBeamFormMessage?: ChatMessage, lastElementFormMessage?: ChatMessage): void {
        // Cast to access targetIndex since we already checked it exists
        const manipulationAction = action as any;
        
        console.log('🔧 Legacy form manipulation:', {
            action: action.type,
            targetIndex: manipulationAction.targetIndex,
            lastBeamMessage: !!lastBeamFormMessage,
            lastElementMessage: !!lastElementFormMessage,
            canvasItemsCount: this.canvasItems.length
        });

        this.saveHistorySnapshot();

        // Try to find forms in chat messages first
        const formMessage = lastElementFormMessage || lastBeamFormMessage;
        if (formMessage) {
            console.log('📝 Updating chat message:', formMessage.id);
            this.setMessages(prev => prev.map(msg => {
                if (msg.id !== formMessage.id) return msg;

                let updatedElementData = msg.elementData ? [...msg.elementData] : undefined;
                let updatedBeamData = msg.beamInputsData ? [...msg.beamInputsData] : undefined;

                if (msg.type === 'element_form' && updatedElementData && updatedElementData[manipulationAction.targetIndex]) {
                    console.log('🔧 Manipulating element in chat');
                    let element = { ...updatedElementData[manipulationAction.targetIndex] };
                    element = this.manipulateElementData(element, action);
                    updatedElementData[manipulationAction.targetIndex] = element;
                } else if (msg.type === 'beam_input_form' && updatedBeamData && updatedBeamData[manipulationAction.targetIndex]) {
                    console.log('🔧 Manipulating beam in chat');
                    let beam = { ...updatedBeamData[manipulationAction.targetIndex] };
                    beam = this.manipulateBeamData(beam, action);
                    updatedBeamData[manipulationAction.targetIndex] = beam;
                }
                
                return { ...msg, elementData: updatedElementData, beamInputsData: updatedBeamData };
            }));
        } else {
            // No active forms in chat, try canvas items
            console.log('🖼️ No active forms in chat, checking canvas items');
            
            // Since we don't have a specific target, try to manipulate the first relevant canvas item
            // This is a fallback behavior
            let canvasUpdated = false;
            
            this.setCanvasItems(prevItems => {
                return prevItems.map((item, index) => {
                    if (canvasUpdated) return item; // Only update the first matching item
                    
                    if (item.type === 'element' && manipulationAction.targetIndex === 0) {
                        console.log('🔧 Manipulating first element in canvas');
                        const updatedElement = this.manipulateElementData({ ...(item as any).data }, action);
                        canvasUpdated = true;
                        return { ...item, data: updatedElement };
                    } else if (item.type === 'beam_input' && manipulationAction.targetIndex === 0) {
                        console.log('🔧 Manipulating first beam in canvas');
                        const updatedBeam = this.manipulateBeamData({ ...(item as any).data }, action);
                        canvasUpdated = true;
                        return { ...item, data: updatedBeam };
                    }
                    return item;
                });
            });
            
            if (!canvasUpdated) {
                console.warn('⚠️ No forms found to manipulate in chat or canvas');
            }
        }
    }

    /**
     * Applies manipulation operations to element data
     */
    private manipulateElementData(element: StructuralElement, action: any): StructuralElement {
        switch (action.type) {
            case 'addSupport':
                const newSupport = action.data?.newItem as any || { position: element.span/2, fixity: SupportFixityType.Roller };
                element.supports = [...element.supports, newSupport];
                break;
            case 'removeSupport':
                if (typeof action.itemIndex === 'number') {
                    element.supports = element.supports.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editSupport':
                if (typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    element.supports = element.supports.map((s, i) => {
                        if (i !== action.itemIndex) return s;
                        return { ...s, ...action.data!.propertyUpdates };
                    });
                }
                break;
            case 'addAppliedLoad':
                if (action.data?.newItem) {
                    element.appliedLoads = [...element.appliedLoads, action.data.newItem as any];
                } else if (action.data?.newItems) {
                    element.appliedLoads = [...element.appliedLoads, ...(action.data.newItems as any[])];
                }
                break;
            case 'removeAppliedLoad':
                if (typeof action.itemIndex === 'number') {
                    element.appliedLoads = element.appliedLoads.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editAppliedLoad':
                if (typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    element.appliedLoads = element.appliedLoads.map((l, i) => {
                        if (i !== action.itemIndex) return l;
                        return { ...l, ...action.data!.propertyUpdates };
                    });
                }
                break;
            case 'addLoadCombination':
                if (action.data?.newItem) {
                    element.loadCombinations = [...element.loadCombinations, action.data.newItem as any];
                } else if (action.data?.newItems) {
                    element.loadCombinations = [...element.loadCombinations, ...(action.data.newItems as any[])];
                }
                break;
            case 'removeLoadCombination':
                if (typeof action.itemIndex === 'number') {
                    element.loadCombinations = element.loadCombinations.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editLoadCombination':
                if (typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    element.loadCombinations = element.loadCombinations.map((c, i) => {
                        if (i !== action.itemIndex) return c;
                        return { ...c, ...action.data!.propertyUpdates };
                    });
                }
                break;
            case 'addLoadCaseFactor':
                if (action.parentIndex != null && action.data?.newItem) {
                    const combo = element.loadCombinations[action.parentIndex];
                    combo.loadCaseFactors = [...combo.loadCaseFactors, action.data.newItem as any];
                } else if (action.parentIndex != null && action.data?.newItems) {
                    const combo = element.loadCombinations[action.parentIndex];
                    combo.loadCaseFactors = [...combo.loadCaseFactors, ...(action.data.newItems as any[])];
                }
                break;
            case 'removeLoadCaseFactor':
                if (typeof action.parentIndex === 'number' && typeof action.itemIndex === 'number') {
                    const combo = element.loadCombinations[action.parentIndex];
                    combo.loadCaseFactors = combo.loadCaseFactors.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editLoadCaseFactor':
                if (typeof action.parentIndex === 'number' && typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    const combo = element.loadCombinations[action.parentIndex];
                    combo.loadCaseFactors = combo.loadCaseFactors.map((f, i) => {
                        if (i !== action.itemIndex) return f;
                        return { ...f, ...action.data!.propertyUpdates };
                    });
                }
                break;
        }
        return element;
    }

    /**
     * Applies manipulation operations to beam data
     */
    private manipulateBeamData(beam: BeamInput, action: any): BeamInput {
        switch (action.type) {
            case 'addSupport':
                beam.Supports = [...beam.Supports, { position: beam.Span/2, fixity: SupportFixityType.Roller }];
                break;
            case 'removeSupport':
                if (typeof action.itemIndex === 'number') {
                    beam.Supports = beam.Supports.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editSupport':
                if (typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    beam.Supports = beam.Supports.map((s, i) => {
                        if (i !== action.itemIndex) return s;
                        return { ...s, ...action.data!.propertyUpdates };
                    });
                }
                break;
            case 'addLoad':
                if (action.data?.newItem) {
                    beam.Loads = [...beam.Loads, action.data.newItem as any];
                } else if (action.data?.newItems) {
                    beam.Loads = [...beam.Loads, ...(action.data.newItems as any[])];
                } else {
                    // Default load if no data provided
                    beam.Loads = [...beam.Loads, { name: "New Load", type: LoadType.PointLoad, magnitude: [1000], position: [String(beam.Span/2)] }];
                }
                break;
            case 'removeLoad':
                if (typeof action.itemIndex === 'number') {
                    beam.Loads = beam.Loads.filter((_, i) => i !== action.itemIndex);
                }
                break;
            case 'editLoad':
                if (typeof action.itemIndex === 'number' && action.data?.propertyUpdates) {
                    beam.Loads = beam.Loads.map((l, i) => {
                        if (i !== action.itemIndex) return l;
                        return { ...l, ...action.data!.propertyUpdates };
                    });
                }
                break;
        }
        return beam;
    }


    /**
     * Handles submit action for individual forms
     */
    private handleSubmitAction(action: { type: 'submit', targetIndex: number }, lastBeamFormMessage?: ChatMessage, lastElementFormMessage?: ChatMessage): void {
        const { targetIndex } = action;
        if (lastBeamFormMessage?.isFormActive?.[targetIndex] && lastBeamFormMessage.beamInputsData?.[targetIndex]) {
            this.handleBeamInputFormSubmit(lastBeamFormMessage.beamInputsData[targetIndex], lastBeamFormMessage.id, targetIndex);
        } else if (lastElementFormMessage?.isFormActive?.[targetIndex] && lastElementFormMessage.elementData?.[targetIndex]) {
            this.handleElementFormSubmit(lastElementFormMessage.elementData[targetIndex], lastElementFormMessage.id, targetIndex);
        }
    }

    /**
     * Handles cancel action for individual forms
     */
    private handleCancelAction(action: { type: 'cancel', targetIndex: number }, lastBeamFormMessage?: ChatMessage, lastElementFormMessage?: ChatMessage): void {
        const { targetIndex } = action;
        if (lastBeamFormMessage?.isFormActive?.[targetIndex]) {
            this.handleBeamInputFormCancel(lastBeamFormMessage.id, targetIndex);
        } else if (lastElementFormMessage?.isFormActive?.[targetIndex]) {
            this.handleElementFormCancel(lastElementFormMessage.id, targetIndex);
        }
    }
    
    /**
     * Handles submit_all action for all active forms
     */
    private handleSubmitAllAction(lastBeamFormMessage?: ChatMessage, lastElementFormMessage?: ChatMessage): void {
        if (lastBeamFormMessage?.beamInputsData) {
            lastBeamFormMessage.beamInputsData.forEach((data, index) => {
                if (lastBeamFormMessage.isFormActive?.[index]) {
                    this.handleBeamInputFormSubmit(data, lastBeamFormMessage.id, index);
                }
            });
        }
        if (lastElementFormMessage?.elementData) {
            lastElementFormMessage.elementData.forEach((data, index) => {
                if (lastElementFormMessage.isFormActive?.[index]) {
                    this.handleElementFormSubmit(data, lastElementFormMessage.id, index);
                }
            });
        }
    }

    /**
     * Handles update_beam_form action with context-aware updates
     */
    private handleUpdateBeamFormAction(action: { type: 'update_beam_form', targetContext: 'chat' | 'canvas', targetBeamName: string, updatedProperties: Partial<BeamInput> }): void {
        this.saveHistorySnapshot();
        
        if (action.targetContext === 'canvas') {
            // Update canvas items
            this.setCanvasItems(prevItems => {
                return prevItems.map(item => {
                    if (item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName) {
                        return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                    }
                    return item;
                });
            });
        } else {
            // Update chat messages - use smart detection to find the item
            const targetItem = this.findBeamInMessages(action.targetBeamName);
            if (targetItem) {
                this.setMessages(prevMessages => {
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
            } else {
                // Smart detection: check canvas first, then update there
                const canvasItem = this.canvasItems.find(item => 
                    item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName
                );
                if (canvasItem) {
                    this.setCanvasItems(prevItems => {
                        return prevItems.map(item => {
                            if (item.type === 'beam_input' && (item as any).data?.Name === action.targetBeamName) {
                                return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                            }
                            return item;
                        });
                    });
                }
            }
        }
    }

    /**
     * Handles update_element_form action with context-aware updates
     */
    private handleUpdateElementFormAction(action: { type: 'update_element_form', targetContext: 'chat' | 'canvas', targetElementName: string, updatedProperties: Partial<StructuralElement> }): void {
        this.saveHistorySnapshot();
        
        if (action.targetContext === 'canvas') {
            // Update canvas items
            this.setCanvasItems(prevItems => {
                return prevItems.map(item => {
                    if (item.type === 'element' && (item as any).data?.name === action.targetElementName) {
                        return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                    }
                    return item;
                });
            });
        } else {
            // Update chat messages - use smart detection to find the item
            const targetItem = this.findElementInMessages(action.targetElementName);
            if (targetItem) {
                this.setMessages(prevMessages => {
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
            } else {
                // Smart detection: check canvas first, then update there
                const canvasItem = this.canvasItems.find(item => 
                    item.type === 'element' && (item as any).data?.name === action.targetElementName
                );
                if (canvasItem) {
                    this.setCanvasItems(prevItems => {
                        return prevItems.map(item => {
                            if (item.type === 'element' && (item as any).data?.name === action.targetElementName) {
                                return { ...item, data: { ...(item as any).data, ...action.updatedProperties } };
                            }
                            return item;
                        });
                    });
                }
            }
        }
    }

    /**
     * Handles download_analysis action
     */
    private handleDownloadAnalysisAction(action: { type: 'download_analysis', targetContext?: 'chat' | 'canvas', targetBeamNames: string[] | 'all', format: 'pdf' | 'csv' }): void {
        // TODO: Implement download logic
        console.log('Download analysis action received:', action);
        // This would integrate with the existing download callback system
    }

    /**
     * Handles add_load_transfer action
     */
    private handleAddLoadTransferAction(action: { type: 'add_load_transfer', sourceElementName: string, supportIndex: number, targetElementName: string, targetPosition: number, targetContext: 'chat' | 'canvas' }): void {
        // Find source and target elements in the current messages
        const { sourceElementName, supportIndex, targetElementName, targetPosition, targetContext } = action;
        
        this.setMessages(prev => prev.map(msg => {
            if (msg.type === 'element_form' && msg.elementData) {
                const updatedElementData = msg.elementData.map(element => {
                    // Find target element to add load to
                    if (element.name === targetElementName && element.projectId) {
                        // Find source element to get reaction from
                        const sourceElement = this.findElementByName(sourceElementName, prev);
                        if (sourceElement && sourceElement.projectId === element.projectId) {
                            try {
                                // Use projectTransferRegistry to create the transfer load
                                const transferLoad = projectTransferRegistry.createPointLoadFromReaction(
                                    sourceElement,
                                    supportIndex,
                                    element,
                                    () => targetPosition
                                );
                                
                                // Add the transfer load to the target element
                                return {
                                    ...element,
                                    appliedLoads: [...element.appliedLoads, transferLoad]
                                };
                            } catch (error) {
                                console.error('Failed to create load transfer:', error);
                                // Add an error message by updating messages state
                                setTimeout(() => {
                                    this.setMessages(prevMessages => [
                                        ...prevMessages,
                                        {
                                            id: Date.now().toString(),
                                            sender: 'ai',
                                            text: `Failed to transfer load: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                            timestamp: new Date(),
                                            type: 'text'
                                        }
                                    ]);
                                }, 0);
                            }
                        }
                    }
                    return element;
                });
                
                return { ...msg, elementData: updatedElementData };
            }
            return msg;
        }));
    }

    /**
     * Handles remove_load_transfer action
     */
    private handleRemoveLoadTransferAction(action: { type: 'remove_load_transfer', targetElementName: string, transferGroupId: string, targetContext: 'chat' | 'canvas' }): void {
        const { targetElementName, transferGroupId } = action;
        
        this.setMessages(prev => prev.map(msg => {
            if (msg.type === 'element_form' && msg.elementData) {
                const updatedElementData = msg.elementData.map(element => {
                    if (element.name === targetElementName) {
                        // Remove the transfer load with matching transferGroupId
                        return {
                            ...element,
                            appliedLoads: element.appliedLoads.filter(load => {
                                const transfer = (load as any).transfer;
                                return !transfer || transfer.transferGroupId !== transferGroupId;
                            })
                        };
                    }
                    return element;
                });
                
                return { ...msg, elementData: updatedElementData };
            }
            return msg;
        }));
    }

    /**
     * Helper method to find an element by name across all messages
     */
    private findElementByName(elementName: string, messages: ChatMessage[]): any | null {
        for (const msg of messages) {
            if (msg.type === 'element_form' && msg.elementData) {
                const element = msg.elementData.find(el => el.name === elementName);
                if (element) return element;
            }
        }
        return null;
    }

    /**
     * Helper method to find a beam by name in current messages
     */
    private findBeamInMessages(beamName: string): BeamInput | null {
        for (const msg of this.messages) {
            if (msg.type === 'beam_input_form' && msg.beamInputsData) {
                const beam = msg.beamInputsData.find(b => b.Name === beamName);
                if (beam) return beam;
            }
        }
        return null;
    }

    /**
     * Helper method to find an element by name in current messages
     */
    private findElementInMessages(elementName: string): StructuralElement | null {
        for (const msg of this.messages) {
            if (msg.type === 'element_form' && msg.elementData) {
                const element = msg.elementData.find(el => el.name === elementName);
                if (element) return element;
            }
        }
        return null;
    }
}
