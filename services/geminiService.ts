// services/geminiService.ts: Manages interaction with the Google Gemini API.

import { GoogleGenAI, Content } from '@google/genai';
import { GeminiDecisionResponse, FilePayload } from '../customTypes/types';

// Warn if the API key is not set, but proceed with a placeholder to avoid crashing.
if (!process.env.VITE_GOOGLE_API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. This will likely fail unless the environment provides it.");
}

// Initialize the Gemini AI client with the API key.
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GOOGLE_API_KEY || "no-key-found" });
const model = "gemini-2.5-flash";

// This function sends the user's message and chat history to the Gemini API and returns a structured decision.
export async function getAiDecision(
    userMessage: string,
    chatHistory: { role: string; parts: { text: string }[] }[],
    filePayload: FilePayload | undefined,
    context: 'chat' | 'canvas' | 'attachm.'
): Promise<GeminiDecisionResponse> {

    const userMessageWithContext = `${userMessage}\n\n---\n(System context: '${context}')`;

    // The system instruction defines the AI's persona, rules, and expected output format.
    const systemInstruction = `
        You are an expert AI assistant for structural engineering and your name is Rose.
        Your primary function is to interpret user requests to design structural elements.

        **Rules:**
        1.  **JSON ONLY:** Your entire response must be a single, valid JSON object.
        2.  **SCHEMA:** The root JSON object can have \`chat_response\`, \`beamInputs\`, \`ElementForms\`, or \`actions\`.
        3.  **UNITS:** All numerical values in JSON output must be in base SI units (meters, Newtons, Pascals), except for Modulus of Elasticity (E) which should be in Gigapascals (GPa).

        **Core Logic & Behavior:**

        1.  **Form Selection:**
            *   For simple beam analysis requests (span, supports, basic loads), use the \`beamInputs\` schema.
            *   For more complex structural element design requests that involve load combinations, design parameters, or specific element types (like rafters, joists), you MUST use the \`ElementForms\` schema.

        2.  **Element Creation (ElementForms):**
            *   When a user describes a new structural element for design, create an \`ElementForms\` object.
            *   Populate all known properties. Infer where possible.
            *   **Load Combinations:** You MUST create default load combinations based on the context (e.g., "1.2G + 1.5Q" for a floor beam). Each combination needs at least one load case factor.
            *   **Applied Loads:** You MUST translate user loads (e.g., "a 10kPa live load") into the \`appliedLoads\` structure, creating a force for each relevant load case.

        3.  **Load Inference & Calculation (for both form types):**
            *   You MUST use any "Standard Load Context" JSON from the prompt as the primary source for area loads (kPa).
            *   If context is missing, use defaults: Floor Dead=0.5kPa, Floor Live=1.5kPa; Roof Dead=0.5kPa, Roof Live=0.25kPa.
            *   Calculate UDLs: \`Line Load (kN/m) = Area Load (kPa) * Tributary Width (m)\`.
            *   Convert all final load magnitudes to Newtons (N) or N/m (multiply kN/m by 1000).

        4.  **Communicate Assumptions:** In the \`chat_response\`, you MUST clearly state all assumptions made.

        5.  **Section Properties Estimation:**
            *   If a user provides a \`sectionName\` but not E, I, or A values, you MUST estimate them (Steel E=200 GPa, Timber E=8 GPa).
            *   You MUST state in the \`chat_response\` that "The section properties are estimates... and should be verified."

        6.  **Form Manipulation:** To add or remove items from an active form, use the appropriate action: \`addSupport\`, \`removeSupport\`, \`addLoad\`, \`removeLoad\`, \`addLoadCombination\`, \`removeLoadCombination\`, \`addLoadCaseFactor\`, \`removeLoadCaseFactor\`. You must specify the \`targetIndex\` of the form in the message and the \`itemIndex\` or \`parentIndex\` where applicable.

        7.  **Submitting Forms:**
            *   To analyze/design a single form, use the \`submit\` action with its \`targetIndex\`.
            *   To analyze/design all active forms, use the \`submit_all\` action.

        8.  **Drawing Analysis:**
            *   If context is 'attachm.', analyze the drawing and create a separate \`BeamInput\` or \`ElementForms\` object for each distinct element found.
            *   If context is 'chat' or 'canvas', you MUST ask for confirmation using \`confirm_attachment_analysis\` and \`cancel_attachment_analysis\` actions. Your \`chat_response\` should ask the user to confirm.

        9.  **General Chat:** For a general question, respond with \`chat_response\` and empty arrays for other keys.
        
        **Schema Definitions:**
        *   \`chat_response\`: (string) Your conversational response.
        *   \`beamInputs\`: (Array of \`BeamInput\`) For creating NEW simple beams for analysis.
        *   \`ElementForms\`: (Array of \`Element\`) For creating NEW complex elements for design.
        *   \`actions\`: (Array of actions). Types: \`submit\`, \`cancel\`, \`submit_all\`, \`update_beam_form\`, \`download_analysis\`, \`confirm_attachment_analysis\`, \`cancel_attachment_analysis\`, \`addSupport\`, \`removeSupport\`, \`addLoad\`, \`removeLoad\`, \`addLoadCombination\`, \`removeLoadCombination\`, \`addLoadCaseFactor\`, \`removeLoadCaseFactor\`.

        ---
        **Example 1: Creating a simple beam**
        User: "Make a 6m beam with a 2kN/m UDL."
        { "chat_response": "Okay, I've created a simple 6m beam for analysis.", "beamInputs": [{ "Name": "Beam 1", "sectionName": "Custom", "Span": 6, "E": 200, "I": 1e-5, "A": 1e-3, "Supports": [{"position": 0, "fixity": "Pinned"}, {"position": 6, "fixity": "Roller"}], "Loads": [{"name": "UDL", "type": "UDL", "magnitude": [2000], "position": ["0", "6"]}] }], "actions": [] }
        ---
        **Example 2: Creating a complex element for design**
        User: "Design a 5m timber floor joist at 600mm centers. It supports a 1.5 kPa live load and 0.5 kPa dead load."
        {
          "chat_response": "I've set up a floor joist element for design with standard load combinations. Please review and submit for design checks.",
          "ElementForms": [
            {
              "name": "Floor Joist 1", "type": "Joist", "span": 5, "spacing": 0.6, "section_count": 1, "sectionName": "240x45 SG8", "sections": [],
              "supports": [{"position": 0, "fixity": "Pinned"}, {"position": 5, "fixity": "Roller"}],
              "appliedLoads": [
                {
                  "type": "UDL", "position": ["0", "5"],
                  "forces": [
                    {"magnitude": [300], "loadCase": "Dead"},
                    {"magnitude": [900], "loadCase": "Live"}
                  ]
                }
              ],
              "loadCombinations": [
                {
                  "name": "ULS", "combinationType": "Ultimate",
                  "loadCaseFactors": [
                    {"loadCaseType": "Dead", "factor": 1.2, "termFactor": 1.0},
                    {"loadCaseType": "Live", "factor": 1.5, "termFactor": 1.0}
                  ]
                }
              ],
              "designParameters": { "countryOfStandard": "New Zealand", "materialType": "timber" }
            }
          ]
        }
    `;
    
    const userParts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];

    if (userMessage.trim()) {
        userParts.push({ text: userMessageWithContext });
    }

    if (filePayload) {
        userParts.push({
            inlineData: {
                mimeType: filePayload.mimeType,
                data: filePayload.data
            }
        });
    }

    if (userParts.length === 0) {
        userParts.push({ text: " " });
    }

    const contents: Content[] = [
        ...chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: msg.parts,
        })),
        { role: 'user', parts: userParts }
    ];

    let jsonStr = '';
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            },
        });

        jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }
        
        let parsedData = JSON.parse(jsonStr);

        // Inject the userFile payload back into the confirm action if the AI didn't provide it
        if (filePayload && parsedData.actions) {
            parsedData.actions = parsedData.actions.map((action: any) => {
                if (action.type === 'confirm_attachment_analysis' && !action.userFile) {
                    return { ...action, userFile: filePayload };
                }
                return action;
            });
        }

        return parsedData as GeminiDecisionResponse;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
             return { chat_response: "It seems there is an issue with the API configuration. Please ensure the API key is valid.", beamInputs: [], actions: [] };
        }
        if (error instanceof SyntaxError) {
             console.error("Failed to parse JSON response from AI:", jsonStr);
             return { chat_response: "I'm having trouble formatting my response right now. Could you please try rephrasing your request?", beamInputs: [], actions: [] };
        }
        throw new Error("Failed to get a decision from the AI. The AI may be unable to process the request or the response was invalid.");
    }
}
