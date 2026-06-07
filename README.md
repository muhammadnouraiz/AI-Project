# 🤖 Code Explanation Assistant (CEA)

> A task-oriented AI agent for structured, multi-mode, conversational program comprehension.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini API](https://img.shields.io/badge/Google_Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Appwrite](https://img.shields.io/badge/Appwrite-Database-FD366E?style=flat-square&logo=appwrite&logoColor=white)](https://appwrite.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📖 Overview

The **Code Explanation Assistant (CEA)** is a full-stack AI-powered web application that helps students and software engineers understand source code through structured, natural-language explanations. Developed as part of the Artificial Intelligence course (Assignment 2) at the **University of Engineering and Technology, Taxila**, CEA addresses the well-documented reality that developers spend upwards of 50–60% of their working time reading and interpreting code — yet existing tools offer no natural-language explanatory support.

Unlike general-purpose AI chatbots, CEA uses:
- **Deterministic prompt engineering** with mode-specific templates
- **Persistent session memory** (via Appwrite) for multi-turn conversational follow-ups
- **Automatic model-fallback routing** to ensure service continuity on free-tier API quotas
- **Zero-shot bug detection** through carefully crafted prompt instructions

---

## ✨ Features

### Four Explanation Modes
| Mode | Description |
|---|---|
| **Line-by-Line** | Numbered breakdown of each line/logical block, with inline `[BUG]` / `[FIX]` annotations for detected issues |
| **Step-by-Step** | Identifies major algorithmic phases (e.g., Initialisation → Processing → Output) with a *Key Concepts Used* section |
| **High-Level Summary** | Concise prose paragraph describing the overall purpose and behaviour of the code |
| **Custom Prompt** | User-supplied constraint string injected directly into the prompt — e.g., *"explain for Dev-C++ with GCC 4.x"* |

### Additional Capabilities
- **Multi-Turn Dialogue** — Ask follow-up questions without re-submitting code; the agent retrieves full session context from Appwrite automatically.
- **Automatic Model Fallback** — Transparently reroutes to the next Gemini model tier on quota exhaustion (429 errors), with no user-facing interruption.
- **Zero-Shot Bug Detection** — Flags semantic issues like missing `useEffect` dependency arrays in React components without any static analysis tooling.
- **Constraint-Aware Explanations** — Custom mode generates compatibility-aware fixes (e.g., `std::stringstream` alternatives for compilers that predate C++11's `to_string`).
- **Markdown Rendering** — Explanations rendered with full Markdown support (numbered lists, bold labels, inline code blocks).

---

## 🏗️ Architecture

```
User Input → React/Tailwind UI → FastAPI Backend → Prompt Builder → Gemini API → Output Formatter → UI Display → Appwrite DB
```

```
cea/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, route definitions
│   │   ├── models.py          # Pydantic request/response schemas
│   │   ├── prompt_builder.py  # Mode-specific prompt template engine
│   │   ├── gemini.py          # Gemini API client + fallback routing
│   │   ├── appwrite_db.py     # Appwrite session read/write logic
│   │   └── formatter.py       # Output post-processing
│   ├── requirements.txt
│   └── .env                   # (not committed — see Environment Variables)
│
└── code-explainer/            # React frontend
    ├── src/
    │   ├── components/        # UI components (Editor, ModeSelector, OutputPanel)
    │   └── App.jsx
    ├── package.json
    └── vite.config.js
```

**Tech Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Python 3.11, FastAPI, Pydantic, asyncio |
| LLM Inference | Google Gemini API (`gemini-2.0-flash` → `gemini-2.5-flash` fallback) |
| Persistent Memory | Appwrite Cloud (document database) |

---

## ⚙️ Prerequisites

- Python **3.11+**
- Node.js **18+** and npm
- A **Google AI Studio** API key ([get one here](https://aistudio.google.com/app/apikey))
- An **Appwrite Cloud** project with a Database and Collection configured ([sign up here](https://cloud.appwrite.io))

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/muhammadnouraiz/AI-Project.git
cd AI-Project
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
# → Fill in your keys (see Environment Variables section below)

# Start the development server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd code-explainer

# Install dependencies
npm install

# Start the development server
npm run dev
```

The UI will be available at `http://localhost:5173`.

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` directory with the following variables:

```env
# Google Gemini
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-2.0-flash

# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_secret_api_key
APPWRITE_DATABASE_ID=your_appwrite_database_id
APPWRITE_COLLECTION_ID=your_appwrite_collection_id
```

### Appwrite Collection Schema

Create a collection in your Appwrite database with the following attributes:

| Attribute | Type | Description |
|---|---|---|
| `session_id` | String | UUID identifying the chat session |
| `model` | String | Gemini model used for the session |
| `mode` | String | Explanation mode (`line_by_line`, `step_by_step`, etc.) |
| `original_code` | String | The code submitted by the user |
| `chat_history` | String | JSON-serialised array of message objects |

---

## 🧪 Experiments & Results

Four controlled experiments were conducted against Python, React/JavaScript, and C++ code across all explanation modes. All experiments used free-tier Gemini API keys (meaning fallback routing was actively exercised).

| Exp. | Mode | Language | Fallback Triggered? | Response Time | Key Finding |
|---|---|---|---|---|---|
| 1 | Step-by-Step | Python | ✅ Yes | ~5.5s | Correct 3-phase decomposition; accurate Key Concepts enumeration |
| 2 | Line-by-Line | React/JS | ✅ Yes | ~13.5s | Automatically detected missing `useEffect` dependency array (latent infinite-loop bug) |
| 3 | Custom Prompt | C++ | ✅ Yes | ~3.1s | Identified `to_string` C++11 incompatibility; provided `std::stringstream` alternative |
| 4 | Custom (follow-up) | C++ (Exp. 3) | ✅ Yes | ~2.1s | Appwrite context retrieved; correct function-refactoring applied with no code re-submission |

---

## 🔌 API Reference

### `POST /api/explain`

**Request Body:**

```json
{
  "code": "def get_even_numbers(numbers):\n  ...",
  "mode": "step_by_step",
  "language": "python",
  "custom_prompt": "",
  "is_followup": false,
  "session_id": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Source code to explain |
| `mode` | string | Yes | `line_by_line` \| `step_by_step` \| `summary` \| `custom` |
| `language` | string | No | Programming language hint (optional, for prompt context) |
| `custom_prompt` | string | No | Required when `mode` is `custom` |
| `is_followup` | boolean | No | Set to `true` for multi-turn follow-up messages |
| `session_id` | string | No | UUID from a prior response; required when `is_followup` is `true` |

**Response:**

```json
{
  "explanation": "**Step 1: Initialisation of Result List** ...",
  "session_id": "94acc475-..."
}
```

---

## ⚠️ Known Limitations

- **Hallucination risk** — LLM outputs may be plausible-sounding but factually incorrect for niche libraries or unusual language features. Treat explanations as a learning aid, not an authoritative reference.
- **API dependency** — The system depends entirely on Google Gemini API availability. Any outage or rate-limit policy change can affect service.
- **No code validation** — Suggested fixes in Custom Prompt mode are not syntactically verified before delivery.
- **Session storage** — Appwrite documents currently have no expiry or size-limiting policy; production deployments should implement garbage collection.

---

## 🔮 Future Work

- **AST Integration** — Parse submitted code into an Abstract Syntax Tree to enable more precisely targeted explanations and validate model-suggested fixes.
- **Self-Verification Layer** — A secondary LLM call or rule-based checker to assess explanation accuracy before delivery.
- **Few-Shot Retrieval** — Embedding-based example retrieval to improve explanation quality for complex or domain-specific code.
- **User Study** — Quantitative evaluation with undergraduate software engineering students to measure impact on comprehension speed and accuracy.
- **Session Management** — Automatic document expiry and history size-limiting for production readiness.

---

## 👥 Team

| Name | Student ID |
|---|---|
| Iqra Shabbir | 22-SE-55 |
| Muhammad Nouraiz | 22-SE-89 |
| Barira | 22-SE-93 |

**Institution:** Software Engineering Department, University of Engineering and Technology, Taxila  
**Course:** Artificial Intelligence  
**Instructor:** Dr. Kanwal Yousaf

---

## 📚 References

1. MacNeil et al., "Experiences from using code explanations generated by large language models in a web software development e-book," *SIGCSE 2023*. DOI: [10.1145/3545945.3569785](https://doi.org/10.1145/3545945.3569785)
2. Leinonen et al., "Comparing code explanations created by students and large language models," *ITiCSE 2023*. DOI: [10.1145/3587102.3588785](https://doi.org/10.1145/3587102.3588785)
3. Hosseini et al., "Explaining code examples in introductory programming courses: LLM vs humans," arXiv:2403.05538, 2024.
4. Bhattacharya et al., "Exploring large language models for code explanation," arXiv:2310.16673, 2023.
5. Su et al., "Automatic code summarization via ChatGPT: How far are we?" arXiv:2305.12865, 2023.

---

<p align="center">Made with ❤️ at UET Taxila</p>
