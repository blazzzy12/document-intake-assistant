from app.models import PersonalWishesState, Executor
from app.mock_llm import MockLLMService


def apply_updates(state: PersonalWishesState, updates: dict) -> PersonalWishesState:
    data = state.model_dump()
    for k, v in updates.items():
        if k == "executor" and isinstance(v, dict):
            current_exec = data.get("executor") or {}
            merged_exec = {**current_exec, **v}
            data["executor"] = merged_exec
        elif v is not None:
            data[k] = v
    return PersonalWishesState(**data)


def test_multi_field_extraction():
    mock = MockLLMService()
    state = PersonalWishesState()
    user_input = "I am Jane Doe and I live at 15 Kensington High St, London. Document covers worldwide assets."
    
    updates, reply = mock.process_turn(state, user_input)
    updated_state = apply_updates(state, updates)

    assert updated_state.full_name == "Jane Doe"
    assert updated_state.home_address == "15 Kensington High St, London"
    assert updated_state.covers_worldwide_assets is True
    assert updated_state.has_children is None  # Unmentioned stays None


def test_executor_correction():
    mock = MockLLMService()
    # Initial state with brother James as executor
    state = PersonalWishesState(
        full_name="Jane Doe",
        executor=Executor(name="James", relationship="brother")
    )

    # User corrects executor to sister Sarah
    user_input = "Actually, make my sister Sarah the executor."
    updates, reply = mock.process_turn(state, user_input)
    updated_state = apply_updates(state, updates)

    assert updated_state.executor.name == "Sarah"
    assert updated_state.executor.relationship == "sister"
    assert updated_state.full_name == "Jane Doe"  # Existing data preserved
    