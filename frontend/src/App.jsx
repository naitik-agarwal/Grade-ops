import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  // --- 1. RBAC & NAVIGATION STATE ---
  const [role, setRole] = useState(null) // 'instructor' or 'ta'
  const [activeTab, setActiveTab] = useState('grading')

  // --- 2. GRADING STATE ---
  const [files, setFiles] = useState([])         // <--- Array of files now!
  const [currentFileIndex, setCurrentFileIndex] = useState(0) // Track batch progress
  const [studentName, setStudentName] = useState("")
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loadingStep, setLoadingStep] = useState(null)
  const [extractedText, setExtractedText] = useState("")
  const [gradeReport, setGradeReport] = useState(null)
  const [error, setError] = useState(null)
  
  // Dynamic Rubric
  const [rubricText, setRubricText] = useState(`{
  "question_id": "Q1",
  "total_points": 5,
  "grading_criteria": [
    { "step": "Power Rule on x^2", "points": 2, "condition": "Award 2 points if they apply power rule to x^2 to get 2x." },
    { "step": "Derivative of 5x", "points": 2, "condition": "Award 2 points if they derive 5x as 5." },
    { "step": "Final Answer", "points": 1, "condition": "Award 1 point only if final answer is exactly 2x + 5." }
  ]
}`)

  // --- 3. OVERRIDE STATE ---
  const [isOverriding, setIsOverriding] = useState(false)
  const [manualScore, setManualScore] = useState(0)
  const [manualFeedback, setManualFeedback] = useState("")

  // --- 4. PLAGIARISM STATE ---
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [plagLoading, setPlagLoading] = useState(false)
  const [plagReport, setPlagReport] = useState(null)

  // --- 5. ROSTER STATE (MongoDB) ---
  const [rosterData, setRosterData] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)

  // ==========================================
  //                 EFFECTS
  // ==========================================
  
  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gradeReport || isOverriding) return; 
      
      if (e.key === 'Enter') {
        saveGradeToDB("Approved", gradeReport.total_score, gradeReport.general_feedback)
      }
      if (e.key === ' ') { 
        e.preventDefault()
        triggerOverride()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gradeReport, isOverriding])

  // ==========================================
  //                API HANDLERS
  // ==========================================

  // A. GRADING PIPELINE
  // A. GRADING PIPELINE (BATCH MODE)
  const runBatchPipeline = async () => {
    if (files.length === 0) return setError("No more exams in queue!")
    
    setLoadingStep("extracting")
    setError(null)

    try {
      // 1. Extract (Always process the first file in the current queue)
      const formData = new FormData()
      formData.append("file", files[0])
      const extractRes = await axios.post("http://127.0.0.1:8000/api/extract", formData)
      const text = extractRes.data.extracted_text
      setExtractedText(text)

      // 2. Grade
      setLoadingStep("grading")
      const gradeRes = await axios.post("http://127.0.0.1:8000/api/grade", {
        student_answer: text, 
        rubric_data: rubricText
      })
      
      setGradeReport(gradeRes.data)
      setLoadingStep(null) // <--- THE CRITICAL FIX: This unlocks the UI!

    } catch (err) {
      setError(`Error on file ${files[0].name}: ` + (err.response?.data?.detail || err.message))
      setLoadingStep(null) // Unlock UI on error too
    }
  }

  // B. DATABASE SAVING
  const saveGradeToDB = async (statusLabel, finalScore, finalFeedback) => {
    try {
      await axios.post("http://127.0.0.1:8000/api/save-grade", {
        student_id: studentName.trim() || "Unknown Student", // <-- UPDATED LINE
        total_score: finalScore,
        feedback: finalFeedback,
        status: statusLabel
      })
      alert(`✅ Grade Saved to MongoDB! (${finalScore}/5) - ${statusLabel}`)
      resetForNextExam()
    } catch (err) {
      alert("Failed to save to database. Is the Python backend running?")
    }
  }

  // C. ROSTER FETCHING
  const fetchRoster = async () => {
    try {
      setLoadingRoster(true)
      const res = await axios.get("http://127.0.0.1:8000/api/grades")
      setRosterData(res.data)
      setLoadingRoster(false)
    } catch (err) {
      alert("Failed to fetch database.")
      setLoadingRoster(false)
    }
  }

  // D. PLAGIARISM PIPELINE
  const runPlagiarismCheck = async () => {
    if (!file1 || !file2) return alert("Please upload both student exams!")
    try {
      setPlagLoading(true)
      const fd1 = new FormData(); fd1.append("file", file1);
      const res1 = await axios.post("http://127.0.0.1:8000/api/extract", fd1)
      
      const fd2 = new FormData(); fd2.append("file", file2);
      const res2 = await axios.post("http://127.0.0.1:8000/api/extract", fd2)

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

  // ==========================================
  //               UI HELPERS
  // ==========================================

 const resetForNextExam = () => {
    // Slice off the exam we just finished
    const remainingFiles = files.slice(1)
    setFiles(remainingFiles)
    
    // Clear the board for the next student
    setGradeReport(null); 
    setIsOverriding(false); 
    setStudentName("");
    setExtractedText(""); // Clear old OCR text
    
    if (remainingFiles.length > 0) {
      // Load the next image in the queue
      setPreviewUrl(URL.createObjectURL(remainingFiles[0])) 
    } else {
      // The queue is empty!
      setPreviewUrl(null)
      setCurrentFileIndex(0)
      alert("🎉 All exams in the batch have been graded and saved!")
    }
  }

  const triggerOverride = () => {
    setManualScore(gradeReport.total_score)
    setManualFeedback(gradeReport.general_feedback)
    setIsOverriding(true)
  }

  const saveOverride = () => {
    saveGradeToDB("Overridden", parseInt(manualScore), manualFeedback)
  }


  // ==========================================
  //                  RENDER
  // ==========================================

  // --- LOGIN SCREEN ---
  if (!role) {
    return (
      <div className="login-container" style={{textAlign: 'center', marginTop: '100px'}}>
        <h1>🎓 Welcome to GRADEOPS</h1>
        <p>Select your role to continue:</p>
        <div style={{display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px'}}>
          <button className="run-btn" style={{width: '200px', background: '#e94560'}} onClick={() => setRole('instructor')}>Login as Instructor</button>
          <button className="run-btn" style={{width: '200px', background: '#0f3460'}} onClick={() => setRole('ta')}>Login as TA</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1>🎓 GRADEOPS <span className="badge">{role === 'instructor' ? 'Instructor Portal' : 'TA Dashboard'}</span></h1>
          <p style={{fontSize: '12px', margin: 0, opacity: 0.8}}>Logged in. <a href="#" onClick={()=>setRole(null)} style={{color:'white'}}>Logout</a></p>
        </div>
        <div className="tabs">
          <button className={activeTab === 'grading' ? 'active-tab' : ''} onClick={() => setActiveTab('grading')}>📝 Grade Exam</button>
          
          {/* INSTRUCTORS SEE ROSTER AND PLAGIARISM */}
          {role === 'instructor' && (
             <>
               <button className={activeTab === 'plagiarism' ? 'active-tab' : ''} onClick={() => setActiveTab('plagiarism')}>🕵️‍♂️ Plagiarism Check</button>
               <button className={activeTab === 'roster' ? 'active-tab' : ''} onClick={() => { setActiveTab('roster'); fetchRoster(); }}>🗄️ Class Roster</button>
             </>
          )}
        </div>
      </header>

      {/* --- TAB 1: GRADING --- */}
      {activeTab === 'grading' && (
        <main className="main-content">
          <section className="panel upload-panel">
            {role === 'instructor' ? (
              <>
                <h2>1. Define Rubric</h2>
                <textarea value={rubricText} onChange={(e) => setRubricText(e.target.value)} rows={6} style={{width: '100%', marginBottom: '15px', fontFamily: 'monospace'}}/>
              </>
            ) : (
              <div style={{background: '#eee', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>
                <strong>Current Rubric: </strong> Derivates Q1 (Locked by Instructor)
              </div>
            )}

            <h2>2. Student Details & Batch Upload</h2>
            
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#333'}}>Student Name / ID (For Current Paper):</label>
              <input 
                type="text" 
                placeholder="e.g., STU-9942" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px'}}
              />
            </div>

            {/* NEW: multiple attribute allows highlighting many files! */}
            <input type="file" accept="image/*" multiple onChange={(e) => {
              const selectedFiles = Array.from(e.target.files)
              setFiles(selectedFiles)
              setPreviewUrl(URL.createObjectURL(selectedFiles[0])) // Preview first one
              setGradeReport(null); setIsOverriding(false); setCurrentFileIndex(0);
            }} />
            
            {files.length > 0 && (
              <p style={{background: '#e3f2fd', padding: '10px', borderRadius: '4px'}}>
                📁 {files.length} exams loaded in queue.
              </p>
            )}

            {previewUrl && <img src={previewUrl} alt="Exam Scan" style={{width: '100%', marginTop: '10px', border: '2px solid #ccc', borderRadius: '8px'}}/>}

            <button className="run-btn" onClick={runBatchPipeline} disabled={files.length === 0 || loadingStep !== null}>
              {loadingStep === "extracting" ? `📡 OCR: Exam ${currentFileIndex}/${files.length}...` : 
               loadingStep === "grading" ? `🧠 AI: Grading Exam ${currentFileIndex}/${files.length}...` : 
               `🚀 Run Batch AI Pipeline`}
            </button>
            {error && <div className="error-box">❌ {error}</div>}
          </section>

          <section className="panel results-panel">
            <h2>3. AI Evaluation</h2>
            {gradeReport ? (
              <div className="report-card">
                
                {/* NORMAL VIEW */}
                {!isOverriding ? (
                  <>
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
                    
                    <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                      <button onClick={()=> saveGradeToDB("Approved", gradeReport.total_score, gradeReport.general_feedback)} style={{flex: 1, padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>✅ Approve (Enter)</button>
                      <button onClick={triggerOverride} style={{flex: 1, padding: '10px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>✏️ Override (Space)</button>
                    </div>
                  </>
                ) : (
                  
                  /* OVERRIDE VIEW */
                  <div className="override-mode" style={{border: '2px dashed #ff9800', padding: '15px', borderRadius: '8px', background: '#fff3e0'}}>
                    <h3 style={{color: '#e65100', marginTop: 0}}>⚠️ Manual TA Override Active</h3>
                    <label><strong>Adjust Final Score:</strong></label>
                    <input type="number" value={manualScore} onChange={(e)=>setManualScore(e.target.value)} style={{width: '100%', padding: '10px', marginBottom: '15px', fontSize: '16px'}} />
                    
                    <label><strong>Adjust TA Feedback:</strong></label>
                    <textarea value={manualFeedback} onChange={(e)=>setManualFeedback(e.target.value)} rows={4} style={{width: '100%', padding: '10px', marginBottom: '15px'}} />
                    
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button onClick={saveOverride} style={{flex: 1, padding: '15px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>💾 Save Override & Submit</button>
                      <button onClick={() => setIsOverriding(false)} style={{padding: '15px', background: '#ccc', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                    </div>
                  </div>
                )}
                
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
            <button className="run-btn" onClick={runPlagiarismCheck} disabled={plagLoading} style={{marginTop: '20px'}}>
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

      {/* --- TAB 3: CLASS ROSTER (MongoDB) --- */}
      {activeTab === 'roster' && (
        <main className="main-content" style={{gridTemplateColumns: '1fr'}}>
          <section className="panel">
            <h2>🗄️ Master Class Roster (Live Database)</h2>
            {loadingRoster ? <p>Loading MongoDB...</p> : (
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px'}}>
                <thead>
                  <tr style={{background: '#1a1a2e', color: 'white'}}>
                    <th style={{padding: '10px'}}>Student ID</th>
                    <th style={{padding: '10px'}}>Score</th>
                    <th style={{padding: '10px'}}>Status</th>
                    <th style={{padding: '10px'}}>TA Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterData.length === 0 && <tr><td colSpan="4" style={{padding: '10px'}}>No grades saved yet.</td></tr>}
                  {rosterData.map((grade, index) => (
                    <tr key={grade._id} style={{borderBottom: '1px solid #ccc', background: index % 2 === 0 ? '#f9f9f9' : 'white'}}>
                      <td style={{padding: '10px', fontWeight: 'bold'}}>{grade.student_id}</td>
                      <td style={{padding: '10px'}}><span className="score-badge" style={{fontSize: '14px', padding: '3px 8px'}}>{grade.total_score} / 5</span></td>
                      <td style={{padding: '10px'}}>
                        <span style={{background: grade.status === 'Approved' ? '#e8f5e9' : '#fff3e0', color: grade.status === 'Approved' ? '#2e7d32' : '#e65100', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px'}}>
                          {grade.status}
                        </span>
                      </td>
                      <td style={{padding: '10px', fontSize: '14px', color: '#555'}}>{grade.feedback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App