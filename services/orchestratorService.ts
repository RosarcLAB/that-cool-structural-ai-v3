
import { GeminiDecisionResponse, FilePayload } from '../customTypes/types';

/**
 * Data transfer object for sending prompt messages to the AI orchestration service.
 * 
 * @interface promptMessageDTO
 * @property {string} user_message - The current message from the user to be processed by the AI
 * @property {Array<{role: string; parts: string[]}>} chat_history - The conversation history containing previous messages with roles and content parts
 * @property {FilePayload} [file_payload] - Optional file data to be included with the prompt for AI analysis
 */
export interface promptMessageDTO {
    user_message: string;
    chat_history: { role: string; parts: string[] }[];
    file_payload?: FilePayload | null;
}  

/**
 * The getAiDecision function sends a user's message and chat history to the AI service
 * @param userMessage - The user's message to the AI.
 * @param chatHistory - The history of the chat conversation.
 * @param filePayload - Optional file payload to be sent to the AI.
 * @returns [GeminiDecisionResponse] response from the AI service containing the chat response, beam inputs, and actions.
 */
export async function getAiDecision
( userMessage: string, 
  chatHistory: { role: string; parts: string[] }[], 
  filePayload?: FilePayload | null ): Promise<GeminiDecisionResponse> {  
  
  const payload : promptMessageDTO = {
    user_message: userMessage,
    chat_history: chatHistory,
    file_payload: filePayload ?? null
  }

  console.log(payload);

  const response = await fetch('http://localhost:8000/api/orchestration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Get more detailed error information
    const errorText = await response.text();
    console.error('API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: response.url
    });
    throw new Error(`API Error ${response.status}: ${errorText.substring(0, 200)}...`);
  }
   
  const decision = await response.json() as GeminiDecisionResponse;

  // Initialize arrays if not present and validate structure
  decision.beamInputs = decision.beamInputs || [];
  decision.ElementForms = decision.ElementForms || [];
  
  // Safety check for malformed responses
  if (typeof decision.chat_response !== 'string') {
    console.warn('Invalid response structure: chat_response is not a string');
    decision.chat_response = 'Invalid response received from server';
  }

  console.log("--- AI Decision Received ---");
  console.log("Chat Response:", decision.chat_response);

  if (decision.beamInputs && decision.beamInputs.length > 0) {
    console.log("Beam Inputs:", decision.beamInputs);
  } else {
    console.log("Beam Inputs: None");
  }
  
  if (decision.ElementForms && decision.ElementForms.length > 0) {
    console.log("Element Forms:", decision.ElementForms);
  } else {
    console.log("Element Forms: None");
  }

  if (decision.actions && decision.actions.length > 0) {
    console.log("Actions:", decision.actions);
  } else {
    console.log("Actions: None");
  }
  console.log("--------------------------");

  return decision;
}

