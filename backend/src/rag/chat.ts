/**
 * PET AI Chat Endpoint with SSE Streaming
 * Main entry point for the PET AI Medical Assistant
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  retrieveRelevantRecords,
  buildContext
} from './retrieval.js';
import {
  validateQuery,
  validateResponse,
  getMedicalDisclaimer,
  getTopicGuidance,
  type AllowedTopic
} from './guardrails.js';
import {
  saveMessage,
  getHistory,
  formatHistoryForContext,
  initializeHistoryTable
} from './history.js';
import { getValidAstronautSession } from '../server.js';
import { getDb } from '../db/connection.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HealthRecord } from '../db/schema.js';

// NVIDIA NIM API configuration
const NVIDIA_NIM_API_URL = process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

interface ChatRequest {
  message: string;
  astronautId?: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface SSEEvent {
  event: 'sources' | 'token' | 'done' | 'error';
  data: any;
}

/**
 * Send SSE event
 */
function sendSSE(response: ServerResponse, event: SSEEvent): void {
  const data = JSON.stringify(event.data);
  response.write(`event: ${event.event}\n`);
  response.write(`data: ${data}\n\n`);
}

/**
 * Build system prompt for the model
 */
function buildSystemPrompt(
  astronautProfile: any,
  healthRecordsContext: string,
  topic: AllowedTopic,
  conversationHistory: string = ''
): string {
  const topicGuidance = getTopicGuidance(topic);
  const disclaimer = getMedicalDisclaimer();

  const historySection = conversationHistory
    ? `\n\nCONVERSATION HISTORY:\n${conversationHistory}`
    : '';

  return `You are PET (Physiological Evaluation Tool), an AI medical assistant for spaceflight crew health monitoring.

RULES:
1. ONLY use the provided health record context for medical answers
2. NEVER diagnose, prescribe, or recommend treatments
3. ALWAYS cite specific measurements when discussing health data (metric, value, unit, date)
4. ALWAYS include the medical disclaimer at the end of medical responses
5. If context is insufficient for a medical question, say "I don't have enough data to answer that"
6. Identify warning/critical values per configured reference ranges
7. Suggest follow-up tests only from the predefined mission checklist
8. Remind users that medical decisions require professional review
9. Use **bold** for emphasis, bullet points for lists, and clear formatting for readability
10. **CRITICAL: NEVER mention, reference, or discuss ANY metric that is NOT explicitly present in the HEALTH RECORDS CONTEXT below. This includes abbreviations (BP, Na, K, etc.) and full names. Only discuss metrics that appear in the context with their actual values.**
11. **CRITICAL: If a metric (like sodium, potassium, etc.) does not appear in the context with a specific value, DO NOT MENTION IT AT ALL. Do not say "not measured" or "not available" - simply do not include it in your response.**

CONVERSATIONAL BEHAVIOR:
- You can engage in natural dialogue and ask clarifying questions
- Reference previous messages: "As we discussed earlier..." or "Building on your question about..."
- If user asks non-medical: "That's outside my scope, but I can help with your health data"
- Gently guide conversation toward medical topics you can answer
- Use conversation history to maintain context across turns

${topicGuidance}

ASTRONAUT: ${astronautProfile.name || 'Crew Member'} (${astronautProfile.role || 'Mission Specialist'}, ${astronautProfile.mission || 'Active Mission'})${historySection}

HEALTH RECORDS CONTEXT:
${healthRecordsContext}

MISSION CHECKLIST (for follow-up recommendations):
- Iron panel with ferritin - Checks whether low hemoglobin comes from low iron stores
- Reticulocyte count - Shows how fast bone marrow is making new red cells
- Blood smear review - A lab tech inspects cell shape and platelet clumping
- Repeat blood count in 2 weeks - Confirms whether the changes persist
- Log hydration and sleep for 3 days - Context that helps explain this week's numbers

MEDICAL DISCLAIMER (must include at end of medical responses):
${disclaimer}`;
}

/**
 * Call NVIDIA NIM API for streaming chat completions
 */
async function callNvidiaNimStream(systemPrompt: string, userMessage: string, apiKey: string): Promise<AsyncGenerator<string>> {
  const url = `${NVIDIA_NIM_API_URL}/chat/completions`;

  const requestBody = {
    model: NVIDIA_NIM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: 'Understood. I will follow these rules as PET.' },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.1,
    max_tokens: 1024,
    stream: true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // Return async generator for SSE stream
  return (async function* () {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (OpenAI-compatible format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              // Extract text from choices (OpenAI format)
              if (parsed.choices && parsed.choices.length > 0) {
                const choice = parsed.choices[0];
                if (choice.delta && choice.delta.content) {
                  yield choice.delta.content;
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  })();
}

/**
 * Handle PET AI chat request with SSE streaming
 * Note: Session is already validated by the server, so we receive it as a parameter
 */
export async function handlePetAiChat(
  request: IncomingMessage,
  response: ServerResponse,
  astronautAuthProvider: any,
  session: any, // Validated astronaut session from server
  astronautSessions: Map<string, any> // Session map for history operations
): Promise<void> {
  console.log('>>> PET AI CHAT CALLED <<<');
  console.log('>>> Session:', session);
  // Set SSE headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Parse request body
  let body: ChatRequest;
  try {
    body = await parseJsonBody(request);
  } catch (error) {
    sendSSE(response, {
      event: 'error',
      data: { message: 'Invalid request body' }
    });
    response.end();
    return;
  }

  const { message, sessionId, conversationHistory } = body;

  if (!message || typeof message !== 'string') {
    sendSSE(response, {
      event: 'error',
      data: { message: 'Message is required' }
    });
    response.end();
    return;
  }

  const astronautId = session.astronautId;
  const currentSessionId = sessionId || `session_${Date.now()}`;

  // Get database connection for development mode
  const isProduction = process.env.NODE_ENV === 'production';
  let db: any = null;
  if (!isProduction) {
    try {
      db = await getDb();
      await initializeHistoryTable(db);
    } catch (error) {
      console.error('[pet-ai] Failed to get database:', error);
    }
  }

  try {
    console.log('[pet-ai] Starting chat for astronaut:', astronautId);
    // 1. Validate input query
    const inputValidation = validateQuery(message);
    console.log('[pet-ai] Input validation:', inputValidation);
    if (!inputValidation.allowed) {
      sendSSE(response, {
        event: 'error',
        data: { message: inputValidation.reason }
      });
      response.end();
      return;
    }

    const topic = inputValidation.topic!;
    console.log('[pet-ai] Topic:', topic);

    // 2. Save user message to history
    await saveMessage(astronautId, currentSessionId, 'user', message, db);
    console.log('[pet-ai] Saved user message');

    // 3. Retrieve relevant health records (personal + knowledge base)
    console.log('[pet-ai] Retrieving records...');
    const personalRecords = await retrieveRelevantRecords({
      astronautId,
      query: message,
      k: 10,
      includeBaselines: true,
      db
    });

    // Also retrieve from NASA HRP knowledge base
    const knowledgeRecords = await retrieveRelevantRecords({
      astronautId: 'nasa-hrp-knowledge-base',
      query: message,
      k: 5,
      includeBaselines: false,
      db
    });

    // Merge and sort by similarity
    const records = [...personalRecords, ...knowledgeRecords]
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 10);

    console.log('[pet-ai] Retrieved records:', records.length, '(personal:', personalRecords.length, ', knowledge:', knowledgeRecords.length, ')');

    // 4. Send sources event
    sendSSE(response, {
      event: 'sources',
      data: { sources: records.map(r => ({
        id: r.id,
        type: r.type,
        recordedAt: r.recorded_at,
        similarity: r.similarity
      })) }
    });

    // 5. Get conversation history
    const history = await getHistory({ astronautId, sessionId: currentSessionId, limit: 10 }, db);
    const historyContext = formatHistoryForContext(history);

    // 6. Build context (including mission checklist for validation)
    const healthRecordsContext = buildContext(records);
    const missionChecklist = `MISSION CHECKLIST (for follow-up recommendations):
- Iron panel with ferritin - Checks whether low hemoglobin comes from low iron stores
- Reticulocyte count - Shows how fast bone marrow is making new red cells
- Blood smear review - A lab tech inspects cell shape and platelet clumping
- Repeat blood count in 2 weeks - Confirms whether the changes persist
- Log hydration and sleep for 3 days - Context that helps explain this week's numbers`;
    const fullContext = `${historyContext}\n\n${healthRecordsContext}\n\n${missionChecklist}`.trim();

    // 7. Fetch astronaut profile for context
    const profileResult = await retrieveRelevantRecords({
      astronautId,
      query: 'profile',
      k: 1,
      includeBaselines: false,
      db
    });

    // Get astronaut profile from the first record's astronaut data
    // In practice, we'd fetch this from the astronaut table directly
    const astronautProfile = {
      id: astronautId,
      name: 'Astronaut', // Would be fetched from astronaut table
      role: 'Crew Member',
      mission: 'Active Mission'
    };

    // 8. Generate response with NVIDIA NIM (streaming via OpenAI-compatible API)
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error('NVIDIA_API_KEY environment variable is required');
    }

    const systemPrompt = buildSystemPrompt(astronautProfile, fullContext, topic, historyContext);
    const userPrompt = `User question: ${message}`;

    let fullResponse = '';

    try {
      for await (const token of await callNvidiaNimStream(systemPrompt, userPrompt, apiKey)) {
        if (token) {
          fullResponse += token;
          sendSSE(response, {
            event: 'token',
            data: { token }
          });
        }
      }
    } catch (streamError) {
      console.error('[pet-ai] Stream error:', streamError);
      throw streamError;
    }

    // 9. Validate output - append disclaimer since server adds it in "done" event
    const responseWithDisclaimer = `${fullResponse}\n\n${getMedicalDisclaimer()}`;
    const outputValidation = validateResponse(responseWithDisclaimer, fullContext, topic);
    if (!outputValidation.allowed) {
      console.warn('[pet-ai] Output validation failed:', outputValidation.reason);
      // If validation fails, send a safe fallback ONLY if we haven't sent substantial content
      if (fullResponse.trim().length < 50) {
        const fallbackResponse = `I don't have enough data to provide a reliable answer to that question. ${getMedicalDisclaimer()}`;
        sendSSE(response, {
          event: 'token',
          data: { token: fallbackResponse }
        });
        fullResponse = fallbackResponse;
      }
      // Otherwise keep the model's response but log the validation issue
    }

    // 10. Save assistant response to history (with disclaimer)
    const finalResponse = `${fullResponse}\n\n${getMedicalDisclaimer()}`;
    await saveMessage(astronautId, currentSessionId, 'assistant', finalResponse, db);

    // 11. Send done event with disclaimer
    sendSSE(response, {
      event: 'done',
      data: { disclaimer: getMedicalDisclaimer() }
    });

    response.end();

  } catch (error) {
    console.error('[pet-ai] Chat error:', error);
    sendSSE(response, {
      event: 'error',
      data: { message: 'An error occurred while processing your request. Please try again.' }
    });
    response.end();
  }
}

/**
 * Parse JSON body from request
 */
function parseJsonBody(request: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    request.on('error', reject);
  });
}