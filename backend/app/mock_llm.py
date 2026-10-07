import re
from typing import Dict, Any, Tuple
from app.models import PersonalWishesState

OFF_TOPIC_KEYWORDS = ["recipe", "cake", "weather", "crypto", "bitcoin", "joke"]

class MockLLMService:
    def process_turn(
        self,
        current_state: PersonalWishesState,
        user_message: str
    ) -> Tuple[Dict[str, Any], str]:
        text = user_message.strip()
        lower = text.lower()
        updates: Dict[str, Any] = {}

        # 0. Off-topic Deflection Guardrail
        if any(keyword in lower for keyword in OFF_TOPIC_KEYWORDS):
            return updates, "I am your Estate Planning Intake Assistant. I can only assist with recording your personal wishes, assets, beneficiaries, and executor details. Let's return to your document."

        # 1. Full name extraction
        name_match = re.search(
            r"(?:my name is|i am|call me|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,2})",
            text,
            re.IGNORECASE
        )
        if name_match:
            candidate = name_match.group(1).strip()
            # Strip trailing preposition words like "from", "living", etc.
            words = candidate.split()
            cleaned_words = [w for w in words if w.lower() not in ["from", "in", "at", "living", "residing", "writing", "appointing"]]
            if len(cleaned_words) >= 2:
                updates["full_name"] = " ".join(cleaned_words).title()
            elif len(cleaned_words) == 1:
                updates["full_name"] = cleaned_words[0].title()

        # 2. Worldwide vs Domestic assets
        if any(phrase in lower for phrase in ["worldwide", "global", "everywhere", "all countries", "all assets"]):
            updates["covers_worldwide_assets"] = True
        elif any(phrase in lower for phrase in ["domestic", "local", "uk only", "india only", "only here"]):
            updates["covers_worldwide_assets"] = False

        # 3. Children extraction
        if any(phrase in lower for phrase in ["no children", "don't have kids", "do not have children", "no kids", "none", "no"]):
            if current_state.covers_worldwide_assets is not None and current_state.has_children is None:
                updates["has_children"] = False
                updates["children_names"] = []
        else:
            single_child_match = re.search(r"(?:his|her|my child's|child's)?\s*name is\s+([A-Za-z]+)", text, re.IGNORECASE)
            kids_match = re.search(r"(?:children|kids|sons|daughters)(?:\s+(?:named|are))?\s*:?\s*([A-Za-z,\s]+)", text, re.IGNORECASE)
            
            if single_child_match:
                child_name = single_child_match.group(1).strip().title()
                updates["has_children"] = True
                updates["children_names"] = [child_name]
            elif kids_match and not any(neg in lower for neg in ["no", "neither"]):
                raw_names = [n.strip().title() for n in re.split(r",|\sand\s", kids_match.group(1)) if n.strip()]
                if raw_names:
                    updates["has_children"] = True
                    updates["children_names"] = raw_names
            elif current_state.covers_worldwide_assets is not None and current_state.has_children is None:
                if any(w in lower.split() for w in ["yes", "yeah", "yep", "one", "two"]):
                    updates["has_children"] = True

       # 4. Executor & Relationship extraction
        # Handles: "make my friend Sarah my executor", "appoint my sister Sarah as executor", "Sarah my executor"
        exec_flexible = re.search(
            r"(?:appoint|make|nominate|designate)\s+(?:my\s+)?(brother|sister|friend|spouse|wife|husband|son|daughter|attorney)?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(?:as|my|to be)?\s*executor",
            text,
            re.IGNORECASE
        )
        if exec_flexible:
            rel = exec_flexible.group(1).lower() if exec_flexible.group(1) else "fiduciary"
            ex_name = exec_flexible.group(2).strip().title()
            updates["executor"] = {"name": ex_name, "relationship": rel}
        else:
            # Fallback for standard executor patterns
            exec_match = re.search(
                r"(?:appoint|executor(?: is)?|change to)\s+(?:my\s+)?(brother|sister|friend|spouse|wife|husband|son|daughter|attorney)?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)",
                text,
                re.IGNORECASE
            )
            if exec_match:
                rel = exec_match.group(1).lower() if exec_match.group(1) else "fiduciary"
                ex_name = exec_match.group(2).strip().title()
                updates["executor"] = {"name": ex_name, "relationship": rel}

        # 5. Residential Address extraction
        # Handles: "from Hinjewadi, Pune", "living at...", "live at..."
        addr_match = re.search(
            r"(?:live at|living at|address is|reside at|residing at|from)\s+([^.!\n]+?)(?=\s+(?:I|and|my|who|worldwide|domestic|\.|$))",
            text,
            re.IGNORECASE
        )
        if addr_match:
            candidate_addr = addr_match.group(1).strip().strip(",")
            if candidate_addr.lower() not in ["here", "home"]:
                updates["home_address"] = candidate_addr
        elif current_state.full_name and not current_state.home_address:
            if not any(token in lower for token in ["yes", "no", "worldwide", "domestic", "executor", "children"]):
                updates["home_address"] = text.strip()

        # 6. Additional wishes / Completion
        if any(phrase in lower for phrase in ["no", "nothing", "none", "that's all", "that is all", "done"]):
            if current_state.executor and (current_state.additional_wishes is None):
                updates["additional_wishes"] = "No additional testamentary conditions specified."
        elif "wish" in lower or "want" in lower or "please note" in lower:
            updates["additional_wishes"] = text.strip()

        next_question = self._determine_next_prompt(current_state, updates)
        return updates, next_question

    def _determine_next_prompt(self, current: PersonalWishesState, updates: Dict[str, Any]) -> str:
        name = updates.get("full_name", current.full_name)
        address = updates.get("home_address", current.home_address)
        worldwide = updates.get("covers_worldwide_assets", current.covers_worldwide_assets)
        children = updates.get("has_children", current.has_children)
        children_names = updates.get("children_names", current.children_names)
        executor = updates.get("executor", current.executor)
        wishes = updates.get("additional_wishes", current.additional_wishes)

        if not name:
            return "Hello! To begin preparing your Personal Wishes Document, could you please share your full legal name?"
        if not address:
            return f"Thank you, {name}. What is your current residential home address?"
        if worldwide is None:
            return "Should this document cover your assets worldwide, or only domestic/local assets?"
        if children is None:
            return "Do you have any children? If so, please let me know their names."
        if children is True and not children_names:
            return "What are the names of your children?"
        if not executor or (isinstance(executor, dict) and not executor.get("name")):
            return "Who would you like to appoint as the executor of your estate, and what is their relationship to you?"
        if wishes is None:
            return "I have recorded your key details. Are there any specific gifts you would like to assign, or any additional wishes you'd like noted?"
        
        return "All required sections are complete! Your draft preview on the right is ready with statutory disclaimers. You can download or copy your document."