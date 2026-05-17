import dns.resolver
from bson import ObjectId
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8'] # Forces Python to use Google's DNS!

from fastapi import FastAPI, UploadFile, File, HTTPException
# ... (rest of your imports stay the same)
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import shutil
import os

# Import your AI engines
from vision_engine import CloudVisionEngine
from agentic_grader import AgenticGrader
from plagiarism_agent import PlagiarismDetector

app = FastAPI(title="GradeOps API")

# Allow React to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MONGODB SETUP ---
# --- MONGODB SETUP ---
# Paste YOUR actual connection string from MongoDB Atlas below!
client = MongoClient("mongodb+srv://naitikagarwal20054_db_user:gradeops123@cluster0.flsleqk.mongodb.net/?appName=Cluster0")
db = client.gradeops
grades_collection = db.grades
print("🟢 MongoDB Connected Successfully!")

# --- INITIALIZE AI ENGINES ---
vision_ai = CloudVisionEngine()
grader_ai = AgenticGrader()
plagiarism_ai = PlagiarismDetector()

# --- DATA MODELS ---
class GradingRequest(BaseModel):
    student_answer: str
    rubric_data: str 

class PlagiarismRequest(BaseModel):
    student_1_answer: str
    student_2_answer: str

class SaveGradeRequest(BaseModel):
    student_id: str
    total_score: int
    feedback: str
    status: str


# ==========================================
#               API ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "GradeOps API Server is LIVE 🚀"}

@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    """Receives an image, saves it temporarily, and runs OCR via Gemini Vision."""
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        extracted_text = vision_ai.extract_text(temp_file_path)
        os.remove(temp_file_path)
        
        return {"extracted_text": extracted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/grade")
async def grade_answer(request: GradingRequest):
    """Receives extracted text AND the custom rubric, runs the Langchain Grader."""
    try:
        # Overwrite the local rubric file with the TA's custom one from the UI
        with open("rubric.json", "w") as f:
            f.write(request.rubric_data)
            
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

@app.post("/api/save-grade")
async def save_grade(request: SaveGradeRequest):
    """Saves the final grade to MongoDB as a JSON document."""
    try:
        # Changed from model_dump() to dict() to ensure cross-version stability!
        grade_doc = request.dict() 
        grades_collection.insert_one(grade_doc)
        return {"message": "Grade permanently saved to MongoDB!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/grades")
async def get_all_grades():
    """Fetches all saved grades for the Class Roster."""
    try:
        grades = list(grades_collection.find())
        # MongoDB _id is not JSON serializable, convert to string
        for grade in grades:
            grade["_id"] = str(grade["_id"])
        return grades
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/grades/{grade_id}")
async def delete_grade(grade_id: str):
    """Deletes a specific grade from the MongoDB Class Roster."""
    try:
        # MongoDB requires the ID string to be converted to an ObjectId object
        result = grades_collection.delete_one({"_id": ObjectId(grade_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Grade not found.")
            
        return {"message": "Grade deleted successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))