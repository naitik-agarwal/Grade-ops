import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  
  const [loadingStep, setLoadingStep] = useState(null) // "extracting", "grading", or null
  const [extractedText, setExtractedText] = useState("")
  const [gradeReport, setGradeReport] = useState(null)
  const [error, setError] = useState(null)

  // 1. Handle Image Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    
    // Reset states
    setExtractedText("")
    setGradeReport(null)
    setError(null)
  }

  // 2. The Core Pipeline: Upload -> Extract -> Grade
  const processExam = async () => {
    if (!file) {
      setError("Please select an image first!")
      return
    }

    try {
      setError(null)
      setLoadingStep("extracting")

      // Step A: Send Image to Vision Engine
      const formData = new FormData()
      formData.append("file", file)

      const extractRes = await axios.post("http://127.0.0.1:8000/api/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      
      const text = extractRes.data.extracted_text
      setExtractedText(text)

      // Step B: Send Text to Agentic Grader
      setLoadingStep("grading")
      
      const gradeRes = await axios.post("http://127.0.0.1:8000/api/grade", {
        student_answer: text
      })
      
      setGradeReport(gradeRes.data)
      setLoadingStep(null)

    } catch (err) {
      console.error(err)
      setError("API Error: " + (err.response?.data?.detail || err.message))
      setLoadingStep(null)
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>🎓 GRADEOPS <span className="badge">TA Portal</span></h1>
      </header>

      <main className="main-content">
        {/* LEFT COLUMN: Upload & Preview */}
        <section className="panel upload-panel">
          <h2>1. Upload Scan</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          
          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Exam Scan" />
            </div>
          )}

          <button 
            className="run-btn" 
            onClick={processExam} 
            disabled={!file || loadingStep !== null}
          >
            {loadingStep === "extracting" ? "📡 Running OCR..." : 
             loadingStep === "grading" ? "🧠 AI is Grading..." : 
             "🚀 Run AI Pipeline"}
          </button>

          {error && <div className="error-box">❌ {error}</div>}
        </section>

        {/* RIGHT COLUMN: AI Results */}
        <section className="panel results-panel">
          <h2>2. AI Evaluation</h2>
          
          {/* OCR Result */}
          <div className="data-box">
            <h3>Extracted Math/Text:</h3>
            <pre>{extractedText || "Awaiting OCR..."}</pre>
          </div>

          {/* Grader Result */}
          {gradeReport && (
            <div className="report-card">
              <div className="score-header">
                <h3>Final AI Score:</h3>
                <span className="score-badge">{gradeReport.total_score} / 5</span>
              </div>
              
              <ul className="step-list">
                {gradeReport.step_grades.map((step, idx) => (
                  <li key={idx} className={step.points_awarded > 0 ? "step-pass" : "step-fail"}>
                    <strong>{step.points_awarded > 0 ? "✅" : "❌"} {step.step_name} ({step.points_awarded} pts)</strong>
                    <p>{step.justification}</p>
                  </li>
                ))}
              </ul>
              
              <div className="feedback-box">
                <strong>TA Feedback: </strong> {gradeReport.general_feedback}
              </div>

              <div className="action-buttons">
                <button className="approve-btn">✅ Approve Grade</button>
                <button className="override-btn">✏️ Override</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App