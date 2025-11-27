import { GoogleGenAI } from "@google/genai";
import { UserSettings, GenerationMode } from "../types";

// Ensure API key is present (Vite exposes env vars via import.meta.env)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const ensureApiKey = () => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
};

const getSystemInstruction = (settings: UserSettings) => {
  const toneMap = {
    professional: "You are a professional editor. Use formal, concise, and business-appropriate language.",
    creative: "You are a creative writer. Use evocative, descriptive, and engaging language.",
    casual: "You are a friendly assistant. Use conversational, easy-to-understand language.",
    academic: "You are an academic researcher. Use precise, scholarly, and objective language."
  };

  return `${toneMap[settings.tone]} Do not repeat the last sentence of the input. Return ONLY the continuation text.`;
};

const getLengthInstruction = (length: 'short' | 'medium' | 'long', mode: GenerationMode) => {
  if (mode === 'line') return "Write exactly one sentence.";
  if (mode === 'paragraph') return "Write exactly one complete paragraph.";
  
  switch (length) {
    case 'short': return "Write about 1-2 sentences.";
    case 'medium': return "Write about 3-5 sentences.";
    case 'long': return "Write about 2-3 paragraphs.";
    default: return "";
  }
};

export const generateVariants = async (
  currentText: string,
  settings: UserSettings,
  mode: GenerationMode,
  onFirstToken?: (token: string) => void
): Promise<string[]> => {
  ensureApiKey();

  const model = 'gemini-2.5-flash';
  const systemInstruction = getSystemInstruction(settings);
  const lengthInstruction = getLengthInstruction(settings.length, mode);

  // If the provided currentText has more than 15 words, use the full body
  // as context. Otherwise, fall back to the last ~2000 characters for brevity.
  const wordCount = (currentText || '').split(/\s+/).filter(Boolean).length;
  const contextText = wordCount > 15 ? currentText : currentText.slice(-2000);

  const prompt = `
${systemInstruction}
${lengthInstruction}

---
Current Text:
${contextText}
---
Continuation:
  `.trim();

  // We need to generate 'settings.variantCount' variants.
  // We will stream the FIRST one to provide immediate feedback, 
  // and fetch the others in parallel.

  const promises: Promise<string>[] = [];

  // Request 1: Streaming (for UX)
  promises.push(new Promise<string>(async (resolve, reject) => {
    try {
      let fullText = "";
      const result = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
           temperature: 0.7, // slightly varied
        }
      });
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          if (onFirstToken) onFirstToken(text);
        }
      }
      resolve(fullText);
    } catch (e) {
      reject(e);
    }
  }));

  // Requests 2...N: Parallel non-streaming (for variety)
  // We vary temperature slightly to get different results if the API supports it effectively per request
  for (let i = 1; i < settings.variantCount; i++) {
    promises.push(ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.7 + (i * 0.1), // Increase randomness for other variants
      }
    }).then(res => res.text || ''));
  }

  return Promise.all(promises);
};

export const generateTitleFromContent = async (content: string): Promise<string> => {
  ensureApiKey();

  const model = 'gemini-2.5-flash';
  const prompt = `Create a concise, descriptive title (5-8 words) for the following document. Return ONLY the title on a single line.\n\nDocument:\n${content.trim()}`;

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { temperature: 0.2 }
  } as any);

  const raw = (res as any).text || (res as any)?.response?.candidates?.[0]?.text || '';
  const title = String(raw || '').split(/\r?\n/)[0].trim();
  return title;
};
