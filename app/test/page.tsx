'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, Sparkles, CheckCircle2, XCircle, 
  RotateCcw, ArrowRight, Loader2, Clock 
} from 'lucide-react'

export default function RealTestPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [step, setStep] = useState<'config' | 'loading' | 'exam' | 'result'>('config')
  
  // Configuration states
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedChapter, setSelectedChapter] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [errorMessage, setErrorMessage] = useState('')

  // Master syllabus cache & filtered options
  const [syllabusRows, setSyllabusRows] = useState<any[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [availableChapters, setAvailableChapters] = useState<string[]>([])
  const [availableTopics, setAvailableTopics] = useState<string[]>([])

  // Exam states
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<any>({})
  const [timeLeft, setTimeLeft] = useState(300) 
  const [submitting, setSubmitting] = useState(false)
  const [scoreData, setScoreData] = useState<any>(null)

  // Normalize helper
  const normalizeText = (val: any) => String(val || '').trim().toLowerCase()

  const updateChaptersAndTopics = (subjectName: string, rows: any[], studentProfile: any) => {
    const studentGrade = normalizeText(studentProfile?.grade || studentProfile?.class)
    const studentGroup = normalizeText(studentProfile?.group_type || studentProfile?.group || studentProfile?.study_group)

    const filteredRows = rows.filter(r => {
      const rowSubject = normalizeText(r.subject)
      const rowClass = normalizeText(r.grade) 
      const rowGroup = normalizeText(r.group_type) 

      const matchSubject = rowSubject === normalizeText(subjectName)
      const matchClass = !studentGrade || !rowClass || rowClass.includes(studentGrade) || studentGrade.includes(rowClass)
      const matchGroup = !studentGroup || !rowGroup || rowGroup === studentGroup || rowGroup === 'all' || rowGroup.includes('science')

      return matchSubject && matchClass && matchGroup
    })

    const chapters = Array.from(new Set(filteredRows.map(r => r.chapter_title).filter(Boolean)))
    setAvailableChapters(chapters)

    if (chapters.length > 0) {
      const firstChap = chapters[0]
      setSelectedChapter(firstChap)
      
      const chapRow = filteredRows.find(r => normalizeText(r.chapter_title) === normalizeText(firstChap))
      let topics = chapRow?.topics || []
      
      if (typeof topics === 'string') {
        try { topics = JSON.parse(topics) } catch { topics = [topics] }
      } else if (!Array.isArray(topics)) {
        topics = [topics]
      }

      setAvailableTopics(topics)
      setSelectedTopic(topics.length > 0 ? topics[0] : '')
    } else {
      setSelectedChapter('')
      setAvailableTopics([])
      setSelectedTopic('')
    }
  }

  const handleChapterChange = (chapterTitle: string) => {
    setSelectedChapter(chapterTitle)
    const studentGrade = normalizeText(profile?.grade || profile?.class)
    const studentGroup = normalizeText(profile?.group_type || profile?.group || profile?.study_group)

    let filteredRows = syllabusRows.filter(r => {
      const rowSubject = normalizeText(r.subject)
      const rowClass = normalizeText(r.grade)
      const rowGroup = normalizeText(r.group_type)

      const matchSubject = rowSubject === normalizeText(selectedSubject)
      const matchClass = !studentGrade || !rowClass || rowClass.includes(studentGrade) || studentGrade.includes(rowClass)
      const matchGroup = !studentGroup || !rowGroup || rowGroup === studentGroup || rowGroup === 'all' || rowGroup.includes('science')

      return matchSubject && matchClass && matchGroup
    })

    const chapRow = filteredRows.find(r => normalizeText(r.chapter_title) === normalizeText(chapterTitle))
    let topics = chapRow?.topics || []
    
    if (typeof topics === 'string') {
      try { topics = JSON.parse(topics) } catch { topics = [topics] }
    } else if (!Array.isArray(topics)) {
      topics = [topics]
    }

    setAvailableTopics(topics)
    setSelectedTopic(topics.length > 0 ? topics[0] : '')
  }

  // Automatic Theme Synchronizer matching Settings Page
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    const interval = setInterval(() => {
      applyTheme()
    }, 500)

    let profileSubscription: any = null

    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // 1. Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      
      if (profileError || !profileData) {
        setErrorMessage('Failed to load student profile.')
        return
      }

      setProfile(profileData)

      let studentSubjects: string[] = []
      try {
        if (Array.isArray(profileData.subjects)) {
          studentSubjects = profileData.subjects
        } else if (typeof profileData.subjects === 'string') {
          studentSubjects = JSON.parse(profileData.subjects)
        }
      } catch (e) {
        console.error('Error parsing student subjects:', e)
      }

      setAvailableSubjects(studentSubjects)
      if (studentSubjects.length > 0) {
        setSelectedSubject(studentSubjects[0])
      }

      // 2. Fetch real syllabus from real_exam_syllabus table
      const { data: syllabusData, error: syllabusError } = await supabase
        .from('real_exam_syllabus')
        .select('*')

      if (syllabusError) {
        console.error('Error fetching syllabus:', syllabusError)
        setErrorMessage('Failed to load syllabus from database.')
        return
      }

      const rows = syllabusData || []
      setSyllabusRows(rows)

      if (studentSubjects.length > 0) {
        updateChaptersAndTopics(studentSubjects[0], rows, profileData)
      }

      // 3. Real-time subscription setup (Fixed correct order: .channel -> .on -> .subscribe)
      profileSubscription = supabase
        .channel('student-subjects-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'student_profiles',
            filter: `id=eq.${session.user.id}`
          },
          (payload) => {
            const updatedProfile = payload.new
            setProfile(updatedProfile)

            let updatedSubjects: string[] = []
            try {
              if (Array.isArray(updatedProfile.subjects)) {
                updatedSubjects = updatedProfile.subjects
              } else if (typeof updatedProfile.subjects === 'string') {
                updatedSubjects = JSON.parse(updatedProfile.subjects)
              }
            } catch (e) {
              console.error('Error parsing updated subjects:', e)
            }

            setAvailableSubjects(updatedSubjects)

            setSelectedSubject((prev) => {
              if (updatedSubjects.includes(prev)) {
                return prev
              }
              const nextSub = updatedSubjects.length > 0 ? updatedSubjects[0] : ''
              if (nextSub) {
                updateChaptersAndTopics(nextSub, rows, updatedProfile)
              } else {
                setAvailableChapters([])
                setAvailableTopics([])
                setSelectedChapter('')
                setSelectedTopic('')
              }
              return nextSub
            })
          }
        )
        .subscribe()
    }

    loadData()

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription)
      }
    }
  }, [router])

  const handleSubjectChange = (subjectName: string) => {
    setSelectedSubject(subjectName)
    updateChaptersAndTopics(subjectName, syllabusRows, profile)
  }

  useEffect(() => {
    if (step === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearInterval(timer)
    } else if (step === 'exam' && timeLeft === 0) {
      handleSubmitTest()
    }
  }, [step, timeLeft])

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubject || !selectedChapter || !selectedTopic) return

    setStep('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject: selectedSubject, 
          chapter: selectedChapter, 
          topic: selectedTopic, 
          numQuestions,
          grade: profile?.grade || profile?.class || '10th Grade',
          group: profile?.group_type || profile?.group || profile?.study_group || ''
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate test.')

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setTimeLeft(data.questions.length * 60)
        setStep('exam')
      } else {
        throw new Error('No questions received from AI.')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || 'Something went wrong.')
      setStep('config')
    }
  }

  const handleSelectOption = (option: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: option
    })
  }

  const handleSubmitTest = async () => {
    setSubmitting(true)
    let correctCount = 0
    questions.forEach((q, idx) => {
      const userAns = normalizeText(selectedAnswers[idx])
      const correctAns = normalizeText(q.correct_answer)

      if (userAns === correctAns || (q.options && q.options[Number(selectedAnswers[idx])] && normalizeText(q.options[Number(selectedAnswers[idx])]) === correctAns)) {
        correctCount++
      }
    })

    const percentage = Math.round((correctCount / questions.length) * 100)
    const resultObj = { score: correctCount, total: questions.length, percentage }
    setScoreData(resultObj)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('test_history').insert({
          user_id: session.user.id,
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: selectedTopic,
          total_questions: questions.length,
          score: correctCount,
          percentage: percentage,
          answers_json: selectedAnswers
        })
      }
    } catch (e) {
      console.error("Error saving history:", e)
    }

    setSubmitting(false)
    setStep('result')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/[0.07] dark:bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="w-full border-b border-cyan-500/15 bg-white/85 dark:bg-[#030712]/85 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/')}
            className="p-2 bg-white dark:bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-400 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-200 dark:to-white">
                Preparation For Exams ({profile?.grade || profile?.class || 'Matric'} {profile?.group_type || profile?.group || profile?.study_group ? `• ${profile?.group_type || profile?.group || profile?.study_group}` : ''})
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">AI-Powered Chapter & Topic Assessment</p>
            </div>
          </div>
        </div>
        {step === 'exam' && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-500 dark:text-rose-400 text-xs font-bold animate-pulse">
            <Clock size={14} />
            <span>{Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}</span>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 z-10 flex flex-col justify-center">
        {step === 'config' && (
          <div className="bg-white dark:bg-[#030712]/90 border border-cyan-500/25 dark:border-cyan-500/20 rounded-3xl p-8 shadow-xl dark:shadow-[0_0_40px_rgba(6,182,212,0.06)] space-y-6 transition-colors duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Make Your Test</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select your syllabus subject, chapter, and topic to generate exam questions.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 dark:text-rose-400 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cyan-800 dark:text-cyan-300 mb-1.5">Select Subject</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                  required
                >
                  <option value="" disabled>Select a subject</option>
                  {availableSubjects.map((subName) => (
                    <option key={subName} value={subName}>{subName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-800 dark:text-cyan-300 mb-1.5">Select Chapter (From Real Syllabus)</label>
                <select 
                  value={selectedChapter}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                  required
                >
                  <option value="" disabled>Select a chapter</option>
                  {availableChapters.map((chapName) => (
                    <option key={chapName} value={chapName}>{chapName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-800 dark:text-cyan-300 mb-1.5">Select Topic</label>
                <select 
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                  required
                >
                  <option value="" disabled>Select a topic</option>
                  {availableTopics.map((topName) => (
                    <option key={topName} value={topName}>{topName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-800 dark:text-cyan-300 mb-1.5">Number of Questions</label>
                <select 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                >
                  <option value={5}>5 Questions (Quick Check)</option>
                  <option value={10}>10 Questions (Standard Test)</option>
                  <option value={15}>15 Questions (Deep Practice)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center space-x-2 mt-4"
              >
                <span>Generate Exam via AI</span>
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        )}

        {step === 'loading' && (
          <div className="bg-white dark:bg-[#030712]/90 border border-cyan-500/25 dark:border-cyan-500/20 rounded-3xl p-12 text-center shadow-xl dark:shadow-[0_0_40px_rgba(6,182,212,0.06)] space-y-6 transition-colors duration-300">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-ping"></div>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/40 rounded-2xl text-cyan-600 dark:text-cyan-400 relative z-10 shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI is Formulating Questions...</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scanning syllabus for <span className="text-cyan-600 dark:text-cyan-300 font-semibold">{selectedTopic}</span></p>
            </div>
          </div>
        )}

        {step === 'exam' && questions.length > 0 && (
          <div className="bg-white dark:bg-[#030712]/90 border border-cyan-500/25 dark:border-cyan-500/20 rounded-3xl p-8 shadow-xl dark:shadow-[0_0_40px_rgba(6,182,212,0.06)] space-y-6 transition-colors duration-300">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-cyan-500/10 pb-4">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-cyan-600 dark:text-cyan-300 font-semibold">{selectedSubject} • {selectedTopic}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">{questions[currentIndex].question}</h3>

            <div className="space-y-3 pt-2">
              {questions[currentIndex].options.map((option: string) => {
                const isSelected = selectedAnswers[currentIndex] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full p-4 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-md shadow-cyan-500/10' 
                        : 'bg-white dark:bg-[#02060c] border-cyan-500/20 hover:border-cyan-500/40 text-gray-700 dark:text-gray-300 shadow-sm'
                    }`}
                  >
                    <span>{option}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-cyan-500 bg-cyan-500/20' : 'border-gray-400 dark:border-gray-600'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></div>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border border-cyan-500/20 text-slate-900 dark:text-white ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-cyan-500/10 cursor-pointer'}`}
              >
                Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  disabled={!selectedAnswers[currentIndex]}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${selectedAnswers[currentIndex] ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  disabled={submitting || !selectedAnswers[currentIndex]}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'result' && scoreData && (
          <div className="bg-white dark:bg-[#030712]/90 border border-cyan-500/25 dark:border-cyan-500/20 rounded-3xl p-8 text-center shadow-xl dark:shadow-[0_0_40px_rgba(6,182,212,0.06)] space-y-6 transition-colors duration-300">
            <div className="inline-flex p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-600 dark:text-cyan-400 shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Exam Completed!</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Score: <span className="text-cyan-600 dark:text-cyan-300 font-bold text-sm">{scoreData.score}</span> / <span className="font-bold text-sm text-slate-900 dark:text-white">{scoreData.total}</span> ({scoreData.percentage}%)
              </p>
            </div>

            <div className="space-y-3 text-left pt-2 max-h-64 overflow-y-auto pr-2">
              <h4 className="text-xs font-bold text-cyan-700 dark:text-cyan-200 uppercase tracking-wider">Review & Explanations:</h4>
              {questions.map((q, idx) => {
                const userAns = normalizeText(selectedAnswers[idx])
                const correctAns = normalizeText(q.correct_answer)
                const isCorrect = userAns === correctAns

                return (
                  <div key={q.id || idx} className="p-3.5 bg-slate-50 dark:bg-[#02060c] border border-cyan-500/20 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">Q{idx + 1}. {q.question}</span>
                      {isCorrect ? <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0" /> : <XCircle size={16} className="text-rose-500 dark:text-rose-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Your answer: <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>{selectedAnswers[idx] || 'Skipped'}</span></p>
                    {!isCorrect && <p className="text-[11px] text-cyan-600 dark:text-cyan-300">Correct answer: {q.correct_answer}</p>}
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 bg-cyan-500/10 dark:bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/15">💡 <span className="font-semibold text-cyan-800 dark:text-cyan-200">Explanation:</span> {q.explanation}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep('config'); setSelectedAnswers({}); setCurrentIndex(0); }}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-lg shadow-cyan-500/25 cursor-pointer flex items-center justify-center space-x-2"
              >
                <RotateCcw size={15} />
                <span>Take Another Test</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center py-4 text-[11px] text-gray-500 border-t border-cyan-500/10">
        Matric AI &copy; 2026 • Preparation For Exams
      </footer>
    </div>
  )
}