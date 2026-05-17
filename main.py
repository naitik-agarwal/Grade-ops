from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os

# Import your beautiful AI engines
from vision_engine import CloudVisionEngine
from agentic_grader import AgenticGrader
from plagiarism_agent import PlagiarismDetector

app = FastAPI(title="GradeOps API")

# VERY IMPORTANT: This allows your React frontend to talk to this Python backend without security blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the AI Engines once when the server starts
vision_ai = CloudVisionEngine()
grader_ai = AgenticGrader()
plagiarism_ai = PlagiarismDetector()

# --- DATA MODELS FOR INCOMING JSON REQUESTS ---
class GradingRequest(BaseModel):
    student_answer: str
    # For the hackathon, we'll hardcode the rubric path, but in reality, 
    # the frontend would send the rubric ID or JSON directly.

class PlagiarismRequest(BaseModel):
    student_1_answer: str
    student_2_answer: str


# --- THE 3 API ENDPOINTS ---

@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    """Receives an image file from React, saves it temporarily, and runs OCR."""
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        extracted_text = vision_ai.extract_text(temp_file_path)
        
        # Clean up the temp file
        os.remove(temp_file_path)
        
        return {"extracted_text": extracted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/grade")
async def grade_answer(request: GradingRequest):
    """Receives extracted text, runs the Grader, and returns structured JSON."""
    try:
        # Assuming rubric.json is in the main folder
        evaluation = grader_ai.grade_answer("rubric.json", request.student_answer)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-plagiarism")
async def check_plagiarism(request: PlagiarismRequest):
    """Compares two answers and returns the plagiarism report."""
    try:
        report = plagiarism_ai.analyze_papers(request.student_1_answer, request.student_2_answer)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Basic health check endpoint
@app.get("/")
def read_root():
    return {"status": "GradeOps API Server is LIVE 🚀"}