import os
import json
from typing import Dict, Any, Tuple
from dotenv import load_dotenv
from app.models import PersonalWishesState
from app.mock_llm import MockLLMService

# Load backend/.env explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

SYSTEM_PROMPT = """You are an institutional Estate Planning Document Intake Assistant.
Conduct an intake dialogue to complete a Personal Wishes Document draft.

CURRENT SCHEMA STATE:
{current_state_json}

USER INPUT:
"{user_message}"

Extract updated entities into JSON format:
{{
  "full_name": string or null,
  "home_address": string or null,
  "covers_worldwide_assets": boolean or null,
  "has_children": boolean or null,
  "children_names": list of strings,
  "executor": {{"name": string, "relationship": string}} or null,
  "specific_gifts": list of strings,
  "additional_wishes": string or null
}}

Respond strictly with valid JSON with two top-level keys:
{{
  "updates": {{ ...only fields modified or extracted from this turn... }},
  "assistant_reply": "Targeted, professional legal follow-up question or completion confirmation"
}}"""

class IntakeLLMService:
    def __init__(self):
        self.mock_service = MockLLMService()
        self.gemini_key = os.getenv("GEMINI_API_KEY")

    def process_turn(
        self,
        current_state: PersonalWishesState,
        user_message: str
    ) -> Tuple[Dict[str, Any], str]:
        if not self.gemini_key:
            print("\n[LLM Mode] No GEMINI_API_KEY detected in .env -> Using MockLLMService\n")
            return self.mock_service.process_turn(current_state, user_message)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.gemini_key)
            prompt = SYSTEM_PROMPT.format(
                current_state_json=current_state.model_dump_json(),
                user_message=user_message
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )

            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]

            payload = json.loads(cleaned_text.strip())
            updates = payload.get("updates", {})
            reply = payload.get("assistant_reply", "I have recorded your details. What would you like to specify next?")
            print(f"\n[GEMINI SUCCESS] Extracted updates: {updates}\n")
            return updates, reply

        except Exception as e:
            print(f"\n[GEMINI RUNTIME ERROR - FALLING BACK TO MOCK]: {repr(e)}\n")
            return self.mock_service.process_turn(current_state, user_message)