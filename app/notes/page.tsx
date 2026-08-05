'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { BookOpen, Trash2, ArrowLeft, Loader2, Search, Save, Edit3, FolderGit2, Settings } from 'lucide-react'

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

      // Fetch Real Chapters from punjab_board_syllabus table based on user's class and group
      const { data: syllabusData, error: syllabusError } = await supabase
        .from('punjab_board_syllabus')
        .select('subject, chapter_title')
        .eq('class_level', currentClass)
        .eq('group_type', currentGroup)

      const filteredMap: any = {}
      currentSubjects.forEach((subj: string) => {
        filteredMap[subj] = []
      })

      if (!syllabusError && syllabusData) {
        syllabusData.forEach((row: any) => {
          if (filteredMap[row.subject]) {
            if (!filteredMap[row.subject].includes(row.chapter_title)) {
              filteredMap[row.subject].push(row.chapter_title)
            }
          }
        })
      }

      // Fallback if any active subject has no chapters found in DB
      currentSubjects.forEach((subj: string) => {
        if (!filteredMap[subj] || filteredMap[subj].length === 0) {
          filteredMap[subj] = [`Chapter 1: Introduction to ${subj}`, `Chapter 2: Core Concepts`]
        }
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