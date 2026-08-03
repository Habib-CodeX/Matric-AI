'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { BookOpen, Trash2, ArrowLeft, Loader2, Search, Save, Edit3, FolderGit2, Settings } from 'lucide-react'

// Master Database of All Real Matric Chapters per Subject
const masterSubjectsData: Record<string, string[]> = {
  "Physics": [
    "Chapter 1: Physical Quantities and Measurement", "Chapter 2: Kinematics", "Chapter 3: Dynamics", 
    "Chapter 4: Turning Effect of Forces", "Chapter 5: Gravitation", "Chapter 6: Work and Energy", 
    "Chapter 7: Properties of Matter", "Chapter 8: Thermal Properties of Matter", "Chapter 9: Transfer of Heat", 
    "Chapter 10: Simple Harmonic Motion and Waves", "Chapter 11: Sound", "Chapter 12: Geometrical Optics", 
    "Chapter 13: Electrostatics", "Chapter 14: Current Electricity", "Chapter 15: Electromagnetism", 
    "Chapter 16: Basic Electronics", "Chapter 17: Information and Communication Technology", "Chapter 18: Atomic and Nuclear Physics"
  ],
  "Chemistry": [
    "Chapter 1: Fundamentals of Chemistry", "Chapter 2: Structure of Atoms", "Chapter 3: Periodic Table and Periodicity of Properties", 
    "Chapter 4: Structure of Molecules", "Chapter 5: Physical States of Matter", "Chapter 6: Solutions", 
    "Chapter 7: Electrochemistry", "Chapter 8: Chemical Reactivity", "Chapter 9: Chemical Equilibrium", 
    "Chapter 10: Acids, Bases and Salts", "Chapter 11: Organic Chemistry", "Chapter 12: Hydrocarbons", 
    "Chapter 13: Biochemistry", "Chapter 14: Atmosphere", "Chapter 15: Water", "Chapter 16: Chemical Industries"
  ],
  "Mathematics": [
    "Chapter 1: Matrices and Determinants", "Chapter 2: Real and Complex Numbers", "Chapter 3: Logarithms", 
    "Chapter 4: Algebraic Expressions and Formulas", "Chapter 5: Factorization", "Chapter 6: Algebraic Manipulation", 
    "Chapter 7: Linear Equations and Inequalities", "Chapter 8: Linear Graphs", "Chapter 9: Coordinate Geometry", 
    "Chapter 10: Congruent Triangles", "Chapter 11: Parallelograms and Triangles", "Chapter 12: Line & Angle Bisectors", 
    "Chapter 13: Sides and Angles of a Triangle", "Chapter 14: Ratio and Proportion", "Chapter 15: Pythagoras' Theorem", 
    "Chapter 16: Theorems Related to Area", "Chapter 17: Practical Geometry", "Chapter 18: Introduction to Trigonometry"
  ],
  "Biology": [
    "Chapter 1: Introduction to Biology", "Chapter 2: Solving a Biological Problem", "Chapter 3: Biodiversity", 
    "Chapter 4: Cells and Tissues", "Chapter 5: Cell Cycle", "Chapter 6: Enzymes", "Chapter 7: Bioenergetics", 
    "Chapter 8: Nutrition", "Chapter 9: Transport", "Chapter 10: Gaseous Exchange", "Chapter 11: Homeostasis", 
    "Chapter 12: Coordination and Control", "Chapter 13: Support and Movement", "Chapter 14: Reproduction", 
    "Chapter 15: Inheritance", "Chapter 16: Man and His Environment", "Chapter 17: Biotechnology", "Chapter 18: Pharmacology"
  ],
  "Computer Science": [
    "Chapter 1: Introduction to Computer", "Chapter 2: Computer Networks", "Chapter 3: Data Communication", 
    "Chapter 4: Applications of Computer", "Chapter 5: Computer Security and Ethics", "Chapter 6: Web Development (HTML & CSS)", 
    "Chapter 7: Introduction to Programming (C++)", "Chapter 8: Control Structures", "Chapter 9: Arrays and Functions"
  ],
  "General Mathematics": [
    "Chapter 1: Percentage, Ratio and Proportion", "Chapter 2: Zakat, Ushr and Inheritance", "Chapter 3: Business Mathematics", 
    "Chapter 4: Financial Arithmetic", "Chapter 5: Polynomials", "Chapter 6: Factorization and Algebraic Manipulation", 
    "Chapter 7: Linear Equations and Matrices", "Chapter 8: Quadratic Equations", "Chapter 9: Fundamentals of Geometry", 
    "Chapter 10: Deductive Geometry", "Chapter 11: Introduction to Trigonometry", "Chapter 12: Statistics and Probability"
  ],
  "General Science": [
    "Chapter 1: History of Science", "Chapter 2: Environment and Life", "Chapter 3: Biotechnology in Agriculture & Health", 
    "Chapter 4: Human Health and Diseases", "Chapter 5: Population Growth", "Chapter 6: Chemical and Biological Resources", 
    "Chapter 7: Matter and Radiation", "Chapter 8: Energy Sources", "Chapter 9: Space and Universe", "Chapter 10: Electronics and IT"
  ],
  "Islamiyat": [
    "Chapter 1: Quran-e-Majeed (Surah Al-Anfal / Al-Ahzab)", "Chapter 2: Ahadith-e-Nabwi", "Chapter 3: Imaniyat aur Arkan-e-Islam", 
    "Chapter 4: Seerat-un-Nabi (PBUH)", "Chapter 5: Akhlaq-e-Hasana", "Chapter 6: Historical Events & Verses"
  ],
  "Pakistan Studies": [
    "Chapter 1: Ideological Basis of Pakistan", "Chapter 2: Making of Pakistan", "Chapter 3: Land and Environment", 
    "Chapter 4: History of Pakistan P1", "Chapter 5: History of Pakistan P2", "Chapter 6: Economic Development"
  ],
  "English": [
    "Chapter 1: The Saviour of Mankind", "Chapter 2: Patriotism", "Chapter 3: Media and Its Impact", 
    "Chapter 4: Hazrat Asma (R.A)", "Chapter 5: Daffodils", "Chapter 6: The Quaid's Vision and Pakistan", 
    "Chapter 7: Little Things", "Chapter 8: Stopping by Woods", "Chapter 9: All Lives in Harmony", "Chapter 10: First Aid"
  ],
  "Urdu": [
    "Chapter 1: Hamd & Naat", "Chapter 2: Mirza Ghalib k Khutoot", "Chapter 3: Umeed ki Khushi", 
    "Chapter 4: Parwaana-e-Azaadi", "Chapter 5: Nazm", "Chapter 6: Mustaqbil ki Jhalak", "Chapter 7: Ghazliyat"
  ],
  "Civics": [
    "Chapter 1: Introduction to Civics", "Chapter 2: Individual and Society", "Chapter 3: State and Government", 
    "Chapter 4: Fundamental Rights and Duties", "Chapter 5: Public Opinion"
  ],
  "Education": [
    "Chapter 1: Meaning and Scope of Education", "Chapter 2: Islamic Concept of Education", 
    "Chapter 3: Methods of Teaching", "Chapter 4: Curriculum Development"
  ],
  "Economics": [
    "Chapter 1: Introduction to Economics", "Chapter 2: Consumer Behavior", "Chapter 3: Production and Supply", 
    "Chapter 4: National Income", "Chapter 5: Public Finance"
  ]
}

export default function NotesPage() {
  const router = useRouter()
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [userGroup, setUserGroup] = useState('Science')
  const [userClass, setUserClass] = useState('10th Grade')
  const [activeSubjects, setActiveSubjects] = useState<string[]>([])
  const [subjectsData, setSubjectsData] = useState<any>({})
  
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Math, Physics & Chemistry Symbols list
  const scienceSymbols = [
    'α', 'β', 'γ', 'θ', 'π', 'Δ', 'Ω', 'µ', 'σ', 'λ', '°C', '°F', 
    '±', '≈', '≠', '≤', '≥', '×', '÷', '·', '∫', '∑', '√', '∞', 
    'H₂O', 'CO₂', 'O₂', 'NaCl', 'H₂SO₄', 'NH₃', '°', 'P = F/A', 'E = mc²'
  ]

  const insertSymbol = (symbol: string) => {
    setContent((prev) => prev + symbol)
  }

  useEffect(() => {
    // Safe Theme Synchronizer
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    checkTheme()
    window.addEventListener('storage', checkTheme)

    async function initData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setSessionUser(session.user)

      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      let currentGroup = profile?.study_group || 'Science'
      let currentClass = profile?.grade || '10th Grade'
      let currentSubjects = profile?.subjects && profile.subjects.length > 0 
        ? profile.subjects 
        : ['English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology']

      setUserGroup(currentGroup)
      setUserClass(currentClass)
      setActiveSubjects(currentSubjects)

      const filteredMap: any = {}
      currentSubjects.forEach((subj: string) => {
        filteredMap[subj] = masterSubjectsData[subj] || [`Chapter 1: Introduction to ${subj}`, `Chapter 2: Core Concepts`]
      })
      setSubjectsData(filteredMap)

      if (currentSubjects.length > 0) {
        setSubject(currentSubjects[0])
        setChapter(filteredMap[currentSubjects[0]]?.[0] || '')
      }

      const { data: dbNotes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!error && dbNotes) {
        setNotes(dbNotes)
      }

      setLoading(false)
    }

    initData()

    return () => {
      window.removeEventListener('storage', checkTheme)
    }
  }, [router])

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject)
    const availableChapters = subjectsData[newSubject] || []
    setChapter(availableChapters[0] || '')
  }

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !sessionUser) return

    if (editingId) {
      const { error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          subject,
          chapter,
          class_level: userClass,
          group_type: userGroup
        })
        .eq('id', editingId)
        .eq('user_id', sessionUser.id)

      if (!error) {
        setNotes(notes.map(note => 
          note.id === editingId ? { ...note, title, content, subject, chapter } : note
        ))
        setEditingId(null)
      } else {
        alert('Error updating note: ' + error.message)
      }
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: sessionUser.id,
          title,
          content,
          subject,
          chapter,
          class_level: userClass,
          group_type: userGroup
        }])
        .select()

      if (!error && data) {
        setNotes([data[0], ...notes])
      } else if (error) {
        alert('Error saving note: ' + error.message)
      }
    }

    setTitle('')
    setContent('')
  }

  const handleEdit = (note: any) => {
    setEditingId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setSubject(note.subject || Object.keys(subjectsData)[0])
    setChapter(note.chapter || '')
  }

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', sessionUser.id)

    if (!error) {
      setNotes(notes.filter(note => note.id !== id))
    } else {
      alert('Error deleting note: ' + error.message)
    }
  }

  const filteredNotes = notes.filter(note => {
    const isSubjectActive = activeSubjects.includes(note.subject)
    const matchesSearch = 
      (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.subject && note.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (note.chapter && note.chapter.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return isSubjectActive && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#02060c] text-cyan-600 dark:text-cyan-400 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/[0.07] rounded-full blur-[120px] pointer-events-none"></div>

      <header className="w-full border-b border-cyan-500/20 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(6,182,212,0.12)] transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/')}
            className="p-2 bg-white/80 dark:bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-400 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/80 dark:bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-400 shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-sm">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-200 dark:to-white">
                Quick Revision Notes & Books
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Active Profile: <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{userClass} ({userGroup} Group) • {activeSubjects.length} Active Subjects</span>
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push('/settings')}
          className="px-3 py-1.5 bg-white/80 dark:bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-sm"
        >
          <Settings size={14} />
          <span>Change Subjects</span>
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 z-10 flex flex-col gap-6">
        
        <form onSubmit={handleSaveNote} className="bg-white/90 dark:bg-[#030712]/90 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 rounded-3xl p-6 shadow-[0_6px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_25px_rgba(6,182,212,0.15)] space-y-4">
          <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
            <Edit3 size={16} /> {editingId ? 'Edit Database Note' : 'Create Subject Note'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] text-cyan-800 dark:text-cyan-200 font-bold">Select Chosen Subject</label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/40 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-cyan-300 outline-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_10px_rgba(6,182,212,0.06)] font-medium"
              >
                {Object.keys(subjectsData).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-cyan-800 dark:text-cyan-200 font-bold">Select Real Chapter</label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/40 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-cyan-300 outline-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_10px_rgba(6,182,212,0.06)] font-medium"
              >
                {(subjectsData[subject] || []).map((chap: string) => (
                  <option key={chap} value={chap}>{chap}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-cyan-800 dark:text-cyan-200 font-bold">Note Title / Topic</label>
            <input 
              type="text"
              placeholder="e.g., Important Formula or Key Summary..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/40 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none transition-all shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_10px_rgba(6,182,212,0.06)] font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-cyan-800 dark:text-cyan-200 font-bold">Note Content / Description</label>
            <textarea
              rows={3}
              placeholder="Write your revision note, key point or formula breakdown here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white dark:bg-[#02060c] border border-cyan-500/40 focus:border-cyan-500 rounded-xl p-4 text-xs text-slate-900 dark:text-white outline-none transition-all resize-none shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_10px_rgba(6,182,212,0.06)] font-medium"
            ></textarea>
            
            {/* Science Symbols & Formulas Quick Input Bar */}
            <div className="pt-2">
              <p className="text-[10px] text-cyan-700 dark:text-cyan-400 mb-1.5 font-bold">Click to insert formula/symbol:</p>
              <div className="flex flex-wrap gap-1.5 bg-slate-50/80 dark:bg-[#02060c] p-2.5 border border-cyan-500/30 rounded-xl max-h-28 overflow-y-auto shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-colors duration-300">
                {scienceSymbols.map((sym, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => insertSymbol(sym)}
                    className="px-2.5 py-1 bg-white dark:bg-cyan-500/10 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-cyan-900 dark:text-cyan-300 text-xs font-mono transition-all cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setTitle(''); setContent(''); }}
                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-500/10 hover:bg-gray-300 dark:hover:bg-gray-500/20 text-gray-800 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-300 dark:border-gray-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-[0_4px_15px_rgba(6,182,212,0.3)] cursor-pointer flex items-center space-x-2"
            >
              <Save size={15} />
              <span>{editingId ? 'Update Note' : 'Save Note '}</span>
            </button>
          </div>
        </form>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-700 dark:text-cyan-400/80" size={16} />
          <input
            type="text"
            placeholder="Search saved notes across your chosen subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 dark:bg-[#030712]/90 border border-cyan-500/40 focus:border-cyan-500 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white outline-none transition-all shadow-[0_6px_25px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(6,182,212,0.12)] font-medium"
          />
        </div>

        <div className="space-y-8">
          {Object.keys(subjectsData).map((subjName) => {
            const subjNotes = filteredNotes.filter(n => (n.subject || '') === subjName)

            return (
              <div key={subjName} className="space-y-4">
                <div className="flex items-center space-x-3 border-b border-cyan-500/20 pb-2">
                  <div className="p-1.5 bg-white/80 dark:bg-cyan-500/10 rounded-lg text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                    <FolderGit2 size={16} />
                  </div>
                  <h2 className="text-sm font-extrabold text-cyan-900 dark:text-cyan-200 uppercase tracking-wider">
                    {subjName} Section ({subjNotes.length} notes)
                  </h2>
                </div>

                {subjNotes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subjNotes.map((note) => (
                      <div 
                        key={note.id}
                        className="bg-white/90 dark:bg-[#030712]/90 border border-cyan-500/30 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-[0_6px_25px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(6,182,212,0.12)] transition-all duration-300 gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-800 dark:text-cyan-300 font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
                              {note.chapter || 'General Chapter'}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-wide">{note.title}</h4>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{note.content}</p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-cyan-500/15">
                          <button 
                            onClick={() => handleEdit(note)}
                            className="px-3 py-1.5 bg-white/80 dark:bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 rounded-lg text-xs font-bold transition-all cursor-pointer border border-cyan-500/30 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(note.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg transition-all cursor-pointer border border-rose-500/25 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/60 dark:bg-[#030712]/30 border border-cyan-500/20 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-colors duration-300">
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">No notes saved yet for {subjName}. Add one above!</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </main>

      <footer className="w-full text-center py-4 text-[11px] text-gray-500 dark:text-gray-400 border-t border-cyan-500/15 font-medium">
        Matric AI Portal &copy; 2026 • 
      </footer>
    </div>
  )
}