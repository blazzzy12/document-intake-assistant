from app.models import PersonalWishesState, Executor
from app.engine import generate_draft_document, DISCLAIMER


def test_draft_renders_pending_on_empty_state():
    state = PersonalWishesState()
    draft = generate_draft_document(state)
    assert DISCLAIMER in draft
    assert "[Full Name: Pending]" in draft
    assert "[Executor appointment: Pending designation]" in draft


def test_draft_renders_completed_state():
    state = PersonalWishesState(
        full_name="Jane Doe",
        home_address="10 Downing Street, London",
        covers_worldwide_assets=True,
        has_children=True,
        children_names=["Leo", "Maya"],
        executor=Executor(name="James Doe", relationship="brother"),
        specific_gifts=["Vintage watch to Leo"],
        additional_wishes="Scatter ashes in the Scottish Highlands",
    )
    draft = generate_draft_document(state)
    assert "Name: Jane Doe" in draft
    assert "worldwide assets" in draft
    assert "Leo, Maya" in draft
    assert "Designated Executor: James Doe (brother)" in draft
    assert "Vintage watch to Leo" in draft
    assert "Scottish Highlands" in draft