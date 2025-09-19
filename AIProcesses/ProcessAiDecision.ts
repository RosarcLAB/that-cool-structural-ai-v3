import { GeminiDecisionResponse, ChatMessage, Action } from '../customTypes/types';
import { Element, BeamInput } from '../customTypes/structuralElement';

/**
 * ProcessAiDecision class handles the processing of AI decision responses
 * and converts them into appropriate chat messages and actions.
 */
export class ProcessAiDecision {
    private addMessage: (message: Omit<ChatMessage, 'id'>) => ChatMessage;
    private processAiActions: (actions: Action[]) => void;

    constructor(
        addMessage: (message: Omit<ChatMessage, 'id'>) => ChatMessage,
        processAiActions: (actions: Action[]) => void
    ) {
        this.addMessage = addMessage;
        this.processAiActions = processAiActions;
    }

    /**
     * Processes the AI decision and creates appropriate chat messages and actions
     * @param decision - The AI's decision object containing chat response and forms
     */
    public processDecision(decision: GeminiDecisionResponse): void {
        let formCreated = false;

        // Handle Element forms with priority
        if (decision.ElementForms && decision.ElementForms.length > 0) {
            this.createElementFormMessage(decision.ElementForms, decision.chat_response);
            formCreated = true;
        }
        
        // Handle BeamInput forms
        else if (decision.beamInputs && decision.beamInputs.length > 0) {
            this.createBeamInputFormMessage(decision.beamInputs, decision.chat_response);
            formCreated = true;
        }
        
        // Handle standalone chat response only if it has content
        if (!formCreated && decision.chat_response && decision.chat_response.trim()) {
            this.createTextMessage(decision.chat_response);
        }

        // Process any immediate actions
        if (decision.actions && decision.actions.length > 0) {
            this.processAiActions(decision.actions);
        }
    }

    /**
     * Creates a beam input form message
     * @param beamInputs - Array of beam input data
     * @param text - Optional custom text message
     */
    public createBeamInputFormMessage(beamInputs: BeamInput[], text?: string): void {
        this.addMessage({
            sender: 'ai',
            text: text || 'I have prepared the following beam(s) for your review:',
            type: 'beam_input_form',
            isFormActive: beamInputs.map(() => true),
            beamInputsData: beamInputs,
        });
    }

    /**
     * Creates an element form message
     * @param elements - Array of element data
     * @param text - Optional custom text message
     */
    public createElementFormMessage(elements: Element[], text?: string): void {
        this.addMessage({
            sender: 'ai',
            text: text || 'I have prepared the following structural element(s) for your review:',
            type: 'element_form',
            isFormActive: elements.map(() => true),
            elementData: elements,
        });
    }

    /**
     * Creates a text message
     * @param text - The text message
     */
    public createTextMessage(text: string): void {
        this.addMessage({
            sender: 'ai',
            text: text,
            type: 'text',
        });
    }
}
