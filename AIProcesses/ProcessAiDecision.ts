import { GeminiDecisionResponse, ChatMessage, Action } from '../customTypes/types';
import { Element, BeamInput } from '../customTypes/structuralElement';

/**
 * ProcessAiDecision class handles the processing of AI decision responses
 * and converts them into appropriate chat messages and actions.
 */
export class ProcessAiDecision {
    private addMessage: (message: Omit<ChatMessage, 'id'>) => ChatMessage;
    private processAiActions: (actions: Action[]) => void;
    private availableSections: any[];

    constructor(
        addMessage: (message: Omit<ChatMessage, 'id'>) => ChatMessage,
        processAiActions: (actions: Action[]) => void,
        availableSections: any[] = []
    ) {
        this.addMessage = addMessage;
        this.processAiActions = processAiActions;
        this.availableSections = availableSections;
    }

    /**
     * Updates the available sections for section resolution
     * @param sections - Updated sections array
     */
    public updateAvailableSections(sections: any[]): void {
        this.availableSections = sections;
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
     * Creates an element form message with section resolution and description validation
     * @param elements - Array of element data
     * @param text - Optional custom text message
     */
    public createElementFormMessage(elements: Element[], text?: string): void {
        // Enhance elements with section resolution and description validation
        const enhancedElements = elements.map(element => this.enhanceElement(element));

        this.addMessage({
            sender: 'ai',
            text: text || 'I have prepared the following structural element(s) for your review:',
            type: 'element_form',
            isFormActive: enhancedElements.map(() => true),
            elementData: enhancedElements,
        });
    }

    /**
     * Enhances an element with section resolution and description validation
     * @param element - The element to enhance
     * @returns Enhanced element with resolved sections and descriptions
     */
    private enhanceElement(element: Element): Element {
        const enhanced = { ...element };

        // Resolve section properties if sectionName exists but sections array is empty
        if (enhanced.sectionName && (!enhanced.sections || enhanced.sections.length === 0)) {
            const foundSection = this.availableSections.find(s => 
                s.name.toLowerCase() === enhanced.sectionName.toLowerCase()
            );
            if (foundSection) {
                console.log(`AI Processing: Resolved section ${enhanced.sectionName}`);
                enhanced.sections = [foundSection];
            } else {
                // Provide fallback section properties for common sections
                const fallbackSection = this.getFallbackSectionProperties(enhanced.sectionName);
                if (fallbackSection) {
                    console.log(`AI Processing: Using fallback properties for ${enhanced.sectionName}`);
                    enhanced.sections = [fallbackSection];
                }
            }
        }

        // Ensure all applied loads have descriptions
        if (enhanced.appliedLoads) {
            enhanced.appliedLoads = enhanced.appliedLoads.map((load, index) => {
                if (!load.description || load.description.trim() === '') {
                    load.description = this.generateLoadDescription(enhanced, load, index);
                    console.log(`AI Processing: Generated description "${load.description}" for load ${index}`);
                }
                return load;
            });
        }

        return enhanced;
    }

    /**
     * Generates a smart description for a load based on element context
     */
    private generateLoadDescription(element: Element, load: any, index: number): string {
        const elementType = element.type?.toLowerCase() || '';
        const loadCases = load.forces?.map((f: any) => f.loadCase).join(' + ') || 'Load';
        const typeStr = load.type === 'PointLoad' ? 'Point Load' : 
                      load.type === 'UDL' ? 'UDL' : 
                      load.type === 'TrapezoidalLoad' ? 'Trapezoidal Load' : 'Load';
        
        if (elementType.includes('floor') || elementType.includes('joist')) {
            return `Floor ${loadCases} ${typeStr}`;
        } else if (elementType.includes('roof') || elementType.includes('rafter')) {
            return `Roof ${loadCases} ${typeStr}`;
        } else if (elementType.includes('beam')) {
            return `Beam ${loadCases} ${typeStr}`;
        } else {
            return `${loadCases} ${typeStr}`;
        }
    }

    /**
     * Provides fallback section properties for common sections
     */
    private getFallbackSectionProperties(sectionName: string): any | null {
        const name = sectionName.toLowerCase();
        
        // Common timber sections
        if (name.includes('240x45') || name === '240x45 sg8') {
            return {
                name: sectionName,
                E: 8000000000, // 8 GPa in Pa
                I: 0.000010368, // m⁴
                A: 0.0108, // m²
                material: 'timber'
            };
        } else if (name.includes('190x45') || name === '190x45 sg8') {
            return {
                name: sectionName,
                E: 8000000000,
                I: 0.00000598,
                A: 0.00855,
                material: 'timber'
            };
        }
        // Common steel sections
        else if (name.includes('310ub') || name === '310ub40.4') {
            return {
                name: sectionName,
                E: 200000000000, // 200 GPa in Pa
                I: 0.0000813, // m⁴
                A: 0.00514, // m²
                material: 'steel'
            };
        } else if (name.includes('250ub') || name === '250ub31.4') {
            return {
                name: sectionName,
                E: 200000000000,
                I: 0.0000431,
                A: 0.004,
                material: 'steel'
            };
        }
        
        return null; // No fallback available
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
