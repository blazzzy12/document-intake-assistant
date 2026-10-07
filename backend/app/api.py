
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import TurnRequest, TurnResponse, PersonalWishesState
from app.llm_service import IntakeLLMService
from app.engine import compile_document

app = FastAPI(
    title="Document Intake Assistant API",
    description="Conversational intake engine with structured state tracking and draft generation",
    version="1.0.0"
)

# Allow React / Vite frontend to communicate seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_service = IntakeLLMService()


def apply_state_updates(state: PersonalWishesState, updates: dict) -> PersonalWishesState:
    """
    Safely merges extracted updates into current state,
    handling nested executor models and preventing accidental field erasure.
    """
    data = state.model_dump()
    for k, v in updates.items():
        if k == "executor" and isinstance(v, dict):
            current_exec = data.get("executor") or {}
            merged_exec = {**current_exec, **{sk: sv for sk, sv in v.items() if sv is not None}}
            data["executor"] = merged_exec
        elif v is not None:
            data[k] = v
    return PersonalWishesState(**data)

import os

@app.get("/api/health")
def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    is_live = bool(gemini_key or openai_key)
    provider = "gemini" if gemini_key else ("openai" if openai_key else "mock")
    return {
        "status": "healthy",
        "mock_mode": not is_live,
        "provider": provider
    }
    


@app.post("/api/turn", response_model=TurnResponse)
def process_conversation_turn(payload: TurnRequest):
    """
    Accepts user input + current state, queries LLM (or mock fallback),
    updates structured state, and regenerates the draft document.
    """
    try:
        # 1. Process turn via LLM or deterministic fallback
        updates, reply = llm_service.process_turn(
            current_state=payload.current_state,
            user_message=payload.user_message
        )

        # 2. Merge updates into structured state
        new_state = apply_state_updates(payload.current_state, updates)

        # 3. Deterministically render draft preview
        draft = compile_document(new_state)

        return TurnResponse(
            updated_state=new_state,
            assistant_reply=reply,
            draft_document=draft
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intake processing failed: {str(e)}")