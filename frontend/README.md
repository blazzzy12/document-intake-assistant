# Document Intake Assistant — Wenup LLM Engineering Technical Assessment

> Conversational AI that turns natural language into structured legal documents — in real time.

![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![Pydantic v2](https://img.shields.io/badge/Pydantic-v2-E92063?style=flat-square&logo=pydantic&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Installation

**Requirements:** Python 3.10+, Node.js 18+, npm

```bash
git clone [https://github.com/blazzzy12/document-intake-assistant.git](https://github.com/blazzzy12/document-intake-assistant.git)
cd document-intake-assistant

1. Backend Setup
cd backend
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.api:app --reload --port 8000
2. Frontend Setup
In a separate terminal:

Bash
cd frontend
npm install
npm run dev
Open http://localhost:5173. No .env is needed; the built-in deterministic simulation engine runs immediately without an API key.

Optional: To use a live LLM, add your key to backend/.env and restart the backend server:

Code snippet
GEMINI_API_KEY=your_gemini_key
# or OPENAI_API_KEY=your_openai_key
Run Tests
In your backend terminal:

Bash
cd backend
pytest
What This Is
A full-stack LLM intake assistant that conducts a natural-language conversation with a user and progressively compiles a structured Personal Wishes Document — the legal instrument used in estate planning intake. Every field extracted from unstructured user turns is validated against strict Pydantic v2 contracts, updated live in the statutory preview pane, and tracked in a field-level audit trail.

Built as a submission for the Wenup Engineering Technical Assessment, this implementation introduces decoupled microservice architecture patterns, zero-click evaluation tooling, and a compliance-aware legal layer.

What Makes This Different
🛡️ Pydantic v2 Canonical Validation Core
Rather than relying on loosely typed frontend schemas, data integrity is anchored by Pydantic v2 on a dedicated FastAPI backend. Inputs are parsed into strictly typed models (PersonalWishesState, Executor, AuditEntry) to prevent data corruption across turns.

🧪 Built-in Evaluation Fixture Runner
Reviewers can evaluate real-world edge cases with zero typing. The dedicated Evaluation Test Fixtures tab offers 1-click execution across 5 standardized scenarios:

Batch Multi-Field Intake: Atomically parses declarant, residence, worldwide scope, and executor nomination from a single prompt.

Lineage Declaration: Captures issue and child dependencies.

Executor Mutation & Override: Demonstrates non-linear correction handling and updates.

Off-Topic Deflection: Verifies safety perimeter guardrails against domain drift (e.g., cooking recipes, general trivia).

Statutory Document Compilation: Validates the end-to-end legal compiler with mandatory statutory disclosures.

📜 Statutory Compliance Compiler (Wills Act 1837 & AEA 1925)
The document rendering engine (engine.py) compiles user intentions with formal legal notices aligned with the Wills Act 1837 and the Administration of Estates Act 1925, explicitly marking testamentary intentions and draft disclaimers.

🔄 Real-Time Field Mutation Audit Trail
Every update triggers a deterministic state diff comparing previous and new values, recording exact UTC timestamps to provide an institutional-grade audit log of user adjustments.

⚡ Dual-Mode Reliability Strategy
Works out of the box with zero setup using a regex-based deterministic state machine (mock_llm.py), while offering plug-and-play live generative extraction via the official google-genai SDK (gemini-2.5-flash) with automatic fallback on quota exhaustion or network dropouts.

Architecture Overview
Plaintext
document_intake_assistant/
├── backend/
│   ├── app/
│   │   ├── api.py           # REST endpoints (/api/turn, /api/health)
│   │   ├── engine.py        # Statutory compliance document compiler
│   │   ├── llm_service.py   # Dual-mode provider (Gemini + fallback)
│   │   ├── mock_llm.py      # Deterministic state machine & guardrails
│   │   └── models.py        # Pydantic v2 canonical schemas
│   ├── tests/
│   │   ├── test_api.py      # API endpoint integration tests
│   │   └── test_engine.py   # State compilation and edge-case tests
│   ├── requirements.txt     # Python runtime dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Live Chat, Fixtures Runner, Schema Cards & Preview
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
License
This project is licensed under the MIT License.


