'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, Sparkles, Settings, LogOut, 
  ArrowRight, Loader2, MessageSquare, BookMarked, Calendar, X, Calculator, Sun, Moon
} from 'lucide-react'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showImageModal, setShowImageModal] = useState(false)
  
  // Initialize theme state from localStorage, defaulting to true (dark) if not set
  const [isDarkMode, setIsDarkMode] = useState(true)
  
  const router = useRouter()

  useEffect(() => {
    // Check initial theme from localStorage or DOM and sync state
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme ? savedTheme === 'dark' : document.documentElement.classList.contains('dark')
    
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        const { data } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (data && data.grade && data.subjects) {
          setProfile(data)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#02060c] text-cyan-600 dark:text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const needsOnboarding = !profile || !profile?.grade || !profile?.subjects

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col transition-colors duration-300">
      
      {/* Background Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/[0.07] rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-600/[0.05] rounded-full blur-[100px] pointer-events-none"></div>

      {/* Fullscreen Image Zoom Modal Popup */}
      {showImageModal && profile?.avatar_url && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-lg w-full bg-white/95 dark:bg-[#030712]/95 border border-cyan-500/30 rounded-3xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25),0_6px_20px_rgba(6,182,212,0.1)] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-full transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15),0_2px_10px_rgba(6,182,212,0.05)]"
            >
              <X size={20} />
            </button>
            <h3 className="text-sm font-bold text-cyan-800 dark:text-cyan-200 mb-4 tracking-wide">Profile Image Preview</h3>
            <img 
              src={profile.avatar_url} 
              alt="Profile Zoomed" 
              className="w-full max-h-[70vh] object-contain rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.2),0_8px_30px_rgba(0,0,0,0.1)] border border-cyan-500/30" 
            />
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="w-full border-b border-cyan-500/25 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)] transition-colors duration-300">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/35 rounded-xl text-cyan-600 dark:text-cyan-400 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.1)]">
            <BookOpen size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-200 dark:to-white">
              Matric AI 
          </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Your Smart Study Companion</p>
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0">
          {profile && !needsOnboarding && (
            <div className="flex items-center space-x-2.5 px-3.5 py-1.5 bg-cyan-50/90 dark:bg-cyan-950/70 border border-cyan-500/35 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.08)]">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  onClick={() => setShowImageModal(true)}
                  className="w-7 h-7 rounded-full object-cover border-2 border-cyan-400 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.15)] cursor-pointer hover:opacity-90 transition-opacity" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.15)]">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-xs sm:text-sm text-cyan-900 dark:text-cyan-100 tracking-wide max-w-[100px] sm:max-w-[140px] truncate">{profile.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-xl transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08),0_2px_10px_rgba(6,182,212,0.05)]"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {profile && !needsOnboarding && (
            <button
              onClick={() => router.push('/settings')}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08),0_2px_10px_rgba(6,182,212,0.05)]"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08),0_2px_10px_rgba(244,63,94,0.05)]"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-4 z-10 flex flex-col justify-center">
        
        {needsOnboarding ? (
          <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-2xl rounded-3xl p-8 text-center shadow-[0_8px_25px_rgba(0,0,0,0.15),0_8px_30px_rgba(6,182,212,0.08)] space-y-4 my-auto max-w-md mx-auto">
            <div className="inline-flex p-3 bg-cyan-500/15 border border-cyan-500/35 rounded-2xl text-cyan-600 dark:text-cyan-400 shadow-[0_2px_10px_rgba(0,0,0,0.1),0_2px_10px_rgba(6,182,212,0.1)]">
              <Sparkles size={28} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Complete Your Profile</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please setup your academic profile and select your subjects to launch your personal dashboard.
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15),0_4px_15px_rgba(6,182,212,0.15)] cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Go to Setup Page</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 my-auto">
            
            {/* Welcome Banner Card */}
            <div className="bg-gradient-to-r from-cyan-50/90 via-white/90 to-indigo-50/90 dark:from-cyan-950/50 dark:via-[#030712]/95 dark:to-indigo-950/50 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 rounded-2xl p-4 sm:p-5 backdrop-blur-xl relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.12),0_6px_20px_rgba(6,182,212,0.06)] space-y-3">
              <div className="absolute right-0 top-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center space-x-3.5">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      onClick={() => setShowImageModal(true)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-cyan-400/60 object-cover shadow-[0_2px_10px_rgba(0,0,0,0.15),0_2px_10px_rgba(6,182,212,0.15)] shrink-0 cursor-pointer hover:opacity-90 transition-opacity" 
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-cyan-400/60 bg-cyan-950 flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.15),0_2px_10px_rgba(6,182,212,0.15)] text-cyan-300 font-extrabold text-xl">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[10px] shadow-[0_1px_5px_rgba(0,0,0,0.08),0_1px_5px_rgba(6,182,212,0.05)]">
                      <Sparkles size={11} className="text-cyan-600 dark:text-cyan-400" />
                      <span>Personal Study Planner</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                      Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-300 dark:to-cyan-100">{profile?.name}</span>! 👋
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Enrolled in <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{profile?.grade}</span> • <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{profile?.board}</span> ({profile?.study_group} Group)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/settings')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition-all cursor-pointer shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_10px_rgba(6,182,212,0.08)]"
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
            </div>

            {/* Selected Subjects Layer */}
            <div className="pt-2.5 border-t border-cyan-500/20 flex flex-wrap items-center gap-2 relative z-10">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                <BookMarked size={13} className="text-cyan-600 dark:text-cyan-400" />
                Selected Subjects:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile?.subjects?.map((sub: string) => (
                  <span key={sub} className="px-2.5 py-0.5 bg-white/90 dark:bg-[#02060c] border border-cyan-500/30 rounded-md text-[11px] text-cyan-700 dark:text-cyan-300 font-medium shadow-[0_1px_5px_rgba(0,0,0,0.1),0_1px_5px_rgba(6,182,212,0.05)]">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Routine & Equation Solver Cards Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
            <div 
              onClick={() => router.push('/routine')}
              className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/[0.06] rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)] flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/35 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.08)]">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">
                    AI Study Routine
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    Create and save daily timetable.
                  </p>
                </div>
              </div>
              <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all shrink-0 shadow-[0_1px_5px_rgba(0,0,0,0.08),0_1px_5px_rgba(6,182,212,0.05)]">
                <ArrowRight size={15} />
              </div>
            </div>

            <div 
              onClick={() => router.push('/equation-solver')}
              className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/[0.06] rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)] flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/35 rounded-xl text-indigo-500 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(99,102,241,0.08)]">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">
                    AI Equation Solver
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    Step-by-step mathematical solutions.
                  </p>
                </div>
              </div>
              <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-all shrink-0 shadow-[0_1px_5px_rgba(0,0,0,0.08),0_1px_5px_rgba(99,102,241,0.05)]">
                <ArrowRight size={15} />
              </div>
            </div>

          </div>

          {/* AI Tutor & Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
            <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/[0.06] rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)]">
              <div className="space-y-2">
                <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/35 rounded-xl text-cyan-600 dark:text-cyan-400 w-fit shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.08)]">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Tutor Chatbot</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Ask questions, clear conceptual doubts, and explanations anytime.
                </p>
              </div>
              <button 
                onClick={() => router.push('/ai-tutor')}
                className="mt-4 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.1),0_2px_10px_rgba(6,182,212,0.15)] cursor-pointer"
              >
                <span>AI Tutor</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/[0.06] rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)]">
              <div className="space-y-2">
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/35 rounded-xl text-indigo-500 dark:text-indigo-400 w-fit shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(99,102,241,0.08)]">
                  <BookOpen size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notes</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Quick reminders, formulas or short revision notes.
                </p>
              </div>
              <button 
                onClick={() => router.push('/notes')} 
                className="mt-4 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1),0_2px_10px_rgba(6,182,212,0.15)] cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Open Notes</span>
                <ArrowRight size={13}/>
              </button>
            </div>

          </div>

          {/* Quick Test Card Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
            <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/[0.06] rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_15px_rgba(0,0,0,0.1),0_4px_15px_rgba(6,182,212,0.05)] transition-all duration-300 sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/35 rounded-xl text-indigo-500 dark:text-indigo-400 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.1),0_2px_8px_rgba(99,102,241,0.08)]">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-slate-900 dark:text-white font-bold text-sm">Test Section</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">Take a 3-question sample test to check readiness.</p>
                </div>
              </div>
              <div className="mt-4">
                <button onClick={() => router.push('/test')} className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-[0_2px_10px_rgba(0,0,0,0.1),0_2px_10px_rgba(6,182,212,0.15)] cursor-pointer flex items-center justify-center space-x-1">
                  <span>Take Test</span>
                  <ArrowRight size={13}/>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </main>

    <footer className="w-full text-center py-3 text-[11px] text-gray-500 border-t border-cyan-500/20 shadow-[0_-2px_10px_rgba(0,0,0,0.05),0_-2px_10px_rgba(6,182,212,0.02)]">
      Matric AI &copy; 2026 • Built for Smart Student Success
    </footer>

  </div>
)
}