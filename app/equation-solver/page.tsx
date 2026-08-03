'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Calculator, Delete, Sparkles, Loader2, Terminal, CheckCircle2, History, Trash2 } from 'lucide-react'

export default function EquationSolverPage() {
  const [equation, setEquation] = useState('')
  const [isSolving, setIsSolving] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [historyList, setHistoryList] = useState<any[]>([])
  const router = useRouter()

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

      const { data, error } = await supabase
        .from('solved_equations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setHistoryList(data)
      }
    }
    initData()

    return () => {
      window.removeEventListener('storage', checkTheme)
    }
  }, [router])

  const symbols = [
    '+', '-', '×', '÷', '=', '(', ')', '^', '√', 'π', 
    'θ', 'x', 'y', 'z', '≤', '≥', '≠', '∫', '∑', '°', '.'
  ]

  const handleSymbolClick = (sym: string) => {
    setEquation(prev => prev + sym)
  }

  const handleDelete = () => {
    setEquation(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setEquation('')
    setTerminalOutput('')
  }

  const handleSolveInTerminal = async () => {
    if (!equation.trim() || !sessionUser) return
    setIsSolving(true)
    setTerminalOutput('Solving Your Equation...')

    try {
      const res = await fetch('/api/solve-equation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation }),
      })

      const data = await res.json()

      if (data.success) {
        setTerminalOutput(data.output)

        const { data: insertedData, error } = await supabase.from('solved_equations').insert([
          {
            user_id: sessionUser.id,
            equation: equation,
            solution: data.output
          }
        ]).select()

        if (!error && insertedData) {
          setHistoryList([insertedData[0], ...historyList])
        }

      } else {
        setTerminalOutput(`[❌] Please retry correct equation`)
      }
    } catch (err) {
      setTerminalOutput(`[❌] NETWORK ERROR: Could not connect to backend server.`)
    } finally {
      setIsSolving(false)
    }
  }

  const handleDeleteHistoryItem = async (id: string) => {
    const { error } = await supabase
      .from('solved_equations')
      .delete()
      .eq('id', id)
      .eq('user_id', sessionUser?.id)

    if (!error) {
      setHistoryList(historyList.filter(item => item.id !== id))
    } else {
      alert('Error deleting history item: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060c] text-slate-900 dark:text-white flex flex-col relative overflow-hidden p-4 sm:p-6 transition-colors duration-300">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/[0.07] rounded-full blur-[130px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6 z-10 shadow-[0_4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 px-3.5 py-2 bg-white/90 dark:bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-all cursor-pointer rounded-xl shadow-[0_4px_16px_rgba(6,182,212,0.12)]"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="p-2 bg-white/90 dark:bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-700 dark:text-cyan-300 shadow-[0_4px_16px_rgba(6,182,212,0.12)]">
            <Calculator size={18} />
          </div>
          <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-200 dark:to-white">
            Matric AI Equation Solver
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto space-y-6 z-10 flex-1">
        
        <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_35px_rgba(6,182,212,0.15)] space-y-4 backdrop-blur-xl transition-all duration-300">
          
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles size={18} className="text-cyan-600 dark:text-cyan-400" />
              <span>MATRIC AI Equation Solver</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Powered by Matric AI ( Noor ). Solve arithmetic, algebra, and complex equations with real step-by-step breakdown.
            </p>
          </div>

          {/* Screen Input Box */}
          <div className="relative">
            <input
              type="text"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="e.g. 2x + 5 = 15..."
              className="w-full bg-white/90 dark:bg-[#02060c] border border-cyan-500/40 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-cyan-900 dark:text-cyan-200 font-mono text-sm tracking-wide outline-none shadow-[0_4px_16px_rgba(6,182,212,0.1)] transition-colors duration-300"
            />
            <div className="absolute right-3 top-3 flex items-center space-x-1.5">
              <button 
                onClick={handleDelete}
                title="Backspace"
                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-xl transition-all cursor-pointer shadow-sm border border-rose-500/20"
              >
                <Delete size={18} />
              </button>
              <button 
                onClick={handleClear}
                title="Clear All"
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border border-cyan-500/20"
              >
                AC
              </button>
            </div>
          </div>

          {/* Symbols Grid */}
          <div className="bg-slate-50/90 dark:bg-[#02060c]/70 border border-cyan-500/20 rounded-2xl p-3.5 space-y-2 shadow-[0_4px_16px_rgba(6,182,212,0.08)] transition-colors duration-300">
            <p className="text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold px-1">Math Symbols (Click to insert):</p>
            <div className="flex flex-wrap gap-2">
              {symbols.map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleSymbolClick(sym)}
                  className="w-10 h-10 bg-white/90 dark:bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400 text-cyan-900 dark:text-cyan-200 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(6,182,212,0.1)]"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSolveInTerminal}
            disabled={isSolving || !equation.trim()}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-[0_6px_20px_rgba(6,182,212,0.35)] cursor-pointer flex items-center justify-center space-x-2"
          >
            {isSolving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span> AI is solving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span> Solve & Save</span>
              </>
            )}
          </button>

          {/* AI Terminal Output Window */}
          {terminalOutput && (
            <div className="mt-4 bg-[#010409] border border-cyan-500/40 rounded-2xl p-4 shadow-[0_8px_24px_rgba(6,182,212,0.2),inset_0_0_20px_rgba(6,182,212,0.08)] space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
                <div className="flex items-center space-x-2">
                  <Terminal size={15} className="text-cyan-400" />
                  <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">MATRIC_AI (Saved to Cloud)</span>
                </div>
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/65"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></div>
                </div>
              </div>
              <pre className="text-xs font-mono text-cyan-100 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {terminalOutput}
              </pre>
            </div>
          )}

        </div>

        {/* History Section */}
        <div className="bg-white/90 dark:bg-[#030712]/90 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_35px_rgba(6,182,212,0.12)] backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center space-x-2 border-b border-cyan-500/20 pb-3">
            <History size={18} className="text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-cyan-900 dark:text-cyan-200 uppercase tracking-wide">
              Saved Equation History ({historyList.length})
            </h3>
          </div>

          {historyList.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {historyList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-50/90 dark:bg-[#02060c] border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl p-4 space-y-2 shadow-[0_4px_16px_rgba(6,182,212,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-semibold px-2 py-0.5 bg-white/90 dark:bg-cyan-500/10 border border-cyan-500/25 rounded-lg shadow-sm">
                      Eq: {item.equation}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        title="Delete History"
                        className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-lg transition-all cursor-pointer border border-rose-500/25 shadow-sm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono text-slate-800 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-white/90 dark:bg-[#010409] p-3 rounded-xl border border-cyan-500/15 shadow-sm transition-colors duration-300">
                    {item.solution}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50/90 dark:bg-[#02060c]/50 rounded-2xl border border-cyan-500/20 shadow-sm transition-colors duration-300">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No saved equations in history yet. Solve an equation above!</p>
            </div>
          )}
        </div>

      </main>

      <footer className="w-full text-center py-3 text-[11px] text-gray-500 border-t border-cyan-500/15 mt-6 font-medium">
        Matric AI Equation Solver &copy; 2026
      </footer>

    </div>
  )
}