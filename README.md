# GradeOps · Agentic AI Grading & Academic Integrity Platform

> **Human-in-the-Loop exam grading powered by Vision-Language Models, Agentic LLMs, and a high-throughput TA review dashboard.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Manual grading of handwritten exams is slow, inconsistent, and prone to fatigue-induced bias. **GradeOps** solves this with a three-stage pipeline:

1. **Extract** — OCR/Vision models (Google Gemini 2.5 Flash) transcribe handwritten student answers from bulk PDF scans.
2. **Grade** — An Agentic LLM evaluates each answer against instructor-defined JSON rubrics, awarding partial credit with structured textual justifications.
3. **Review** — A high-throughput dashboard surfaces AI-proposed grades to TAs, who approve or override with a single keystroke.

The result: consistent, auditable grades at scale — with a human always in the loop.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GradeOps Platform                        │
│                                                                 │
│  ┌──────────────┐    REST/JSON    ┌──────────────────────────┐  │
│  │  React (Vite)│◄──────────────►│    FastAPI Backend        │  │
│  │  Frontend    │                │                          │  │
│  │              │                │  ┌────────────────────┐  │  │
│  │  Instructor  │                │  │  Grading Agent     │  │  │
│  │  Dashboard   │                │  │  (LangChain)       │  │  │
│  │              │                │  └────────┬───────────┘  │  │
│  │  TA Review   │                │           │              │  │
│  │  Dashboard   │                │  ┌────────▼───────────┐  │  │
│  └──────────────┘                │  │  Gemini 2.5 Flash  │  │  │
│                                  │  │  (OCR + Grading)   │  │  │
│                                  │  └────────────────────┘  │  │
│                                  │           │              │  │
│                                  │  ┌────────▼───────────┐  │  │
│                                  │  │   MongoDB Atlas     │  │  │
│                                  │  │   (Grades, Roster)  │  │  │
│                                  │  └────────────────────┘  │  │
│                                  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 🧠 Agentic Multi-Question Grading
Processes entire handwritten exam PDFs in batch. The LangChain agent decomposes each paper question-by-question, evaluates answers against strict JSON rubrics, and awards partial credit with justifications — all in a single pipeline run.

### 👁️ Vision-Language OCR
Google Gemini 2.5 Flash extracts and transcribes messy handwritten answers from scanned PDFs, handling varied handwriting styles, crossed-out text, and multi-page answer sheets.

### 🕵️ Logic-Based Plagiarism Detection
Compares submissions not only for verbatim text matches, but for shared *anomalous logic structures* — the same wrong reasoning pattern appearing across papers, which is a strong indicator of copying.

### ✏️ Human-in-the-Loop (HITL) Review Dashboard
A side-by-side view of the cropped student answer image and the AI-proposed grade. TAs can approve, override score, or edit feedback before committing to the database — with full keyboard shortcut support for rapid throughput.

### 🗄️ Live Class Roster
MongoDB Atlas stores all finalized grades, structured feedback, and student IDs. The Instructor dashboard provides a real-time roster view with export capability.

### 🔐 Role-Based Access Control (RBAC)
| Role | Capabilities |
|---|---|
| **Instructor** | Upload exams, define rubrics, view full roster, run plagiarism analysis |
| **Teaching Assistant** | Access grading review queue, approve/override AI grades |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Axios, Custom CSS |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Database** | MongoDB Atlas |
| **AI / Vision** | Google Gemini 2.5 Flash |
| **Agentic Orchestration** | LangChain (Structured Outputs via Pydantic) |
| **OCR Models (alt.)** | Hugging Face Nougat / Qwen-VL |

---

## Project Structure

```
GRADEOPS/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── exams.py             # Exam upload & processing endpoints
│   │   ├── grading.py           # Grading pipeline endpoints
│   │   ├── plagiarism.py        # Plagiarism detection endpoints
│   │   └── roster.py            # Class roster CRUD
│   ├── agents/
│   │   ├── grading_agent.py     # LangChain agentic grader
│   │   └── plagiarism_agent.py  # Logic similarity checker
│   ├── models/
│   │   ├── rubric.py            # Pydantic rubric schema
│   │   └── grade.py             # Pydantic grade output schema
│   └── services/
│       ├── ocr_service.py       # Gemini Vision OCR wrapper
│       └── db_service.py        # MongoDB Atlas client
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InstructorDashboard.jsx
│   │   │   ├── TADashboard.jsx
│   │   │   └── RosterView.jsx
│   │   ├── components/
│   │   │   ├── GradeReviewCard.jsx
│   │   │   ├── RubricEditor.jsx
│   │   │   └── PlagiarismReport.jsx
│   │   └── api/
│   │       └── client.js        # Axios instance & API helpers
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Prerequisites

- **Python** 3.11 or higher
- **Node.js** 18 or higher
- **MongoDB Atlas** account (free tier works)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gradeops.git
cd gradeops
```

### 2. Backend (FastAPI)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Copy the example env file and fill in your credentials
cp .env.example .env

# Start the development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend (React + Vite)

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the `backend/` directory using `.env.example` as a template:

```env
# AI
GEMINI_API_KEY=your_google_gemini_api_key_here

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gradeops
MONGODB_DB_NAME=gradeops

# Auth
SECRET_KEY=your_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=480

# App
ENVIRONMENT=development        # development | production
ALLOWED_ORIGINS=http://localhost:5173
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## API Reference

Full interactive documentation is available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/exams/upload` | Upload bulk exam PDF scans | Instructor |
| `POST` | `/api/rubrics` | Create or update a grading rubric | Instructor |
| `POST` | `/api/grading/run` | Trigger the full agentic grading pipeline | Instructor |
| `GET` | `/api/grading/queue` | Fetch pending AI-graded papers for TA review | TA |
| `PATCH` | `/api/grading/{id}/approve` | Approve an AI-proposed grade | TA |
| `PATCH` | `/api/grading/{id}/override` | Submit a manual grade override | TA |
| `GET` | `/api/roster` | Retrieve the full class grade roster | Instructor |
| `POST` | `/api/plagiarism/scan` | Run plagiarism detection on a submission set | Instructor |

---

## Roles & Permissions

GradeOps uses JWT-based authentication with two distinct roles:

- **`INSTRUCTOR`** — Full platform access: exam upload, rubric management, roster view, plagiarism tools, and pipeline controls.
- **`TA`** — Scoped to the HITL review queue: view AI grades, approve, or override. Cannot access rubric definitions or raw roster data.

---

## Keyboard Shortcuts

The TA review dashboard is optimized for high-throughput grading workflows:

| Key | Action |
|---|---|
| `Enter` | Approve AI-proposed grade and advance |
| `Space` | Open override panel |
| `←` / `→` | Navigate between submissions |
| `Esc` | Cancel override and return to card |

---

## Contributing

Contributions are welcome. Please follow this workflow:

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes with clear, atomic commits.
3. Ensure the backend passes linting: `ruff check .` and `mypy .`
4. Open a pull request against `main` with a description of what changed and why.

For significant changes, please open an issue first to discuss the approach.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ☕ by <strong>Abhinav Rai</strong> &nbsp;·&nbsp; <a href="mailto:contact@example.com">Contact</a></p>
