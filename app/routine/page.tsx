'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Calendar, ArrowLeft, Sparkles, Loader2, BookOpen, Clock, CheckCircle, Save, CheckSquare, Square, ArrowRight, Trash2
} from 'lucide-react'

export default function RoutineWizardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  const [selectedGrade, setSelectedGrade] = useState<string>('9th')
  const [studyGroup, setStudyGroup] = useState<'science' | 'arts'>('science')

  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [allChapters, setAllChapters] = useState<any[]>([])
  const [allTopics, setAllTopics] = useState<any[]>([])

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [selectedChapterIds, setSelectedChapterIds] = useState<any[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<any[]>([])

  const [targetDate, setTargetDate] = useState('')
  const [dailyHours, setDailyHours] = useState('4')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [routine, setRoutine] = useState<any[] | null>(null)
  const [routineStartDate, setRoutineStartDate] = useState<string>('')
  const [message, setMessage] = useState('')

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

  const fetchSubjectsByGradeAndGroup = async (grade: string, group: 'science' | 'arts') => {
    setLoading(true)
    const { data: subjectsData, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('grade', grade)

    if (error) console.error('Error fetching subjects:', error.message)

    let rawSubjects = []

    if (subjectsData && subjectsData.length > 0) {
      const filtered = subjectsData.filter(sub => {
        const name = sub.name.toLowerCase()
        if (grade === '9th' || grade === '10th') {
          if (group === 'science') {
            return !['general mathematics', 'general science', 'civics', 'education', 'economics'].includes(name)
          } else {
            return !['physics', 'chemistry', 'biology'].includes(name)
          }
        }
        return true
      })
      rawSubjects = filtered.length > 0 ? filtered : subjectsData
    } else {
      if (grade === '9th' || grade === '10th') {
        if (group === 'science') {
          rawSubjects = [
            { id: grade === '9th' ? 1 : 201, name: 'Mathematics' },
            { id: grade === '9th' ? 2 : 202, name: 'Physics' },
            { id: grade === '9th' ? 3 : 203, name: 'Chemistry' },
            { id: grade === '9th' ? 4 : 204, name: 'Biology' },
            { id: grade === '9th' ? 5 : 205, name: 'English' },
            { id: grade === '9th' ? 6 : 206, name: 'Urdu' },
            { id: grade === '9th' ? 7 : 207, name: 'Islamiyat' },
            { id: grade === '9th' ? 8 : 208, name: 'Computer Science' }
          ]
        } else {
          rawSubjects = [
            { id: grade === '9th' ? 101 : 301, name: 'General Mathematics' },
            { id: grade === '9th' ? 102 : 302, name: 'General Science' },
            { id: grade === '9th' ? 103 : 303, name: 'English' },
            { id: grade === '9th' ? 104 : 304, name: 'Urdu' },
            { id: grade === '9th' ? 105 : 305, name: 'Islamiyat' },
            { id: grade === '9th' ? 106 : 306, name: 'Pakistan Studies' },
            { id: grade === '9th' ? 107 : 307, name: 'Civics' },
            { id: grade === '9th' ? 108 : 308, name: 'Education' },
            { id: grade === '9th' ? 109 : 309, name: 'Economics' }
          ]
        }
      }
    }

    const uniqueSubjects = Array.from(
      new Map(rawSubjects.map(item => [item.name.toLowerCase().trim(), item])).values()
    )

    setAllSubjects(uniqueSubjects)
    setLoading(false)
  }
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade)
    setSelectedSubjectIds([])
    setSelectedChapterIds([])
    setSelectedTopicIds([])
  }

  const handleGroupChange = (group: 'science' | 'arts') => {
    setStudyGroup(group)
    setSelectedSubjectIds([])
    setSelectedChapterIds([])
    setSelectedTopicIds([])
  }

  useEffect(() => {
    if (step === 1) {
      fetchSubjectsByGradeAndGroup(selectedGrade, studyGroup)
    }
  }, [selectedGrade, studyGroup, step])

  const toggleSubject = (id: any) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleNextToChapters = async () => {
    setLoading(true)
    const targetIds = selectedSubjectIds.length > 0 ? selectedSubjectIds : allSubjects.map(s => s.id)
    const { data } = await supabase.from('chapters').select('*').in('subject_id', targetIds)

    let loadedChapters = data && data.length > 0 ? data : []
    
    targetIds.forEach((subId) => {
      const exists = loadedChapters.some(ch => String(ch.subject_id) === String(subId))
      if (!exists) {
        const subObj = allSubjects.find(s => String(s.id) === String(subId))
        const subName = subObj ? subNameCheck(subObj.name) : 'Subject'

        loadedChapters.push(
          { id: Number(String(subId) + '01'), chapter_number: 1, title: `${subName} - Chapter 1: Fundamentals`, subject_id: subId },
          { id: Number(String(subId) + '02'), chapter_number: 2, title: `${subName} - Chapter 2: Core Concepts`, subject_id: subId }
        )
      }
    })

    const formattedChapters = loadedChapters.map(ch => ({
      ...ch,
      title: ch.chapter_name || ch.title
    }))

    setAllChapters(formattedChapters)
    setLoading(false)
    setStep(2)
  }

  const subNameCheck = (name: string) => {
    if (name.toLowerCase().includes('pak')) return 'Pak Studies'
    if (name.toLowerCase().includes('computer')) return 'Computer'
    if (name.toLowerCase().includes('math')) return 'Math'
    if (name.toLowerCase().includes('physics')) return 'Physics'
    if (name.toLowerCase().includes('chemistry')) return 'Chemistry'
    if (name.toLowerCase().includes('biology')) return 'Biology'
    if (name.toLowerCase().includes('english')) return 'English'
    if (name.toLowerCase().includes('urdu')) return 'Urdu'
    if (name.toLowerCase().includes('islamiyat')) return 'Islamiyat'
    return name
  }

  const toggleChapter = (id: any) => {
    setSelectedChapterIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleNextToTopics = async () => {
    setLoading(true)
    const targetChapterIds = selectedChapterIds.length > 0 ? selectedChapterIds : allChapters.map(c => c.id)
    const { data } = await supabase.from('topics').select('*').in('chapter_id', targetChapterIds)

    let loadedTopics = data && data.length > 0 ? data : []
    targetChapterIds.forEach((chId) => {
      const exists = loadedTopics.some(top => String(top.chapter_id) === String(chId))
      if (!exists) {
        loadedTopics.push(
          { id: Number(String(chId) + '1'), title: 'Topic 1: Introduction & Key Definitions', chapter_id: chId },
          { id: Number(String(chId) + '2'), title: 'Topic 2: Important Derivations & Numericals', chapter_id: chId },
          { id: Number(String(chId) + '3'), title: 'Topic 3: Exercise Questions & Past Papers', chapter_id: chId }
        )
      }
    })

    setAllTopics(loadedTopics)
    setLoading(false)
    setStep(3)
  }

  const toggleTopic = (id: any) => {
    setSelectedTopicIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const generateFinalRoutine = async () => {
    const chosenTopicsList = selectedTopicIds.length > 0 
      ? allTopics.filter(t => selectedTopicIds.includes(t.id))
      : allTopics

    if (chosenTopicsList.length === 0) {
      alert('Please select at least one topic!')
      return
    }

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
      if (response.ok && data.routine) {
        const initializedRoutine = data.routine.map((dayItem: any) => ({
          ...dayItem,
          slots: dayItem.slots.map((slot: any) => ({ ...slot, completed: false }))
        }))
        setRoutine(initializedRoutine)
      } else {
        throw new Error(data.error || 'Failed to generate AI routine')
      }

      const currentDateStr = new Date().toISOString().split('T')[0]
      setRoutineStartDate(currentDateStr)
      setGenerating(false)
      setStep(4)
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
    if (!routine) return
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('study_routines')
      .upsert({
        user_id: user.id,
        routine_content: routine,
        start_date: routineStartDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    setSaving(false)
    if (error) {
      setMessage('Failed to save routine.')
    } else {
      setMessage('Routine & progress successfully saved to database!')
      setTimeout(() => setMessage(''), 4000)
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
              {step === 1 && 'Select Grade & Subjects'}
              {step === 2 && 'Select Chapters'}
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
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Select Your Grade & Subjects</h2>
              <p className="text-xs text-slate-600 dark:text-gray-400">Choose whether you are in 9th or 10th grade to load respective books.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleGradeChange('9th')}
                className={`py-3 rounded-2xl font-bold text-xs border transition-all cursor-pointer ${
                  selectedGrade === '9th' 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30' 
                    : 'bg-cyan-50/80 dark:bg-[#02060c] text-slate-800 dark:text-gray-300 border-cyan-500/30 dark:border-cyan-500/15 hover:border-cyan-500/50 shadow-[0_4px_15px_rgba(6,182,212,0.12),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none'
                }`}
              >
                9th Grade Books
              </button>
              <button
                onClick={() => handleGradeChange('10th')}
                className={`py-3 rounded-2xl font-bold text-xs border transition-all cursor-pointer ${
                  selectedGrade === '10th' 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30' 
                    : 'bg-cyan-50/80 dark:bg-[#02060c] text-slate-800 dark:text-gray-300 border-cyan-500/30 dark:border-cyan-500/15 hover:border-cyan-500/50 shadow-[0_4px_15px_rgba(6,182,212,0.12),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none'
                }`}
              >
                10th Grade Books
              </button>
            </div>

            {(selectedGrade === '9th' || selectedGrade === '10th') && (
              <div className="flex items-center justify-center space-x-3 pt-1">
                <button
                  onClick={() => handleGroupChange('science')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    studyGroup === 'science'
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-800 dark:text-cyan-300 shadow-[0_2px_10px_rgba(6,182,212,0.15)]'
                      : 'bg-cyan-50/80 dark:bg-[#02060c] border-cyan-500/30 dark:border-cyan-500/15 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white shadow-[0_4px_12px_rgba(6,182,212,0.1),0_4px_8px_rgba(0,0,0,0.06)] dark:shadow-none'
                  }`}
                >
                  Science Group
                </button>
                <button
                  onClick={() => handleGroupChange('arts')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    studyGroup === 'arts'
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-800 dark:text-cyan-300 shadow-[0_2px_10px_rgba(6,182,212,0.15)]'
                      : 'bg-cyan-50/80 dark:bg-[#02060c] border-cyan-500/30 dark:border-cyan-500/15 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white shadow-[0_4px_12px_rgba(6,182,212,0.1),0_4px_8px_rgba(0,0,0,0.06)] dark:shadow-none'
                  }`}
                >
                  Arts / Humanities Group
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {allSubjects.map((sub) => {
                const isSelected = selectedSubjectIds.includes(sub.id)
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSubject(sub.id)}
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
              <p className="text-xs text-slate-600 dark:text-gray-400">Chapters are grouped by your selected books. Check the ones you want to study.</p>
            </div>

            <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
              {(selectedSubjectIds.length > 0 ? selectedSubjectIds : allSubjects.map(s => s.id)).map((subId) => {
                const subjectObj = allSubjects.find(s => String(s.id) === String(subId))
                const chaptersForThisSubject = allChapters.filter(ch => String(ch.subject_id) === String(subId))

                if (chaptersForThisSubject.length === 0) return null

                return (
                  <div key={subId} className="space-y-2.5 bg-cyan-50/60 dark:bg-[#02060c] p-4 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/15 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none">
                    <div className="flex items-center space-x-2 border-b border-cyan-500/30 dark:border-cyan-500/15 pb-2">
                      <BookOpen size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <h3 className="text-xs font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                        {subjectObj ? subjectObj.name : 'Subject'}
                      </h3>
                    </div>

                    <div className="space-y-2 pt-1">
                      {chaptersForThisSubject.map((ch) => {
                        const isSelected = selectedChapterIds.includes(ch.id)
                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleChapter(ch.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-950 dark:text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15),0_2px_8px_rgba(0,0,0,0.08)]' 
                                : 'bg-white/80 dark:bg-[#030712] border-cyan-500/25 dark:border-cyan-500/10 text-slate-800 dark:text-gray-300 hover:border-cyan-500/50 shadow-[0_2px_10px_rgba(6,182,212,0.08),0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-none'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">Ch {ch.chapter_number || '•'}:</span>
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
              <p className="text-xs text-slate-600 dark:text-gray-400">Topics are grouped by your selected chapters. Check the ones you want to focus on.</p>
            </div>

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
              
              {(selectedChapterIds.length > 0 ? selectedChapterIds : allChapters.map(c => c.id)).map((chId) => {
                const chapterObj = allChapters.find(c => String(c.id) === String(chId))
                const topicsForThisChapter = allTopics.filter(t => String(t.chapter_id) === String(chId))

                if (topicsForThisChapter.length === 0) return null

                return (
                  <div key={chId} className="space-y-2.5 bg-cyan-50/60 dark:bg-[#02060c] p-4 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/15 shadow-[0_4px_15px_rgba(6,182,212,0.1),0_4px_10px_rgba(0,0,0,0.08)] dark:shadow-none">
                    <div className="flex items-center space-x-2 border-b border-cyan-500/30 dark:border-cyan-500/15 pb-2">
                      <BookOpen size={16} className="text-cyan-700 dark:text-cyan-400" />
                      <h3 className="text-xs font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">
                        {chapterObj ? `Ch ${chapterObj.chapter_number || ''}: ${chapterObj.title}` : 'Chapter'}
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