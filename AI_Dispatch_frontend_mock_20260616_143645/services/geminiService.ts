
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async editImage(base64Image: string, prompt: string, mimeType: string): Promise<string | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1], // Remove the data:image/png;base64, prefix
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      if (!response.candidates || response.candidates.length === 0) return null;

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
