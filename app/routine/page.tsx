'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Calendar, ArrowLeft, Sparkles, Loader2, BookOpen, Clock, CheckCircle, Save, CheckSquare, Square, ArrowRight, Trash2, AlertCircle
} from 'lucide-react'

export default function RoutineWizardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  const [selectedGrade, setSelectedGrade] = useState<string>('10th Grade')
  const [studyGroup, setStudyGroup] = useState<string>('Science')

  const [activeSubjects, setActiveSubjects] = useState<string[]>([])
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [allChapters, setAllChapters] = useState<any[]>([])
  const [allTopics, setAllTopics] = useState<any[]>([])

  const [selectedSubjectNames, setSelectedSubjectNames] = useState<string[]>([])
  const [selectedChapterTitles, setSelectedChapterTitles] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  const [targetDate, setTargetDate] = useState('')
  const [dailyHours, setDailyHours] = useState('4')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [routine, setRoutine] = useState<any[] | null>(null)
  const [routineStartDate, setRoutineStartDate] = useState<string>('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const router = useRouter()

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

    const handleStorageChange = () => {
      applyTheme()
    }
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(applyTheme, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    async function initWizard() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      const currentGrade = profile?.grade || '10th Grade'
      const currentGroup = profile?.study_group || 'Science'
      const currentSubjects = profile?.subjects && profile.subjects.length > 0 
        ? profile.subjects 
        : ['English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology']

      setSelectedGrade(currentGrade)
      setStudyGroup(currentGroup)
      setActiveSubjects(currentSubjects)
      setSelectedSubjectNames(currentSubjects)

      const formattedSubjects = currentSubjects.map((subName: string, idx: number) => ({
        id: idx + 1,
        name: subName
      }))
      setAllSubjects(formattedSubjects)

      const { data: existingRoutine } = await supabase
        .from('study_routines')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existingRoutine && existingRoutine.routine_content) {
        let loadedRoutine = existingRoutine.routine_content

        const savedProgress = sessionStorage.getItem(`routine_progress_${session.user.id}`)
        if (savedProgress) {
          try {
            const parsedProgress = JSON.parse(savedProgress) 
            loadedRoutine = loadedRoutine.map((dayItem: any, dIdx: number) => ({
              ...dayItem,
              slots: dayItem.slots.map((slot: any, sIdx: number) => ({
                ...slot,
                completed: parsedProgress[`${dIdx}-${sIdx}`] !== undefined ? parsedProgress[`${dIdx}-${sIdx}`] : (slot.completed || false)
              }))
            }))
          } catch (e) {
            console.error('Error parsing progress:', e)
          }
        }

        setRoutine(loadedRoutine)
        if (existingRoutine.start_date) {
          setRoutineStartDate(existingRoutine.start_date)
        }
        setStep(4)
      }

      setLoading(false)
    }
    initWizard()
  }, [router])

  const toggleSubject = (subName: string) => {
    setSelectedSubjectNames(prev => 
      prev.includes(subName) ? prev.filter(item => item !== subName) : [...prev, subName]
    )
  }

  const handleNextToChapters = async () => {
    setLoading(true)
    const targetSubs = selectedSubjectNames.length > 0 ? selectedSubjectNames : activeSubjects

    const { data: syllabusData, error } = await supabase
      .from('punjab_board_syllabus')
      .select('subject, chapter_title')
      .eq('class_level', selectedGrade)
      .eq('group_type', studyGroup)
      .in('subject', targetSubs)

    let loadedChapters: any[] = []
    if (!error && syllabusData && syllabusData.length > 0) {
      const seen = new Set()
      syllabusData.forEach((row: any) => {
        const key = `${row.subject}_${row.chapter_title}`
        if (!seen.has(key)) {
          seen.add(key)
          loadedChapters.push({
            id: `${row.subject}-${row.chapter_title}`,
            subject: row.subject,
            title: row.chapter_title
          })
        }
      })
    }

    targetSubs.forEach((subj: string) => {
      const hasChapters = loadedChapters.some(ch => ch.subject === subj)
      if (!hasChapters) {
        loadedChapters.push(
          { id: `${subj}-Chapter 1`, subject: subj, title: `Chapter 1: Introduction to ${subj}` },
          { id: `${subj}-Chapter 2`, subject: subj, title: `Chapter 2: Core Concepts` }
        )
      }
    })

    setAllChapters(loadedChapters)
    setLoading(false)
    setStep(2)
  }

  const toggleChapter = (chapTitle: string) => {
    setSelectedChapterTitles(prev => 
      prev.includes(chapTitle) ? prev.filter(item => item !== chapTitle) : [...prev, chapTitle]
    )
  }

  const handleNextToTopics = async () => {
    setLoading(true)
    const targetChapters = selectedChapterTitles.length > 0 ? selectedChapterTitles : allChapters.map(c => c.title)

    const { data: syllabusData, error } = await supabase
      .from('punjab_board_syllabus')
      .select('chapter_title, topic_title')
      .eq('class_level', selectedGrade)
      .eq('group_type', studyGroup)
      .in('chapter_title', targetChapters)

    let loadedTopics: any[] = []
    if (!error && syllabusData && syllabusData.length > 0) {
      const seen = new Set()
      syllabusData.forEach((row: any) => {
        if (row.topic_title) {
          const key = `${row.chapter_title}_${row.topic_title}`
          if (!seen.has(key)) {
            seen.add(key)
            loadedTopics.push({
              id: `${row.chapter_title}-${row.topic_title}`,
              chapter_title: row.chapter_title,
              title: row.topic_title
            })
          }
        }
      })
    }

    targetChapters.forEach((chTitle: string) => {
      const hasTopics = loadedTopics.some(t => t.chapter_title === chTitle)
      if (!hasTopics) {
        loadedTopics.push(
          { id: `${chTitle}-Topic 1`, chapter_title: chTitle, title: 'Topic 1: Introduction & Definitions' },
          { id: `${chTitle}-Topic 2`, chapter_title: chTitle, title: 'Topic 2: Important Derivations & Numericals' },
          { id: `${chTitle}-Topic 3`, chapter_title: chTitle, title: 'Topic 3: Exercise Questions & Past Papers' }
        )
      }
    })

    setAllTopics(loadedTopics)
    setSelectedTopicIds(loadedTopics.map(t => t.id))
    setLoading(false)
    setStep(3)
  }

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev => 
      prev.includes(topicId) ? prev.filter(item => item !== topicId) : [...prev, topicId]
    )
  }

  const generateFinalRoutine = async () => {
    if (!targetDate || !dailyHours || selectedTopicIds.length === 0) {
      setErrorMessage('Please select Target Date, Daily Hours, and at least one Topic before proceeding!')
      return
    }

    setErrorMessage('')
    const chosenTopicsList = allTopics.filter(t => selectedTopicIds.includes(t.id))

    setGenerating(true)
    setMessage('')

    try {
      const response = await fetch('/api/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: selectedGrade,
          topics: chosenTopicsList,
          dailyHours: dailyHours,
          targetDate: targetDate
        })
      })

      const data = await response.json()
      let finalGeneratedRoutine = null

      if (response.ok && data.routine) {
        finalGeneratedRoutine = data.routine.map((dayItem: any) => ({
          ...dayItem,
          slots: dayItem.slots.map((slot: any) => ({ ...slot, completed: false }))
        }))
      } else {
        throw new Error(data.error || 'Failed to generate AI routine')
      }

      const currentDateStr = new Date().toISOString().split('T')[0]
      setRoutineStartDate(currentDateStr)
      setRoutine(finalGeneratedRoutine)
      setGenerating(false)
      setStep(4)

      if (user && finalGeneratedRoutine) {
        await supabase
          .from('study_routines')
          .upsert({
            user_id: user.id,
            routine_content: finalGeneratedRoutine,
            start_date: currentDateStr,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
      }

    } catch (error) {
      console.error('AI Generation Error, falling back:', error)
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      let topicIndex = 0
      const generated = days.map((day, index) => {
        const daySlots = []
        const slotsCount = parseInt(dailyHours) > 4 ? 3 : 2

        for (let i = 0; i < slotsCount; i++) {
          const topic = chosenTopicsList[topicIndex % chosenTopicsList.length]
          daySlots.push({
            time: i === 0 ? '04:00 PM - 05:30 PM' : i === 1 ? '06:00 PM - 07:30 PM' : '08:00 PM - 09:15 PM',
            task: `AI Optimized: ${topic.title} (${dailyHours}h pacing)`,
            type: 'study',
            completed: false
          })
          topicIndex++
        }

        return { day, dayIndex: index, slots: daySlots }
      })

      const currentDateStr = new Date().toISOString().split('T')[0]
      setRoutineStartDate(currentDateStr)
      setRoutine(generated)
      setGenerating(false)
      setStep(4)

      if (user) {
        await supabase
          .from('study_routines')
          .upsert({
            user_id: user.id,
            routine_content: generated,
            start_date: currentDateStr,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
      }
    }
  }

  const toggleSlotCompletion = (dayIndex: number, slotIndex: number) => {
    if (!routine) return

    const progressMap: any = {}
    const updated = routine.map((dayItem, dIdx) => {
      const updatedSlots = dayItem.slots.map((slot: any, sIdx: number) => {
        let isComp = slot.completed
        if (dIdx === dayIndex && sIdx === slotIndex) {
          isComp = !slot.completed
        }
        if (isComp) {
          progressMap[`${dIdx}-${sIdx}`] = true
        }
        return { ...slot, completed: isComp }
      })
      return { ...dayItem, slots: updatedSlots }
    })

    setRoutine(updated)

    if (user) {
      sessionStorage.setItem(`routine_progress_${user.id}`, JSON.stringify(progressMap))
    }
  }

  const saveRoutineToDatabase = async () => {
    if (!routine || !user) return
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('study_routines')
        .upsert({
          user_id: user.id,
          routine_content: routine,
          start_date: routineStartDate || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (error) {
        console.error('Supabase save error:', error)
        setMessage(`Failed to save: ${error.message || error.hint || JSON.stringify(error)}`)
      } else {
        setMessage('Routine & progress successfully saved to database!')
        setTimeout(() => setMessage(''), 4000)
      }
    } catch (err: any) {
      console.error('Unexpected save error:', err)
      setMessage('An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const resetRoutine = async () => {
    if (confirm('Do you want to reset and create a new routine?')) {
      await supabase.from('study_routines').delete().eq('user_id', user.id)
      if (user) {
        sessionStorage.removeItem(`routine_progress_${user.id}`)
      }
      setRoutine(null)
      setStep(1)
    }
  }

  if (loading && allSubjects.length === 0 && !routine) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#02060c] dark:bg-[#02060c] text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyan-100/60 text-slate-900 dark:bg-[#02060c] dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/[0.15] dark:bg-cyan-500/[0.06] rounded-full blur-[130px] pointer-events-none"></div>

      <header className="w-full border-b border-cyan-500/30 dark:border-cyan-500/15 bg-white/90 dark:bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-[0_4px_25px_rgba(6,182,212,0.15),0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.push('/')}
            className="p-2 bg-cyan-500/15 hover:bg-cyan-500/25 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-400 border border-cyan-500/40 rounded-xl transition-all cursor-pointer shadow-[0_2px_12px_rgba(6,182,212,0.2),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-none"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 to-slate-900 dark:from-cyan-200 dark:to-white">
              Matric AI Routine Portal {step === 4 ? '(Saved Routine)' : `(Step ${step} of 3)`}
            </h1>
            <p className="text-[10px] text-slate-600 dark:text-gray-400">
              {step === 1 && `Active Profile: ${selectedGrade} (${studyGroup}) • Select Subjects`}
              {step === 2 && 'Select Chapters from Punjab Syllabus'}
              {step === 3 && 'Select Topics & Parameters'}
              {step === 4 && 'Your Active Customized Study Routine'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {routine && step === 4 && (
            <button
              onClick={resetRoutine}
              className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl text-xs transition-all cursor-pointer shadow-[0_2px_10px_rgba(239,68,68,0.15)] dark:shadow-none"
            >
              <Trash2 size={14} />
              <span>Create New</span>
            </button>
          )}

          {routine && step === 4 && (
            <button
              onClick={saveRoutineToDatabase}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/30 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Progress'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 z-10 space-y-6 my-auto">
        {step === 1 && (
          <div className="bg-white/95 dark:bg-[#030712]/90 border border-cyan-500/30 dark:border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl space-y-5 shadow-[0_15px_40px_rgba(6,182,212,0.2),0_15px_30px_rgba(0,0,0,0.2)] dark:shadow-2xl">
            <div className="space-y-1">
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Step 1 of 3</span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Your Active Subjects</h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">These are the subjects configured in your student profile for {selectedGrade} ({studyGroup}).</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {allSubjects.map((sub) => {
                const isSelected = selectedSubjectNames.includes(sub.name)
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubject(sub.name)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-950 dark:text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.25),0_4px_12px_rgba(0,0,0,0.1)]' 
                        : 'bg-cyan-50/60 dark:bg-[#02060c] border-cyan-500/30 dark:border-cyan-500/15 text-slate-800 dark:text-gray-300 hover:border-cyan-500/50 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <BookOpen size={18} className={isSelected ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-500 dark:text-gray-500'} />
                      <span className="text-xs font-bold">{sub.name}</span>
                    </div>
                    {isSelected ? <CheckSquare size={18} className="text-cyan-700 dark:text-cyan-400" /> : <Square size={18} className="text-slate-500 dark:text-gray-600" />}
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleNextToChapters}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/30 cursor-pointer flex items-center justify-center space-x-2 mt-4"
            >
              <span>Next: Select Chapters</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/95 dark:bg-[#030712]/90 border border-cyan-500/30 dark:border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl space-y-6 shadow-[0_15px_40px_rgba(6,182,212,0.2),0_15px_30px_rgba(0,0,0,0.2)] dark:shadow-2xl">
            <div className="space-y-1">
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Step 2 of 3</span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Chapters</h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">Loaded from Punjab Syllabus Board database.</p>
            </div>

            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
              {(selectedSubjectNames.length > 0 ? selectedSubjectNames : activeSubjects).map((subjName) => {
                const chaptersForThisSubject = allChapters.filter(ch => ch.subject === subjName)

                if (chaptersForThisSubject.length === 0) return null

                return (
                  <div key={subjName} className="space-y-2.5 bg-cyan-50/60 dark:bg-[#02060c] p-4 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/15 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none">
                    <div className="flex items-center space-x-2 border-b border-cyan-500/30 dark:border-cyan-500/15 pb-2">
                      <BookOpen size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <h3 className="text-xs font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                        {subjName}
                      </h3>
                    </div>

                    <div className="space-y-2 pt-1">
                      {chaptersForThisSubject.map((ch) => {
                        const isSelected = selectedChapterTitles.includes(ch.title)
                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleChapter(ch.title)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-950 dark:text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15),0_2px_8px_rgba(0,0,0,0.08)]' 
                                : 'bg-white/80 dark:bg-[#030712] border-cyan-500/25 dark:border-cyan-500/10 text-slate-800 dark:text-gray-300 hover:border-cyan-500/50 shadow-[0_2px_10px_rgba(6,182,212,0.08),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-none'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-medium">{ch.title}</span>
                            </div>
                            {isSelected ? <CheckSquare size={16} className="text-cyan-700 dark:text-cyan-400" /> : <Square size={16} className="text-slate-500 dark:text-gray-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleNextToTopics}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/30 cursor-pointer flex items-center justify-center space-x-2 mt-4"
            >
              <span>Next: Select Topics & Time</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white/95 dark:bg-[#030712]/90 border border-cyan-500/30 dark:border-cyan-500/20 rounded-3xl p-6 backdrop-blur-xl space-y-6 shadow-[0_15px_40px_rgba(6,182,212,0.2),0_15px_30px_rgba(0,0,0,0.2)] dark:shadow-2xl">
            <div className="space-y-1">
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Step 3 of 3</span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Topics & Schedule Parameters</h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">Topics loaded from Punjab syllabus database.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-2xl text-red-600 dark:text-red-400 text-xs text-center flex items-center justify-center space-x-2">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-cyan-50/60 dark:bg-[#02060c] p-4 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/10 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-800 dark:text-gray-300 font-semibold">Target Completion Date:</label>
                <input 
                  type="date" 
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/90 dark:bg-[#030712] border border-cyan-500/40 dark:border-cyan-500/20 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-800 dark:text-gray-300 font-semibold">Daily Study Hours:</label>
                <select 
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  className="w-full px-3 py-2 bg-white/90 dark:bg-[#030712] border border-cyan-500/40 dark:border-cyan-500/20 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 shadow-[0_2px_10px_rgba(6,182,212,0.1),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-none"
                >
                  <option value="2">2 Hours / Day</option>
                  <option value="4">4 Hours / Day</option>
                  <option value="6">6+ Hours / Day</option>
                </select>
              </div>
            </div>

            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2">
              <label className="text-xs text-cyan-800 dark:text-cyan-300 font-bold uppercase tracking-wide block">Select Topics by Chapters:</label>
              
              {(selectedChapterTitles.length > 0 ? selectedChapterTitles : allChapters.map(c => c.title)).map((chTitle) => {
                const topicsForThisChapter = allTopics.filter(t => t.chapter_title === chTitle)

                if (topicsForThisChapter.length === 0) return null

                return (
                  <div key={chTitle} className="space-y-2.5 bg-cyan-50/60 dark:bg-[#02060c] p-4 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/15 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none">
                    <div className="flex items-center space-x-2 border-b border-cyan-500/30 dark:border-cyan-500/15 pb-2">
                      <BookOpen size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <h3 className="text-xs font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                        {chTitle}
                      </h3>
                    </div>

                    <div className="space-y-2 pt-1">
                      {topicsForThisChapter.map((top) => {
                        const isSelected = selectedTopicIds.includes(top.id)
                        return (
                          <div
                            key={top.id}
                            onClick={() => toggleTopic(top.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-950 dark:text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15),0_2px_8px_rgba(0,0,0,0.08)]' 
                                : 'bg-white/80 dark:bg-[#030712] border-cyan-500/25 dark:border-cyan-500/10 text-slate-800 dark:text-gray-300 hover:border-cyan-500/50 shadow-[0_2px_10px_rgba(6,182,212,0.08),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-none'
                            }`}
                          >
                            <span className="text-xs font-medium">📌 {top.title}</span>
                            {isSelected ? <CheckSquare size={16} className="text-cyan-700 dark:text-cyan-400" /> : <Square size={16} className="text-slate-500 dark:text-gray-600" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={generateFinalRoutine}
              disabled={generating}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/35 cursor-pointer flex items-center justify-center space-x-2 mt-4 disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{generating ? 'Building Custom Routine...' : 'Generate Smart AI Routine Now'}</span>
            </button>
          </div>
        )}

        {step === 4 && routine && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-200 tracking-wide uppercase">Your Saved Custom Routine</h3>
              <span className="text-[11px] text-slate-600 dark:text-gray-400">Checked tasks remain marked even after refreshing or closing</span>
            </div>

            {message && (
              <div className="p-3 bg-cyan-100/90 dark:bg-cyan-950/60 border border-cyan-500/40 rounded-2xl text-cyan-900 dark:text-cyan-300 text-xs text-center flex items-center justify-center space-x-2 shadow-[0_4px_15px_rgba(6,182,212,0.15),0_4px_8px_rgba(0,0,0,0.1)] dark:shadow-none">
                <CheckCircle size={15} />
                <span>{message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routine.map((item, dIdx) => (
                <div 
                  key={dIdx} 
                  className="bg-white/95 dark:bg-[#030712]/90 border border-cyan-500/30 rounded-2xl p-5 space-y-3 shadow-[0_6px_25px_rgba(6,182,212,0.15),0_10px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(6,182,212,0.04)]"
                >
                  <div className="flex items-center justify-between border-b border-cyan-500/25 pb-2">
                    <span className="font-extrabold text-sm flex items-center space-x-2 text-cyan-800 dark:text-cyan-300">
                      <Calendar size={14} />
                      <span>{item.day}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border bg-cyan-500/15 border-cyan-500/30 text-cyan-800 dark:text-cyan-400 shadow-[0_2px_8px_rgba(6,182,212,0.1)]">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {item.slots.map((slot: any, sIdx: number) => {
                      const isCompleted = slot.completed
                      return (
                        <div 
                          key={sIdx} 
                          onClick={() => toggleSlotCompletion(dIdx, sIdx)}
                          className={`border rounded-xl p-3 space-y-1 cursor-pointer transition-all flex items-start justify-between ${
                            isCompleted 
                              ? 'bg-cyan-500/15 border-cyan-400/50 opacity-75 shadow-[0_4px_12px_rgba(6,182,212,0.1),0_4px_8px_rgba(0,0,0,0.08)] dark:shadow-none' 
                              : 'bg-cyan-50/60 dark:bg-[#02060c] border-cyan-500/30 dark:border-cyan-500/10 hover:border-cyan-500/50 shadow-[0_4px_12px_rgba(6,182,212,0.1),0_4px_8px_rgba(0,0,0,0.08)] dark:shadow-none'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                              <Clock size={12} />
                              <span>{slot.time}</span>
                            </div>
                            <p className={`text-xs font-semibold ${isCompleted ? 'text-cyan-950/50 dark:text-cyan-200/60 line-through' : 'text-slate-900 dark:text-gray-200'}`}>
                              {slot.task}
                            </p>
                          </div>
                          
                          <div className="pt-1 text-cyan-700 dark:text-cyan-400 shrink-0">
                            {isCompleted ? <CheckSquare size={18} className="text-cyan-700 dark:text-cyan-400" /> : <Square size={18} className="text-slate-500 dark:text-gray-600" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center py-4 text-[11px] text-slate-600 dark:text-gray-500 border-t border-cyan-500/30 dark:border-cyan-500/10">
        Matric AI Portal &copy; 2026 • 
      </footer>
    </div>
  )
}