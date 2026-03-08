"""
Lumina backend — Vertex AI only. No API keys.
Uses google-genai with GOOGLE_GENAI_USE_VERTEXAI=1.
"""
import base64
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Env must be set before importing genai (Vertex AI)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "1")
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "adktalentpulse360")

from google import genai
from google.genai import types

app = FastAPI(title="Lumina", description="Vertex AI–backed prompt and image API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_ELABORATE = os.getenv("LUMINA_MODEL_ELABORATE", "gemini-2.5-flash")
MODEL_IMAGE = os.getenv("LUMINA_MODEL_IMAGE", "gemini-2.5-flash-preview-05-20")


class ElaborateRequest(BaseModel):
    situation: str
    description: str
    feedback: str | None = None
    previous_prompt: str | None = None


class ElaborateResponse(BaseModel):
    prompt: str
    fallback: bool = False


class GenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: str


class GenerateResponse(BaseModel):
    image_data_url: str
    fallback: bool = False


def _get_client() -> genai.Client | None:
    try:
        return genai.Client()
    except Exception:
        return None


def _rule_based_elaborate(
    situation: str,
    description: str,
    feedback: str | None = None,
    previous_prompt: str | None = None,
) -> str:
    """Fallback when Vertex AI is unavailable. No API key, no Gemini — rule-based only."""
    if previous_prompt and feedback:
        return f"{previous_prompt}\n\nRefinement: {feedback}\n\nEnhanced: {situation}. {description}. {feedback}."
    return f"A detailed scene: {situation}. {description}. Cinematic lighting, rich atmosphere, sharp detail, evocative mood."


@app.post("/api/elaborate", response_model=ElaborateResponse)
def elaborate(req: ElaborateRequest):
    client = _get_client()
    if not client:
        return ElaborateResponse(
            prompt=_rule_based_elaborate(
                req.situation, req.description, req.feedback, req.previous_prompt
            ),
            fallback=True,
        )

    prompt_text = f"""You are a master AI image prompt engineer. Create a single, breathtaking prompt for an image model.
Situation: {req.situation}
Description: {req.description}
"""
    if req.previous_prompt and req.feedback:
        prompt_text += f"\nPrevious prompt: {req.previous_prompt}\nUser refinement: {req.feedback}\nRefine accordingly."
    else:
        prompt_text += "\nOutput ONLY the raw prompt: lighting, atmosphere, angle, style, detail. No quotes or markdown."

    try:
        response = client.models.generate_content(
            model=MODEL_ELABORATE,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                system_instruction="You are a prompt engineer. Output only the raw prompt text, nothing else.",
            ),
        )
        text = (response.text or "").strip()
        if not text:
            return ElaborateResponse(
                prompt=_rule_based_elaborate(
                    req.situation, req.description, req.feedback, req.previous_prompt
                ),
                fallback=True,
            )
        return ElaborateResponse(prompt=text, fallback=False)
    except Exception as e:
        return ElaborateResponse(
            prompt=_rule_based_elaborate(
                req.situation, req.description, req.feedback, req.previous_prompt
            ),
            fallback=True,
        )


def _map_aspect_ratio(ar: str) -> str:
    m = {
        "1:1": "1:1",
        "2:3": "3:4",
        "3:2": "4:3",
        "3:4": "3:4",
        "4:3": "4:3",
        "9:16": "9:16",
        "16:9": "16:9",
        "21:9": "16:9",
    }
    return m.get(ar, "1:1")


@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    client = _get_client()
    if not client:
        raise HTTPException(
            status_code=503,
            detail="Vertex AI unavailable. Set GOOGLE_GENAI_USE_VERTEXAI=1 and ADC (e.g. gcloud auth application-default login).",
        )

    ratio = _map_aspect_ratio(req.aspect_ratio)
    try:
        response = client.models.generate_content(
            model=MODEL_IMAGE,
            contents=req.prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=ratio),
            ),
        )
        for part in getattr(response, "parts", []) or []:
            inline = getattr(part, "inline_data", None)
            if inline is None:
                continue
            mime = getattr(inline, "mime_type", None) or "image/png"
            data = getattr(inline, "data", None)
            if data is not None:
                b64 = (
                    base64.b64encode(data).decode("ascii")
                    if isinstance(data, bytes)
                    else data
                )
                return GenerateResponse(
                    image_data_url=f"data:{mime};base64,{b64}", fallback=False
                )
        raise HTTPException(status_code=502, detail="No image in response")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
