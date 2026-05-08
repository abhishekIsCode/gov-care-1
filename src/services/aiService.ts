import { GoogleGenAI, Type } from "@google/genai";
import { Doctor } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface AssignmentResult {
  doctorId: string;
  reasoning: string;
}

export async function assignDoctorWithAI(
  medicalHistory: string,
  requestedTreatment: string,
  doctors: Doctor[]
): Promise<AssignmentResult> {
  const doctorContext = doctors.map(d => `${d.id}: ${d.name} (${d.specialty})`).join("\n");

  const prompt = `
    You are a medical triage assistant. Based on the patient's medical history and requested treatment, 
    assign the most suitable doctor from the list provided.
    
    Patient Medical History: ${medicalHistory}
    Requested Treatment: ${requestedTreatment}
    
    Available Doctors:
    ${doctorContext}
    
    Return the result in JSON format with the following keys:
    - doctorId: the ID of the selected doctor
    - reasoning: a brief explanation of why this specialty is appropriate
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
            doctorId: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["doctorId", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AssignmentResult;
  } catch (error) {
    console.error("AI Assignment Error:", error);
    // Fallback if AI fails: Pick the first doctor or throw
    if (doctors.length > 0) {
      return { 
        doctorId: doctors[0].id, 
        reasoning: "Automated assignment failed, falling back to general specialist." 
      };
    }
    throw new Error("No doctors available for assignment.");
  }
}
