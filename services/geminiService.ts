import { GoogleGenAI, Type } from "@google/genai";
import { ClassificationMap } from '../types';

/**
 * Uses Gemini to classify a unique list of layer names into standard disciplines.
 * This is efficient because we only send unique layer names, not the whole clash list.
 * 
 * @param layers List of unique layer names
 * @param customDisciplines Optional list of disciplines to use for classification. 
 *                          If provided, overrides the default list.
 * @param layerOverrides Optional map of specific layer names to pre-defined disciplines.
 *                       These layers will skip AI classification.
 */
export const classifyLayers = async (
  layers: string[], 
  customDisciplines?: string[],
  layerOverrides?: Record<string, string>
): Promise<ClassificationMap> => {
  
  // 1. Prepare initial map with overrides
  const finalMap: ClassificationMap = {};
  
  // Filter valid layers first
  const validLayers = Array.from(new Set(layers)).filter(l => l && l !== 'Unknown Layer');
  const layersForAi: string[] = [];

  // Apply overrides immediately and segregate remaining layers
  validLayers.forEach(layer => {
    // Check if strict override exists (case-sensitive usually preferred for exact matches, 
    // but could normalize if needed. We'll stick to exact match for now).
    if (layerOverrides && layerOverrides[layer]) {
      finalMap[layer] = layerOverrides[layer];
    } else {
      layersForAi.push(layer);
    }
  });

  // If everything is overridden or empty, return immediately
  if (layersForAi.length === 0) return finalMap;

  // If no API key, we can only return what was overridden
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning only overridden classifications.");
    return finalMap;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limit to 150 unique layers for safety/token limits
  const batchForAi = layersForAi.slice(0, 150); 

  const defaultDisciplines = ["Structural", "Mechanical", "Electrical", "Plumbing", "Fire Protection", "Architectural", "Civil", "General"];
  
  // Use custom disciplines if provided and not empty, otherwise default
  const activeDisciplines = (customDisciplines && customDisciplines.length > 0) 
    ? customDisciplines 
    : defaultDisciplines;

  // determine fallback
  const fallback = activeDisciplines.includes("General") 
    ? "General" 
    : activeDisciplines[activeDisciplines.length - 1] || "Unknown";

  const prompt = `
    You are a BIM Coordination Expert. 
    Classify the following CAD/Revit layer names into one of these disciplines: 
    [${activeDisciplines.join(", ")}].
    
    If you are unsure, use "${fallback}".
    
    Layer Names:
    ${batchForAi.join(", ")}
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
    if (jsonText) {
      const result = JSON.parse(jsonText) as { classifications: { layerName: string, discipline: string }[] };
      // Merge AI results into final map
      result.classifications.forEach(item => {
        finalMap[item.layerName] = item.discipline;
      });
    }

    return finalMap;

  } catch (error) {
    console.error("Gemini classification failed:", error);
    // Return whatever we have (overrides) even if AI failed
    return finalMap;
  }
};