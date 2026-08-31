// services/geminiService.ts
// AI calls are routed through the backend orchestrator (/api/orchestration) so
// the Gemini API key stays SERVER-SIDE. The browser never holds or sends a key.
//
// SECURITY NOTE: this file previously created a GoogleGenAI client in the
// browser using `process.env.VITE_GOOGLE_API_KEY`, which baked the key into the
// client bundle where anyone could read and abuse it. That path has been
// removed. The same multi-step orchestration now runs on the server.
//
// The exported signature is unchanged, so callers (App.tsx) need no edits.

import { GeminiDecisionResponse, FilePayload } from '../customTypes/types';
import { getAiDecision as getAiDecisionFromServer } from './orchestratorService';

/**
 * Main entry point for AI decision-making.
 *
 * Delegates to the backend orchestrator. The UI `context` is folded into the
 * user message (preserving prior behaviour) and the chat history `parts` are
 * flattened from `{ text }[]` to `string[]` to match the backend DTO.
 */
export async function getAiDecision(
    userMessage: string,
    chatHistory: { role: string; parts: { text: string }[] }[],
    filePayload: FilePayload | undefined,
    context: 'chat' | 'canvas' | 'attachm.'
): Promise<GeminiDecisionResponse> {

    // Preserve the previous behaviour of passing the UI context to the model.
    const userMessageWithContext = userMessage && userMessage.trim()
        ? `${userMessage}\n\n---\n(System context: '${context}')`
        : userMessage;

    // Flatten parts: { text: string }[]  ->  string[]  (backend DTO shape).
    const flatHistory = (chatHistory || []).map(m => ({
        role: m.role,
        parts: (m.parts || []).map(p => p.text),
    }));

    const decision = await getAiDecisionFromServer(
        userMessageWithContext,
        flatHistory,
        filePayload ?? null,
    );

    // Preserve legacy convenience: re-attach the uploaded file to a pending
    // confirm-attachment action if the server didn't echo it back.
    if (filePayload && Array.isArray(decision.actions)) {
        decision.actions = decision.actions.map((action: any) =>
            action && action.type === 'confirm_attachment_analysis' && !action.userFile
                ? { ...action, userFile: filePayload }
                : action
        );
    }

    return decision;
}
