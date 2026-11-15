import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function Entry Point
 *
 * This is a minimal handler to verify the function works on Vercel.
 * The full server functionality requires adaptation for serverless (stateless) environment.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Basic health check
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  // For now, return a message indicating the API needs proper serverless adaptation
  return res.status(501).json({
    error: 'Not Implemented',
    message: 'This endpoint requires serverless adaptation. The original backend is a long-running server with in-memory state (sessions, rate limits) that needs to be migrated to external storage for Vercel serverless functions.',
    documentation: 'See server.ts for the full API implementation. For Vercel, sessions and rate limits need to move to Redis/database.',
    availableEndpoints: [
      'GET /api/health - Health check'
    ]
  });
}