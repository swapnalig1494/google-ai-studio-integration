
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DiagnosisResult, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzePlantImage(base64Image: string, lang: Language): Promise<DiagnosisResult> {
  const prompt = `Analyze this plant leaf image. Provide a detailed diagnosis in ${lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English'}.
  Return the result as a structured JSON object. Include:
  - plantName (common name)
  - diseaseName (specific disease or 'Healthy')
  - confidence (0-100)
  - description (briefly what it is)
  - organicTreatment (natural ways to fix)
  - chemicalTreatment (recommended pesticides/fertilizers)
  - preventiveMeasures (list of 3 items)
  - severity (Low, Medium, or High)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plantName: { type: Type.STRING },
          diseaseName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          description: { type: Type.STRING },
          organicTreatment: { type: Type.STRING },
          chemicalTreatment: { type: Type.STRING },
          preventiveMeasures: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING }
        },
        required: ["plantName", "diseaseName", "confidence", "description", "organicTreatment", "chemicalTreatment", "preventiveMeasures", "severity"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function speakResult(text: string): Promise<void> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (err) {
    console.error("TTS failed:", err);
  }
}

export async function getAgriInsights(location: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Give 2 agricultural shop recommendations and a fertilizer tip for someone in ${location}. Return as JSON.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}
