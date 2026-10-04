import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.toLowerCase().includes("your-api-key") || apiKey.includes("AQ.Ab8RN6LfcW2")) {
    console.warn("======================================================================");
    console.warn(" WARNING: GEMINI_API_KEY is not configured or is using a placeholder.");
    console.warn(" LiveClass fallback engine will be used automatically in development.");
    console.warn("======================================================================");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: "Hello world",
          config: {
            systemInstruction: "You are helpful."
          }
        });
        console.log("Success with", model, response.text);
        return;
      } catch (err: any) {
        console.error("Test Error on", model, ":", err.message);
      }
  }
}

test();
