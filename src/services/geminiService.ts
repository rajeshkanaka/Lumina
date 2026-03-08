/**
 * Lumina — Vertex AI via backend only. No API keys in the frontend.
 * All Gemini calls go through the backend (google-genai + GOOGLE_GENAI_USE_VERTEXAI=1).
 * Rule-based fallback when the backend is unavailable.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function ruleBasedElaborate(
  situation: string,
  description: string,
  feedback?: string,
  previousPrompt?: string
): string {
  if (previousPrompt && feedback) {
    return `${previousPrompt}\n\nRefinement: ${feedback}\n\nEnhanced: ${situation}. ${description}. ${feedback}.`;
  }
  return `A detailed scene: ${situation}. ${description}. Cinematic lighting, rich atmosphere, sharp detail, evocative mood.`;
}

export async function elaboratePrompt(
  situation: string,
  description: string,
  feedback?: string,
  previousPrompt?: string
): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/elaborate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation,
        description,
        feedback: feedback ?? null,
        previous_prompt: previousPrompt ?? null,
      }),
    });
    if (!res.ok) throw new Error("Elaborate failed");
    const data = await res.json();
    return (data.prompt as string)?.trim() || ruleBasedElaborate(situation, description, feedback, previousPrompt);
  } catch {
    return ruleBasedElaborate(situation, description, feedback, previousPrompt);
  }
}

export async function generateMasterpiece(prompt: string, aspectRatio: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
  });
  if (res.status === 503) {
    throw new Error(
      "Vertex AI unavailable. Start the backend with Vertex AI (GOOGLE_GENAI_USE_VERTEXAI=1, gcloud auth application-default login)."
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.detail as string) || "Image generation failed");
  }
  const data = await res.json();
  if (!data.image_data_url) throw new Error("No image in response");
  return data.image_data_url;
}
