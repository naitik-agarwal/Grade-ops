import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

# ---------------------------------------------------------
# 1. THE DATA SCHEMA (What the dashboard will flag)
# ---------------------------------------------------------
class PlagiarismReport(BaseModel):
    is_suspicious: bool = Field(description="True if there is high evidence of copying, False otherwise")
    confidence_score: int = Field(description="Confidence percentage from 0 to 100")
    shared_anomalies: list[str] = Field(description="List of specific bizarre mistakes or unique logical leaps both students made")
    verdict_justification: str = Field(description="A short explanation for the professor detailing why this was flagged or cleared")

# ---------------------------------------------------------
# 2. THE DETECTOR AGENT
# ---------------------------------------------------------
class PlagiarismDetector:
    def __init__(self):
        # We use a very low temperature so the AI acts like a strict investigator
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.0, 
            api_key=os.getenv("GEMINI_API_KEY")
        )
        self.structured_llm = self.llm.with_structured_output(PlagiarismReport)
        print("🕵️‍♂️ Plagiarism Agent Initialized. Scanning for anomalies...\n")

    def analyze_papers(self, student_1_answer: str, student_2_answer: str):
        print("🔍 Comparing Student 1 and Student 2 logic structures...")

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an elite Academic Integrity Investigator for a math department.
            Your job is to compare two student answers and detect plagiarism.
            
            CRITICAL RULE: Getting the correct answer using standard methods is NOT plagiarism. 
            However, making the EXACT SAME bizarre mathematical mistake, sharing the same strange 
            formatting, or skipping the exact same required logical steps is highly suspicious.
            
            Analyze the logic structures and flag if you believe they copied each other."""),
            ("human", "Student 1 Answer:\n{student_1}\n\nStudent 2 Answer:\n{student_2}\n\nAnalyze for shared anomalies.")
        ])

        detection_chain = prompt | self.structured_llm

        return detection_chain.invoke({
            "student_1": student_1_answer,
            "student_2": student_2_answer
        })

# ---------------------------------------------------------
# 3. TEST THE DETECTOR
# ---------------------------------------------------------
if __name__ == "__main__":
    detector = PlagiarismDetector()
    
    # Let's test a highly suspicious scenario where both made the same weird mistake
    mock_student_1 = "The derivative of x^2 is 2x. The derivative of 5x is 3. So final is 2x + 3."
    mock_student_2 = "By power rule we get 2x for the first part. For 5x it becomes 3 somehow. Answer = 2x + 3"
    
    report = detector.analyze_papers(mock_student_1, mock_student_2)
    
    print("\n" + "="*50)
    print("             ACADEMIC INTEGRITY REPORT")
    print("="*50)
    
    if report.is_suspicious:
        print("🚨 ALERT: SUSPICIOUS ACTIVITY DETECTED 🚨")
    else:
        print("✅ CLEAR: NO PLAGIARISM DETECTED")
        
    print(f"Confidence: {report.confidence_score}%\n")
    
    print("Shared Logical Anomalies:")
    if not report.shared_anomalies:
        print(" - None")
    for anomaly in report.shared_anomalies:
        print(f" 🚩 {anomaly}")
        
    print(f"\nJustification: {report.verdict_justification}")
    print("="*50)