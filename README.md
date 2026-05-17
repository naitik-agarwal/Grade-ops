# 🎓 GradeOps: Agentic AI Grading & Integrity Platform

**GradeOps** is a Human-in-the-Loop (HITL) grading platform designed to eliminate the bottleneck of manual exam grading while preserving academic integrity. Powered by Vision-Language Models (VLMs) and Agentic LLMs, GradeOps reads handwritten exams, grades them against granular instructor rubrics, and detects logic-based plagiarism.

## 🚀 Features

- **🧠 Agentic Multi-Question Grading:** Processes entire handwritten exams (batch uploads) and grades them step-by-step using strict, instructor-defined JSON rubrics.
- **🕵️‍♂️ Logical Plagiarism Detection:** Compares exams to find verbatim text matches and, more importantly, shared anomalous logic errors that indicate copying.
- **✏️ Human-in-the-Loop (HITL) Overrides:** TAs can rapidly approve AI grades or manually override scores and feedback before saving to the database.
- **🗄️ Master Class Roster:** Live MongoDB Atlas integration stores all processed grades, feedback, and student IDs in a secure cloud database.
- **🔐 Role-Based Access Control (RBAC):** Distinct dashboards for Instructors (Rubric creation, Plagiarism tools, Roster view) and Teaching Assistants (Rapid grading pipeline).

## 💻 Tech Stack

- **Frontend:** React (Vite), Axios, Custom CSS (Responsive SaaS UI)
- **Backend:** Python, FastAPI, Uvicorn
- **Database:** MongoDB Atlas (Cloud)
- **AI & Machine Learning:** \* Google Gemini 2.5 Flash (Vision OCR & Core LLM)
  - LangChain (Agentic orchestration & Pydantic Structured Outputs)

## 🛠️ Local Setup Instructions

### 1. Backend (FastAPI)

\`\`\`bash

# Navigate to project directory

cd GRADEOPS

# Create and activate virtual environment

python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# Install dependencies

pip install -r requirements.txt

# Create a .env file and add your Google Gemini API Key

echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the server

uvicorn main:app --reload
\`\`\`

### 2. Frontend (React)

\`\`\`bash

# Open a new terminal and navigate to frontend

cd GRADEOPS/frontend

# Install dependencies

npm install

# Start the dev server

npm run dev
\`\`\`

## 🏆 Hackathon Notes

- **Speed & Scale:** Designed for high-throughput TA workflows with keyboard shortcuts (`Enter` to Approve, `Space` to Override).
- **Robust Output:** By forcing the LLM through LangChain's Structured Outputs, we guarantee exact JSON schemas, preventing UI crashes.
