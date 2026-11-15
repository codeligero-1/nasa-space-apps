import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Note: Full PET AI implementation requires:
// 1. NVIDIA NIM API key
// 2. Vector embeddings (Nemotron-3-Embed-1B)
// 3. RAG retrieval from Supabase (pgvector)
// 4. Guardrails validation
// 5. Conversation history storage
// 6. SSE streaming support

// This is a simplified stub that returns a basic response
// For full implementation, see backend/src/rag/chat.ts

const NVIDIA_NIM_API_URL = process.env.NVIDIA_NIM_API_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

interface ChatRequest {
  message: string;
  sessionId?: string;
}

function sendSSE(res: VercelResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getMedicalDisclaimer(): string {
  return `**Medical Disclaimer**: I am an AI assistant, not a licensed medical professional. My responses are informational only and do not constitute medical advice, diagnosis, or treatment recommendations. Spaceflight health data requires interpretation by qualified flight surgeons and medical teams. Always consult with appropriate medical professionals for health decisions.`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'NVIDIA NIM not configured' });
    return;
  }

  const body = req.body as ChatRequest | undefined;
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const message = body.message.trim();

  try {
    // Simple fallback response without full RAG
    // In production, integrate with:
    // - retrieveRelevantRecords (vector search)
    // - buildContext (format health data)
    // - validateQuery/validateResponse (guardrails)
    // - saveMessage/getHistory (conversation persistence)

    const fallbackResponse = `I received your question: "${message}"

For a full PET AI response, the following components need to be connected:
1. **NVIDIA NIM API** - Nemotron-3-Ultra for chat completions
2. **Vector embeddings** - Nemotron-3-Embed-1B for RAG retrieval
3. **Supabase pgvector** - Store and search health record embeddings
4. **Guardrails** - Input/output validation for medical safety
5. **Conversation history** - Persistent session storage

Current status: **Backend infrastructure ready, serverless adaptation needed**

${getMedicalDisclaimer()}`;

    // Send as single token event (simulated streaming)
    sendSSE(res, 'token', { token: fallbackResponse });
    sendSSE(res, 'done', { disclaimer: getMedicalDisclaimer() });
    res.end();

  } catch (error) {
    console.error('[PET AI] Error:', error);
    sendSSE(res, 'error', { message: 'An error occurred while processing your request' });
    res.end();
  }
}