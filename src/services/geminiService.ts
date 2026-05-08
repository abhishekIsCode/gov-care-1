import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractHealthIdFromImage(base64Image: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Extract the patient's Health ID or National Health ID from this image of a QR code or ID card. 
            The ID is usually a unique numeric or alphanumeric string (e.g., 91-1234-5678-9012 or similar).
            If you see multiple IDs, prioritize the one clearly labeled as Health ID or from a Government Health ID card.
            Return ONLY the extracted ID string. If no ID is found, return "NULL".`,
          },
        ],
      },
    });

    const text = response.text?.trim() || "";
    if (text === "NULL" || text === "") {
      return null;
    }
    return text;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return null;
  }
}
