import { Action, ChatMessage } from '../customTypes/types';
import { BeamInput, Element as StructuralElement, SupportFixityType, LoadType, LoadCaseType } from '../customTypes/structuralElement';

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
                        // Add cases for other element form manipulations (addLoad, addLoadCombination, etc.)
                    }
                    updatedElementData[action.targetIndex] = element;
                } else if (msg.type === 'beam_input_form' && updatedBeamData) {
                    let beam = { ...updatedBeamData[action.targetIndex] };
                     switch (action.type) {
                        case 'addSupport':
                            beam.Supports = [...beam.Supports, { position: beam.Span, fixity: SupportFixityType.Roller }];
                            break;
                        case 'removeSupport':
                            if (typeof action.itemIndex === 'number') beam.Supports = beam.Supports.filter((_, i) => i !== action.itemIndex);
                            break;
                        case 'addLoad':
                             beam.Loads = [...beam.Loads, { name: "New Load", type: LoadType.PointLoad, magnitude: [1000], position: [String(beam.Span/2)] }];
                             break;
                        case 'removeLoad':
                            if (typeof action.itemIndex === 'number') beam.Loads = beam.Loads.filter((_, i) => i !== action.itemIndex);
                            break;
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
}
