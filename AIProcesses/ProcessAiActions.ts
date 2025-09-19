import { Action, ChatMessage, PropertyUpdate } from '../customTypes/types';
import { BeamInput, Element as StructuralElement, SupportFixityType, LoadType, LoadCaseType } from '../customTypes/structuralElement';
import { projectTransferRegistry } from '../services/projectTransferRegistry';

/**
 * ProcessAiActions class handles the processing of AI-requested actions
 * such as submit, cancel, submit_all, and form manipulation operations.
 */
export class ProcessAiActions {
    private messages: ChatMessage[] = [];
    private setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void = () => {};
    private handleBeamInputFormSubmit: (data: BeamInput, msgId: string, formIndex: number) => Promise<void>;
    private handleBeamInputFormCancel: (msgId: string, formIndex: number) => void;
    private handleElementFormSubmit: (data: StructuralElement, msgId: string, formIndex: number) => Promise<void>;
    private handleElementFormCancel: (msgId: string, formIndex: number) => void;

    constructor(
        messages: ChatMessage[],
        setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void,
        handleBeamInputFormSubmit: (data: BeamInput, msgId: string, formIndex: number) => Promise<void>,
        handleBeamInputFormCancel: (msgId: string, formIndex: number) => void,
        handleElementFormSubmit: (data: StructuralElement, msgId: string, formIndex: number) => Promise<void>,
        handleElementFormCancel: (msgId: string, formIndex: number) => void
    ) {
        this.updateDependencies(messages, setMessages);
        this.handleBeamInputFormSubmit = handleBeamInputFormSubmit;
        this.handleBeamInputFormCancel = handleBeamInputFormCancel;
        this.handleElementFormSubmit = handleElementFormSubmit;
        this.handleElementFormCancel = handleElementFormCancel;
    }
    
    public updateDependencies(
        messages: ChatMessage[],
        setMessages: (callback: (prevMessages: ChatMessage[]) => ChatMessage[]) => void
    ) {
        this.messages = messages;
        this.setMessages = setMessages;
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
        if ('targetIndex' in action && typeof action.targetIndex === 'number') {
            const formMessage = lastElementFormMessage || lastBeamFormMessage;
            if (!formMessage) return;

            this.setMessages(prev => prev.map(msg => {
                if (msg.id !== formMessage.id) return msg;

                let updatedElementData = msg.elementData ? [...msg.elementData] : undefined;
                let updatedBeamData = msg.beamInputsData ? [...msg.beamInputsData] : undefined;

                if (msg.type === 'element_form' && updatedElementData) {
                    let element = { ...updatedElementData[action.targetIndex] };
                    switch (action.type) {
                        case 'addSupport':
                            element.supports = [...element.supports, { position: element.span, fixity: SupportFixityType.Roller }];
                            break;
                        case 'removeSupport':
                            if (typeof action.itemIndex === 'number') element.supports = element.supports.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'editSupport':
                            if (typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const updates = action.updatedProperties as PropertyUpdate<typeof element.supports[0]>[];
                                element.supports = element.supports.map((s, i) => {
                                    if (i !== action.itemIndex) return s;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), s);
                                });
                            }
                            break;
                        case 'addAppliedLoad':
                            if (action.updatedProperties) {
                                const loadsToAdd = Array.isArray(action.updatedProperties) ? action.updatedProperties : [action.updatedProperties];
                                element.appliedLoads = [...element.appliedLoads, ...(loadsToAdd as any[])];
                            }
                            break;
                        case 'removeAppliedLoad':
                            if (typeof action.itemIndex === 'number') element.appliedLoads = element.appliedLoads.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'editAppliedLoad': {
                            if (typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const updates = action.updatedProperties as PropertyUpdate<typeof element.appliedLoads[0]>[];
                                element.appliedLoads = element.appliedLoads.map((l, i) => {
                                    if (i !== action.itemIndex) return l;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), l);
                                });
                            }
                            break;
                        }
                        case 'addLoadCombination':
                            if (action.updatedProperties) {
                                const combosToAdd = Array.isArray(action.updatedProperties) ? action.updatedProperties : [action.updatedProperties];
                                element.loadCombinations = [...element.loadCombinations, ...(combosToAdd as any[])];
                            }
                            break;
                        case 'removeLoadCombination':
                            if (typeof action.itemIndex === 'number') element.loadCombinations = element.loadCombinations.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'editLoadCombination': {
                            if (typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const updates = action.updatedProperties as PropertyUpdate<typeof element.loadCombinations[0]>[];
                                element.loadCombinations = element.loadCombinations.map((c, i) => {
                                    if (i !== action.itemIndex) return c;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), c);
                                });
                            }
                            break;
                        }
                        case 'addLoadCaseFactor':
                            if (action.parentIndex != null && action.updatedProperties) {
                                const combo = element.loadCombinations[action.parentIndex];
                                const factorsToAdd = Array.isArray(action.updatedProperties) ? action.updatedProperties : [action.updatedProperties];
                                combo.loadCaseFactors = [...combo.loadCaseFactors, ...(factorsToAdd as any[])];
                            }
                            break;
                        case 'removeLoadCaseFactor':
                            if (typeof action.parentIndex === 'number' && typeof action.itemIndex === 'number') {
                                const combo = element.loadCombinations[action.parentIndex];
                                combo.loadCaseFactors = combo.loadCaseFactors.filter((_, i) => i !== action.itemIndex);
                            }
                            break;
                        case 'editLoadCaseFactor': {
                            if (typeof action.parentIndex === 'number' && typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const combo = element.loadCombinations[action.parentIndex];
                                const updates = action.updatedProperties as PropertyUpdate<typeof combo.loadCaseFactors[0]>[];
                                combo.loadCaseFactors = combo.loadCaseFactors.map((f, i) => {
                                    if (i !== action.itemIndex) return f;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), f);
                                });
                            }
                            break;
                        }
                    }
                    updatedElementData[action.targetIndex] = element;
                
                } else if (msg.type === 'beam_input_form' && updatedBeamData) {
                    let beam = { ...updatedBeamData[action.targetIndex] };
                     switch (action.type) {
                        case 'addSupport':
                            beam.Supports = [...beam.Supports, { position: beam.Span/2, fixity: SupportFixityType.Roller }];
                            break;
                        case 'removeSupport':
                            if (typeof action.itemIndex === 'number') beam.Supports = beam.Supports.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'editSupport':
                            if (typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const updates = action.updatedProperties as PropertyUpdate<typeof beam.Supports[0]>[];
                                beam.Supports = beam.Supports.map((s, i) => {
                                    if (i !== action.itemIndex) return s;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), s);
                                });
                            }
                            break;
                        case 'addLoad':
                            if (action.updatedProperties) {
                                const loadsToAdd = Array.isArray(action.updatedProperties) ? action.updatedProperties : [action.updatedProperties];
                                beam.Loads = [...beam.Loads, ...(loadsToAdd as any[])];
                            } else {
                                beam.Loads = [...beam.Loads, { name: "New Load", type: LoadType.PointLoad, magnitude: [1000], position: [String(beam.Span/2)] }];
                            }
                            break;
                        case 'removeLoad':
                            if (typeof action.itemIndex === 'number') beam.Loads = beam.Loads.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'editLoad': {
                            if (typeof action.itemIndex === 'number' && action.updatedProperties) {
                                const updates = action.updatedProperties as PropertyUpdate<typeof beam.Loads[0]>[];
                                beam.Loads = beam.Loads.map((l, i) => {
                                    if (i !== action.itemIndex) return l;
                                    return updates.reduce((acc, { property, value }) => ({ ...acc, [property]: value }), l);
                                });
                            }
                            break;
                        }
                    }
                    updatedBeamData[action.targetIndex] = beam;
                }    
                return { ...msg, elementData: updatedElementData, beamInputsData: updatedBeamData };
            }));
        }
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
}
