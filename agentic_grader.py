import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# Load the hidden Gemini key
load_dotenv()

# ---------------------------------------------------------
# 1. THE DATA SCHEMA (What the frontend dashboard will read)
# ---------------------------------------------------------
class StepGrade(BaseModel):
    step_name: str = Field(description="The exact name of the rubric step")
    points_awarded: int = Field(description="Points given for this specific step")
    justification: str = Field(description="Short explanation of why these points were awarded or deducted")

class FinalGrade(BaseModel):
    total_score: int = Field(description="Total points awarded calculated from the steps")
    step_grades: list[StepGrade] = Field(description="Breakdown of grading by each rubric step")
    general_feedback: str = Field(description="One sentence of overall feedback for the student")

# ---------------------------------------------------------
# 2. THE LANGCHAIN AGENT
# ---------------------------------------------------------
class AgenticGrader:
    def __init__(self):
        # We use a low temperature (0.1) so the TA is strict, consistent, and doesn't hallucinate
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.1, 
            api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # We FORCE the LLM to output our exact Pydantic schema
        self.structured_llm = self.llm.with_structured_output(FinalGrade)
        print("🧠 Agentic Grader Initialized. AI TA is ready...\n")

    def grade_answer(self, rubric_path: str, student_answer: str):
        # Load the JSON rubric
        try:
            with open(rubric_path, 'r') as f:
                rubric = json.load(f)
        except FileNotFoundError:
            return "❌ Error: Could not find rubric.json"

        print(f"📖 Reading Rubric: {rubric['question_id']} (Total Possible Points: {rubric['total_points']})")
        print(f"📝 Evaluating Student Answer: '{student_answer}'...")

        # Create the strict prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert Math Teaching Assistant. You are strict, fair, and award partial credit exactly as defined in the rubric. You evaluate the student's logic step-by-step."),
            ("human", "Here is the strict grading rubric:\n{rubric}\n\nHere is the student's extracted answer:\n{student_answer}\n\nGrade the student's answer step-by-step and return the evaluation.")
        ])

        # Build the Langchain pipeline (Prompt -> LLM)
        grading_chain = prompt | self.structured_llm

        # Execute the pipeline
        result = grading_chain.invoke({
            "rubric": json.dumps(rubric, indent=2),
            "student_answer": student_answer
        })

        return result

# ---------------------------------------------------------
# 3. TEST THE BRAIN
# ---------------------------------------------------------
if __name__ == "__main__":
    grader = AgenticGrader()
    
    # This is the fake answer we pretend the Vision Engine extracted
    # (Notice how the student got the 2x right, but messed up the +5)
    mock_extracted_text = "The derivative is f'(x) = 2x + 3"
    
    final_evaluation = grader.grade_answer("rubric.json", mock_extracted_text)
    
    print("\n" + "="*50)
    print("                 AI GRADING REPORT")
    print("="*50)
    print(f"Total Score: {final_evaluation.total_score} / 5\n")
    print("Step-by-Step Breakdown:")
    for step in final_evaluation.step_grades:
        status = "✅" if step.points_awarded > 0 else "❌"
        print(f" {status} {step.step_name}: {step.points_awarded} pts")
        print(f"    Reason: {step.justification}")
    
    print(f"\n💬 TA Feedback: {final_evaluation.general_feedback}")
    print("="*50)