// services/geminiService.ts: Manages interaction with the Google Gemini API via Firebase Functions.

import { getFunctions, httpsCallable } from 'firebase/functions';
import { GeminiDecisionResponse, FilePayload } from '../customTypes/types';

// This function sends the user's message and chat history to the Gemini API via Firebase Functions
export async function getAiDecision(
    userMessage: string,
    chatHistory: { role: string; parts: { text: string }[] }[],
    filePayload: FilePayload | undefined,
    context: 'chat' | 'canvas' | 'attachm.'
): Promise<GeminiDecisionResponse> {
    try {
        // Get Firebase Functions instance
        const functions = getFunctions();
        
        // Get the callable function
        const getAiDecisionFunc = httpsCallable(functions, 'getAiDecision');
        
        // Call the function with the parameters
        const result = await getAiDecisionFunc({
            userMessage,
            chatHistory,
            filePayload,
            requestContext: context
        });
        
        return result.data as GeminiDecisionResponse;
        
    } catch (error) {
        console.error("Error calling AI service:", error);
        
        if (error instanceof Error) {
            if (error.message.includes('unauthenticated')) {
                return { 
                    chat_response: "Please sign in to use the AI assistant.", 
                    beamInputs: [], 
                    actions: [] 
                };
            }
            
            if (error.message.includes('API key not configured') || error.message.includes('API configuration issue')) {
                return { 
                    chat_response: "It seems there is an issue with the API configuration. Please ensure the API key is valid.", 
                    beamInputs: [], 
                    actions: [] 
                };
            }
        }
        
        return { 
            chat_response: "I'm having trouble processing your request right now. Please try again later.", 
            beamInputs: [], 
            actions: [] 
        };
    }
}
