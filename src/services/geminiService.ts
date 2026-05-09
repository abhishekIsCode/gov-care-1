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
            text: `Extract the text encoded in the QR code or ID card in the image. 
            If you see a QR code containing JSON or text, return the exact raw text or JSON string it contains. 
            If it's an ID card or medical document, extract the details and return it as a JSON object with keys: "healthId", "name", "age", "gender", "medicalHistory", "requestedTreatment". 
            (Create the healthId, age, gender, medicalHistory, and requestedTreatment if they are available on the document, e.g. "91-1234-5678-9012").
            Return ONLY the extracted string or JSON. Try not to wrap it in markdown block quotes. If no ID or QR code text is found, return "NULL".`,
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
