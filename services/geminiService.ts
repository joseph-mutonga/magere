
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this context, we assume the key is always present.
  console.error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getAIResponse = async (prompt: string, contextData: object) => {
  try {
    const systemInstruction = `You are a helpful school management assistant for Kitengela Magereza Secondary School. 
    Analyze the provided JSON data to answer the user's question accurately and concisely.
    The data contains information about students, teachers, books, library transactions, grades, and inventory.
    Base your answer ONLY on the data provided. If the data is insufficient, state that.
    Start your response by friendly stating that you are operating on pre-loaded sample data.`;

    const fullPrompt = `
      Context Data (This is sample data for demonstration):
      ${JSON.stringify(contextData, null, 2)}
      
      User Question:
      "${prompt}"
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.2,
            topP: 0.8,
            topK: 10,
        },
    });
    
    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm sorry, but I encountered an error while processing your request. Please check the console for details.";
  }
};
