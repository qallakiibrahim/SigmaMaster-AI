import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateInsight = async (prompt: string, context?: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const fullPrompt = `
      Du är en expert Six Sigma Master Black Belt och Senior Processingenjör. 
      Ditt mål är att hjälpa användaren med DMAIC-metodiken.
      Svara professionellt, kortfattat och analytiskt på svenska.
      
      Kontext: ${context || 'Ingen kontext given.'}
      
      Fråga/Uppgift: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
    });

    return response.text || "Kunde inte generera svar.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ett fel uppstod vid kommunikation med AI-tjänsten. Kontrollera din API-nyckel.";
  }
};

export const analyzeDataPattern = async (data: number[]): Promise<string> => {
    const dataStr = data.slice(0, 50).join(', '); // Limit data sent to context
    return generateInsight(`Analysera denna datamängd för mönster, normalitet eller avvikelser: [${dataStr}]`);
}