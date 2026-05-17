import { useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('grading') // 'grading' or 'plagiarism'

  // --- GRADING STATE ---
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loadingStep, setLoadingStep] = useState(null)
  const [extractedText, setExtractedText] = useState("")
  const [gradeReport, setGradeReport] = useState(null)
  const [error, setError] = useState(null)
  
  // Default Rubric loaded into the text area
  const [rubricText, setRubricText] = useState(`{
  "question_id": "Q1",
  "total_points": 5,
  "grading_criteria": [
    { "step": "Power Rule on x^2", "points": 2, "condition": "Award 2 points if they apply power rule to x^2 to get 2x." },
    { "step": "Derivative of 5x", "points": 2, "condition": "Award 2 points if they derive 5x as 5." },
    { "step": "Final Answer", "points": 1, "condition": "Award 1 point only if final answer is exactly 2x + 5." }
  ]
}`)

  // --- PLAGIARISM STATE ---
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [plagLoading, setPlagLoading] = useState(false)
  const [plagReport, setPlagReport] = useState(null)

  // --- HANDLERS ---
  const processExam = async () => {
    if (!file) return setError("Please select an image first!")
    try {
      setError(null)
      setLoadingStep("extracting")

      // 1. Extract
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await axios.post("http://127.0.0.1:8000/api/extract", formData)
      const text = extractRes.data.extracted_text
      setExtractedText(text)

      // 2. Grade (Passing the custom rubric!)
      setLoadingStep("grading")
      const gradeRes = await axios.post("http://127.0.0.1:8000/api/grade", {
        student_answer: text,
        rubric_data: rubricText // Passes the text box data to Python!
      })
      
      setGradeReport(gradeRes.data)
      setLoadingStep(null)
    } catch (err) {
      setError("API Error: " + (err.response?.data?.detail || err.message))
      setLoadingStep(null)
    }
  }

  const runPlagiarismCheck = async () => {
    if (!file1 || !file2) return alert("Please upload both student exams!")
    try {
      setPlagLoading(true)
      
      // Extract File 1
      const fd1 = new FormData(); fd1.append("file", file1);
      const res1 = await axios.post("http://127.0.0.1:8000/api/extract", fd1)
      
      // Extract File 2
      const fd2 = new FormData(); fd2.append("file", file2);
      const res2 = await axios.post("http://127.0.0.1:8000/api/extract", fd2)

      // Compare them
      const plagRes = await axios.post("http://127.0.0.1:8000/api/check-plagiarism", {
        student_1_answer: res1.data.extracted_text,
        student_2_answer: res2.data.extracted_text
      })

      setPlagReport(plagRes.data)
      setPlagLoading(false)
    } catch (err) {
      alert("Error running check. Make sure server is on.")
      setPlagLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>🎓 GRADEOPS <span className="badge">TA Portal</span></h1>
        <div className="tabs">
          <button className={activeTab === 'grading' ? 'active-tab' : ''} onClick={() => setActiveTab('grading')}>📝 Grade Exam</button>
          <button className={activeTab === 'plagiarism' ? 'active-tab' : ''} onClick={() => setActiveTab('plagiarism')}>🕵️‍♂️ Plagiarism Check</button>
        </div>
      </header>

      {/* --- TAB 1: GRADING --- */}
      {activeTab === 'grading' && (
        <main className="main-content">
          <section className="panel upload-panel">
            <h2>1. Define Rubric (Dynamic)</h2>
            <textarea 
              value={rubricText} 
              onChange={(e) => setRubricText(e.target.value)}
              rows={8} 
              style={{width: '100%', marginBottom: '15px', fontFamily: 'monospace'}}
            />

            <h2>2. Upload Scan</h2>
            <input type="file" accept="image/*" onChange={(e) => {
              setFile(e.target.files[0])
              setPreviewUrl(URL.createObjectURL(e.target.files[0]))
              setGradeReport(null)
            }} />
            
            {previewUrl && <img src={previewUrl} alt="Exam Scan" style={{width: '100%', marginTop: '10px'}}/>}

            <button className="run-btn" onClick={processExam} disabled={!file || loadingStep !== null}>
              {loadingStep === "extracting" ? "📡 Running OCR..." : loadingStep === "grading" ? "🧠 AI is Grading..." : "🚀 Run AI Pipeline"}
            </button>
            {error && <div className="error-box">❌ {error}</div>}
          </section>

          <section className="panel results-panel">
            <h2>3. AI Evaluation</h2>
            {gradeReport ? (
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
                <div className="feedback-box"><strong>TA Feedback: </strong> {gradeReport.general_feedback}</div>
              </div>
            ) : (
              <div className="data-box"><pre>{extractedText || "Awaiting OCR..."}</pre></div>
            )}
          </section>
        </main>
      )}

      {/* --- TAB 2: PLAGIARISM --- */}
      {activeTab === 'plagiarism' && (
        <main className="main-content">
          <section className="panel upload-panel">
            <h2>Compare Two Exams</h2>
            <div style={{marginBottom: '15px'}}>
              <strong>Student 1: </strong>
              <input type="file" onChange={(e) => setFile1(e.target.files[0])} />
            </div>
            <div>
              <strong>Student 2: </strong>
              <input type="file" onChange={(e) => setFile2(e.target.files[0])} />
            </div>
            <button className="run-btn" onClick={runPlagiarismCheck} disabled={plagLoading}>
              {plagLoading ? "🕵️‍♂️ Scanning for Logic Anomalies..." : "🔍 Run Integrity Check"}
            </button>
          </section>

          <section className="panel results-panel">
            <h2>Integrity Report</h2>
            {plagReport ? (
              <div className="report-card" style={{ borderLeft: `5px solid ${plagReport.is_suspicious ? '#f44336' : '#4caf50'}`}}>
                <h3 style={{color: plagReport.is_suspicious ? '#d32f2f' : '#2e7d32'}}>
                  {plagReport.is_suspicious ? "🚨 SUSPICIOUS ACTIVITY DETECTED" : "✅ NO PLAGIARISM DETECTED"}
                </h3>
                <p><strong>Confidence:</strong> {plagReport.confidence_score}%</p>
                
                <h4>Shared Anomalies:</h4>
                <ul>
                  {plagReport.shared_anomalies.map((anom, i) => <li key={i}>🚩 {anom}</li>)}
                  {plagReport.shared_anomalies.length === 0 && <li>None detected.</li>}
                </ul>
                
                <div className="feedback-box"><strong>Verdict: </strong> {plagReport.verdict_justification}</div>
              </div>
            ) : <p>Upload two exams to detect shared logical errors.</p>}
          </section>
        </main>
      )}
    </div>
  )
}

export default App