#!/usr/bin/env tsx
import 'dotenv/config';

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    process.exit(1);
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();

  console.log('Available models:');
  data.models?.forEach((m: any) => {
    console.log(`  ${m.name}: ${m.supportedGenerationMethods?.join(', ') || 'none'}`);
  });
}

listModels().catch(console.error);