from typing import List, Optional
from pydantic import BaseModel, Field


class Executor(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the designated executor")
    relationship: Optional[str] = Field(None, description="Relationship to the user (e.g. brother, friend)")


class PersonalWishesState(BaseModel):
    full_name: Optional[str] = Field(None, description="User's full legal name")
    home_address: Optional[str] = Field(None, description="Current residential address")
    covers_worldwide_assets: Optional[bool] = Field(
        None, description="True if document applies worldwide; False if limited to domestic jurisdiction"
    )
    has_children: Optional[bool] = Field(None, description="True if user has children, False otherwise")
    children_names: List[str] = Field(default_factory=list, description="List of children's legal names")
    executor: Optional[Executor] = Field(None, description="Executor details")
    specific_gifts: List[str] = Field(default_factory=list, description="Specific items or financial gifts bequeathed")
    additional_wishes: Optional[str] = Field(None, description="Any other personal instructions or wishes")


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class TurnRequest(BaseModel):
    current_state: PersonalWishesState = Field(..., description="Current accumulated intake state")
    history: List[ChatMessage] = Field(default_factory=list, description="Conversation history so far")
    user_message: str = Field(..., description="Latest message from the user")


class TurnResponse(BaseModel):
    updated_state: PersonalWishesState = Field(..., description="Validated state with new extractions applied")
    assistant_reply: str = Field(..., description="Conversational reply or follow-up question")
    draft_document: str = Field(..., description="Rendered draft document based on the updated state")