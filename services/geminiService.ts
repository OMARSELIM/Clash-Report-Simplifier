import { GoogleGenAI, Type } from "@google/genai";
import { ClassificationMap } from '../types';

/**
 * Uses Gemini to classify a unique list of layer names into standard disciplines.
 * This is efficient because we only send unique layer names, not the whole clash list.
 */
export const classifyLayers = async (layers: string[]): Promise<ClassificationMap> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning empty classification.");
    return {};
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Filter out obviously generic names to save tokens, though Gemini handles them fine.
  const uniqueLayers = Array.from(new Set(layers)).filter(l => l && l !== 'Unknown Layer').slice(0, 150); // Limit to 150 unique layers for safety

  if (uniqueLayers.length === 0) return {};

  const prompt = `
    You are a BIM Coordination Expert. 
    Classify the following CAD/Revit layer names into one of these disciplines: 
    [Structural, Mechanical, Electrical, Plumbing, Fire Protection, Architectural, Civil, General].
    
    If you are unsure, use "General".
    
    Layer Names:
    ${uniqueLayers.join(", ")}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  layerName: { type: Type.STRING },
                  discipline: { type: Type.STRING }
                },
                required: ["layerName", "discipline"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return {};

    const result = JSON.parse(jsonText) as { classifications: { layerName: string, discipline: string }[] };
    
    // Convert array back to map for O(1) lookup
    const map: ClassificationMap = {};
    result.classifications.forEach(item => {
      map[item.layerName] = item.discipline;
    });

    return map;

  } catch (error) {
    console.error("Gemini classification failed:", error);
    return {};
  }
};
