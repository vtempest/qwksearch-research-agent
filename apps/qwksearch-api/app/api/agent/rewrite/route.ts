/**
 * @fileoverview AI text rewrite endpoint. POST accepts text and an optional
 * custom prompt, then uses a Groq LLM to rewrite the text for improved
 * clarity, grammar, and style.
 */
import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { getEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { text, prompt: customPrompt } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const GROQ_API_KEY = getEnv("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    const model = new ChatGroq({
      apiKey: GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });

    // Use custom prompt if provided, otherwise use default
    const prompt = customPrompt || `Rewrite the following text to improve clarity, grammar, and style while maintaining the original meaning and tone. Only return the rewritten text without any explanation or additional commentary:

${text}`;

    const response = await model.invoke(prompt);
    const rewrittenText = response.content.toString().trim();

    return NextResponse.json({ rewrittenText });
  } catch (error) {
    console.error('AI rewrite error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request. Please try again.' },
      { status: 500 }
    );
  }
}
