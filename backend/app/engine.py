from datetime import datetime
from app.models import PersonalWishesState

STATUTORY_DISCLAIMER = """
================================================================================
STATUTORY COMPLIANCE & LEGAL NOTICE (SIMULATION PURPOSES ONLY)
Pursuant to general principles under the Wills Act 1837 and the Administration
of Estates Act 1925, this instrument reflects personal intentions and guidance.
It does not constitute formal testamentary execution until witnessed and executed
in accordance with statutory formalities.
================================================================================
"""

def compile_document(state: PersonalWishesState) -> str:
    declarant = state.full_name or "[PENDING: DECLARANT FULL NAME]"
    address = state.home_address or "[PENDING: RESIDENTIAL ADDRESS]"
    
    if state.covers_worldwide_assets is None:
        asset_scope = "[PENDING: WORLDWIDE VS LOCAL SCOPE SELECTION]"
    elif state.covers_worldwide_assets:
        asset_scope = "All worldwide real, personal, tangible, and intangible property wherever situated."
    else:
        asset_scope = "Solely domestic and local jurisdiction assets situated within the declarant's primary residence country."

    if state.has_children is None:
        children_declaration = "[PENDING: DECLARATION OF ISSUE / CHILDREN]"
    elif not state.has_children:
        children_declaration = "The declarant expressly records having no surviving children or issue at the date of execution."
    else:
        names = ", ".join(state.children_names) if state.children_names else "[NAMES PENDING SPECIFICATION]"
        children_declaration = f"The declarant records having surviving issue/children identified as: {names}."

    # 4. Executor extraction safe access (handles both dict and object)
    executor_name = None
    executor_rel = None

    if state.executor:
        if isinstance(state.executor, dict):
            executor_name = state.executor.get("name")
            executor_rel = state.executor.get("relationship")
        else:
            executor_name = getattr(state.executor, "name", None)
            executor_rel = getattr(state.executor, "relationship", None)

    if not executor_name:
        executor_declaration = "[PENDING: EXECUTOR / PERSONAL REPRESENTATIVE DESIGNATION]"
    else:
        rel_str = f" ({executor_rel})" if executor_rel else ""
        executor_declaration = f"I nominate and appoint {executor_name}{rel_str} as the primary Executor and Personal Representative of these personal wishes."

    if not state.specific_gifts:
        gifts_clause = "No specific testamentary gifts or bequests nominated at this time."
    else:
        gifts_clause = "\n".join([f"  - Item/Asset: {gift}" for gift in state.specific_gifts])

    wishes_clause = state.additional_wishes or "None declared. Residuary intentions subject to statutory administration."

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    doc = f"""PERSONAL WISHES & INTAKE RECORD
Generated: {timestamp}
Reference Schema: Pydantic v2 Contract (Strict Typing)
--------------------------------------------------------------------------------

1. DECLARANT IDENTIFICATION
   Full Legal Name: {declarant}
   Primary Residence: {address}

2. JURISDICTION & SCOPE OF ASSETS
   Asset Scope: {asset_scope}

3. FAMILY & LINEAGE DECLARATION
   Declaration: {children_declaration}

4. APPOINTMENT OF EXECUTOR / FIDUCIARY
   Appointment: {executor_declaration}

5. SPECIFIC BEQUESTS & GIFTS
{gifts_clause}

6. SPECIAL DIRECTIONS & ADDITIONAL WISHES
   {wishes_clause}

--------------------------------------------------------------------------------
{STATUTORY_DISCLAIMER}
"""
    return doc.strip()