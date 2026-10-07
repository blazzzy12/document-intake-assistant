from fastapi.testclient import TestClient
from app.api import app
from app.models import PersonalWishesState

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_api_turn_flow():
    initial_state = PersonalWishesState().model_dump()
    payload = {
        "current_state": initial_state,
        "history": [],
        "user_message": "My name is Arthur Pendelton and I reside at 42 Wallaby Way, Sydney."
    }

    response = client.post("/api/turn", json=payload)
    assert response.status_code == 200
    body = response.json()

    # Check updated state has extracted fields
    assert body["updated_state"]["full_name"] == "Arthur Pendelton"
    assert body["updated_state"]["home_address"] == "42 Wallaby Way, Sydney"
    
    # Check draft was rendered with disclaimer and declarant name
    assert "Arthur Pendelton" in body["draft_document"]
    assert "FICTIONAL DRAFT DOCUMENT" in body["draft_document"]
    assert len(body["assistant_reply"]) > 0