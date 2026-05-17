import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List

# --- 1. NEW NESTED DATA STRUCTURES ---
class StepGrade(BaseModel):
    step_name: str = Field(description="Name of the rubric step")
    points_awarded: int = Field(description="Points given for this step")
    justification: str = Field(description="Why points were given or lost")

class QuestionGrade(BaseModel):
    question_id: str = Field(description="e.g., Q1, Q2")
    score: int = Field(description="Total points awarded for this specific question")
    max_points: int = Field(description="Maximum possible points for this question")
    feedback: str = Field(description="Feedback for this specific question")
    step_grades: List[StepGrade] = Field(description="Breakdown of points per step")

class FullExamReport(BaseModel):
    total_exam_score: int = Field(description="Sum of all question scores")
    max_exam_points: int = Field(description="Sum of all max points")
    questions: List[QuestionGrade] = Field(description="List of all graded questions")
    general_feedback: str = Field(description="Overall feedback for the student's entire exam")

# --- 2. AGENT DEFINITION ---
class AgenticGrader:
    def __init__(self):
        # Initialize Gemini 2.5 Flash
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.1,
            api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # Bind the new Full Exam schema
        self.structured_llm = self.llm.with_structured_output(FullExamReport)

        # Update the Prompt to handle multiple questions
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Professor grading an entire handwritten exam.
            You will be given a JSON array of rubrics (one for each question) and the raw extracted text from a student's exam.
            
            YOUR TASKS:
            1. Analyze the student's text and identify which parts correspond to which question in the rubric.
            2. Grade EVERY question individually based strictly on its specific rubric criteria.
            3. Calculate the total exam score and max possible points.
            4. Be lenient with spelling/grammar if the core concept or math logic is correct.
            5. If a question is entirely missing from the student's text, give it a 0.
            
            Rubric Data:
            {rubric_data}
            """),
            ("human", "Student Exam Text:\n{student_answer}\n\nGrade the entire exam and return the structured report.")
        ])

    def grade_answer(self, rubric_file_path: str, student_answer: str):
        """Reads the multi-question rubric and grades the full exam."""
        try:
            with open(rubric_file_path, "r") as f:
                rubric_data = f.read()
        except Exception as e:
            rubric_data = "Error loading rubric."

        chain = self.prompt | self.structured_llm
        result = chain.invoke({"rubric_data": rubric_data, "student_answer": student_answer})
        
        return result.dict()