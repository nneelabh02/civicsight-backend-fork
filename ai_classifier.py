from logger import get_logger
import os
import json
import httpx
import base64
from typing import Optional
from dotenv import load_dotenv

# 1. Import Google's SDK
import google.generativeai as genai

logger = get_logger("ai_classifier")

load_dotenv()

# 2. Configure the API Key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
You are a municipal issue classifier for a city reporting system.
Given an image and optional citizen description, return ONLY a
JSON object with these fields:

{
  "is_valid_issue": true/false,
  "category": one of [pothole, road_damage, broken_streetlight,
               garbage, illegal_dumping, water_leak, flooding,
               park_damage, graffiti, noise, other],
  "priority": one of [critical, high, medium, low],
  "confidence": float between 0 and 1,
  "ai_description": "2-3 sentence factual description of the issue",
  "priority_reason": "one sentence explaining why this priority"
}

Priority rules:
- critical: immediate safety risk (exposed wires, major flooding, collapsed road)
- high: infrastructure failure affecting many people
- medium: quality of life issue, not immediately dangerous
- low: cosmetic or minor

If the image does not show a real civic issue, set is_valid_issue
to false and category to "other".
"""

def get_image_bytes(image_path: str = None, image_url: str = None) -> bytes:
    """Safely extracts image bytes whether it's a URL or a raw Base64 string from our Next.js frontend"""
    if image_url:
        if image_url.startswith("http"):
            response = httpx.get(image_url, timeout=15, headers={"User-Agent": "CivicSight/1.0"})
            response.raise_for_status()
            return response.content
        elif image_url.startswith("data:image"):
            b64_data = image_url.split(",")[1]
            return base64.b64decode(b64_data)
        else:
            # Assume it's a raw base64 string
            return base64.b64decode(image_url)
            
    elif image_path:
        with open(image_path, "rb") as f:
            return f.read()
    return None

def classify_image(image_url: str = None, image_path: str = None,
                   citizen_description: Optional[str] = None) -> dict:

    user_text = SYSTEM_PROMPT
    if citizen_description:
        user_text += f"\n\nCitizen description: {citizen_description}"

    image_bytes = get_image_bytes(image_path=image_path, image_url=image_url)

    if not image_bytes:
        raise ValueError("No valid image provided")

    # 3. Use Gemini 1.5 Flash (Super fast, native multimodal)
    model = genai.GenerativeModel(
        'gemini-1.5-flash',
        # Force perfect JSON output! No more regex or string parsing needed.
        generation_config={"response_mime_type": "application/json"} 
    )

    image_parts = [
        {"mime_type": "image/jpeg", "data": image_bytes}
    ]

    logger.info("Sending image to Gemini API...")
    
    try:
        response = model.generate_content([user_text, image_parts[0]])
        result = json.loads(response.text)

        # Fill in missing fields with safe defaults
        result.setdefault("is_valid_issue", True)
        result.setdefault("category", "other")
        result.setdefault("priority", "medium")
        result.setdefault("confidence", 0.9)
        result.setdefault("ai_description", "Issue detected.")
        result.setdefault("priority_reason", "Assessed by AI.")
        
        logger.info(f"Gemini classification successful: {result.get('category')}")
        return result
        
    except Exception as e:
        logger.error(f"Gemini API failed: {e}")
        # Return a safe fallback so the app doesn't crash
        return {
            "is_valid_issue": True,
            "category": "other",
            "priority": "medium",
            "confidence": 0.0,
            "ai_description": "AI analysis temporarily unavailable.",
            "priority_reason": "System fallback."
        }