'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen, Lock, Mail, User, AtSign, Calendar, Users, Sparkles, Atom, FlaskConical, Calculator } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [emailPrefix, setEmailPrefix] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('Male')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validated, setValidated] = useState(false)
  
  const [pageLoading, setPageLoading] = useState(true)
  const [fadeTransition, setFadeTransition] = useState(false)
  const router = useRouter()

  useEffect(() => {
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
    
    const handleThemeChange = () => {
      checkTheme()
    }
    window.addEventListener('themeChanged', handleThemeChange)

    const fadeTimer = setTimeout(() => {
      setFadeTransition(true)
    }, 4500)

    const finishTimer = setTimeout(() => {
      setPageLoading(false)
    }, 5300)

    return () => {
      window.removeEventListener('storage', checkTheme)
      window.removeEventListener('themeChanged', handleThemeChange)
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [])

  useEffect(() => {
    try {
      const url = typeof window !== 'undefined' ? new URL(window.location.href) : null
      const hasOAuthParams = url && (url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error'))

      if (hasOAuthParams) {
        if ((supabase.auth as any).getSessionFromUrl) {
          ;(async () => {
            try {
              await (supabase.auth as any).getSessionFromUrl()
            } catch (e) {
              // ignore
            } finally {
              try { router.replace('/') } catch(e) {}
              try { router.refresh() } catch(e) {}
            }
          })()
        } else {
          try { router.replace('/') } catch(e) {}
          try { router.refresh() } catch(e) {}
        }
      }
    } catch (e) {
      // ignore
    }
  }, [router])

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError('')
    setLoading(true)
    try {
      const { data, error: socialError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (socialError) {
        setError(socialError.message)
        return
      }

      if (data && (data as any).url) {
        window.location.href = (data as any).url
        return
      }
    } catch (err: any) {
      setError(err?.message || 'Social login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidated(true)
    setLoading(true)
    setError('')

    const fullEmail = isLogin ? identifier.trim() : `${emailPrefix.trim()}@gmail.com`

    if (isLogin) {
      if (!identifier || !password) {
        setError('Please enter both email/username and password.')
        setLoading(false)
        return
      }

      let loginEmail = identifier.trim()

      if (!loginEmail.includes('@')) {
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('email')
          .eq('username', loginEmail)
          .maybeSingle()
        
        if (userErr) {
          setError(`Database Error: ${userErr.message}`)
          setLoading(false)
          return
        }

        if (!userData || !userData.email) {
          setError('Username not found. Please check spelling or register.')
          setLoading(false)
          return
        }
        
        loginEmail = userData.email
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password 
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
      } else {
        router.refresh()
        router.push('/')
      }

    } else {
      if (!emailPrefix || !password || !name || !username || !age) {
        setError('Please fill in all fields to register.')
        setLoading(false)
        return
      }
      
      if (!/\S+@\S+\.\S+/.test(fullEmail)) {
        setError('Invalid email format.')
        setLoading(false)
        return
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        setError('This username is already taken. Please choose another one.')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: fullEmail, 
        password,
        options: {
          data: {
            username: username,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: fullEmail,
            password
          })

          if (signInErr) {
            setError('Email already exists. Please enter the correct password to log in.')
          } else {
            router.refresh()
            router.push('/')
          }
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('users').insert([
          {
            id: authData.user.id,
            name,
            username,
            age: parseInt(age),
            email: fullEmail,
            gender
          }
        ])

        if (profileError) {
          setError(`Profile Error: ${profileError.message || JSON.stringify(profileError)}`)
          setLoading(false)
          return
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: fullEmail,
          password
        })

        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }

        router.refresh()
        router.push('/')
      }
    }
  }

  if (pageLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#060913] overflow-hidden relative select-none transition-opacity duration-1000 ${fadeTransition ? 'opacity-0' : 'opacity-100'}`}>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-50 dark:from-indigo-950/40 dark:via-[#060913] dark:to-[#060913]"></div>
        <div className="absolute w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>

        <style jsx>{`
          .scene-container {
            perspective: 2000px;
          }
          
          .open-book {
            position: relative;
            width: 380px;
            height: 240px;
            transform-style: preserve-3d;
            transform: rotateX(24deg) rotateY(-16deg) rotateZ(2deg);
            animation: floatStack 4s ease-in-out infinite;
          }

          @keyframes floatStack {
            0%, 100% { transform: rotateX(24deg) rotateY(-16deg) rotateZ(2deg) translateY(0); }
            50% { transform: rotateX(20deg) rotateY(-12deg) rotateZ(0deg) translateY(-8px); }
          }

          .book-base {
            position: absolute;
            inset: 0;
            background: #0f172a;
            border-radius: 8px;
            box-shadow: 0 50px 90px rgba(0,0,0,0.95);
            transform: translateZ(-28px);
          }

          .book-stack-layer-1 {
            position: absolute;
            inset: 4px;
            background: #e2e8f0;
            border-radius: 6px;
            transform: translateZ(-22px);
          }

          .book-stack-layer-2 {
            position: absolute;
            inset: 8px;
            background: #cbd5e1;
            border-radius: 5px;
            transform: translateZ(-16px);
          }

          .book-stack-layer-3 {
            position: absolute;
            inset: 12px;
            background: #f8fafc;
            border-radius: 4px;
            transform: translateZ(-10px);
          }

          .page-spread {
            position: absolute;
            top: 14px;
            left: 14px;
            right: 14px;
            bottom: 14px;
            background: #f8fafc;
            border-radius: 4px;
            display: flex;
            box-shadow: inset 0 0 30px rgba(0,0,0,0.06);
            overflow: hidden;
            transform: translateZ(-4px);
          }

          .page-left, .page-right {
            flex: 1;
            height: 100%;
            background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 15%, #ffffff 100%);
            padding: 20px;
            position: relative;
            background-image: repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0,0,0,0.03) 18px, rgba(0,0,0,0.03) 19px);
          }

          .page-left {
            border-right: 2px solid #cbd5e1;
            box-shadow: inset -15px 0 20px -10px rgba(0,0,0,0.08);
          }

          .book-spine-crease {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 20px;
            transform: translateX(-50%);
            background: linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.08), rgba(0,0,0,0.3));
            z-index: 20;
          }

          .flipping-sheet {
            position: absolute;
            top: 14px;
            left: 50%;
            width: 173px;
            height: 212px;
            transform-origin: left center;
            transform-style: preserve-3d;
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
          }

          .sheet-face, .sheet-back {
            position: absolute;
            inset: 0;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            background-image: repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0,0,0,0.03) 18px, rgba(0,0,0,0.03) 19px);
          }

          .sheet-face {
            background-color: #ffffff;
          }

          .sheet-back {
            background-color: #f1f5f9;
            transform: rotateY(180deg);
            border-top-right-radius: 0px;
            border-bottom-right-radius: 0px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }

          .page-1 {
            animation: turnFullPage 1.3s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
            animation-delay: 0.4s;
            z-index: 30;
          }
          .page-2 {
            animation: turnFullPage 1.3s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
            animation-delay: 1.8s;
            z-index: 29;
          }
          .page-3 {
            animation: turnFullPage 1.3s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
            animation-delay: 3.2s;
            z-index: 28;
          }

          @keyframes turnFullPage {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(-180deg); }
          }
        `}</style>

        <div className="scene-container flex flex-col items-center space-y-12 z-10">
          <div className="open-book">
            <div className="book-base"></div>
            <div className="book-stack-layer-1"></div>
            <div className="book-stack-layer-2"></div>
            <div className="book-stack-layer-3"></div>
            
            <div className="page-spread">
              <div className="page-left flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Matric Study Hub</span>
                  <div className="w-16 h-2 bg-indigo-500/20 rounded mt-1"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-gray-300/60 rounded"></div>
                  <div className="w-4/5 h-1.5 bg-gray-300/60 rounded"></div>
                </div>
              </div>

              <div className="book-spine-crease"></div>

              <div className="page-right flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Syllabus Guide</span>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-gray-300/60 rounded"></div>
                  <div className="w-3/4 h-1.5 bg-gray-300/60 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flipping-sheet page-1">
              <div className="sheet-face p-4 flex flex-col items-center justify-between text-center">
                <span className="text-[11px] font-extrabold text-indigo-600 tracking-wider">PHYSICS</span>
                <div className="p-3 bg-indigo-50 rounded-full border border-indigo-100 shadow-inner">
                  <Atom className="w-7 h-7 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <span className="text-[9px] text-gray-400">Forces & Motion</span>
              </div>
              <div className="sheet-back p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-400 tracking-widest">CHAPTER 1 BACK</span>
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-gray-300 rounded"></div>
                  <div className="w-3/4 h-1 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flipping-sheet page-2">
              <div className="sheet-face p-4 flex flex-col items-center justify-between text-center">
                <span className="text-[11px] font-extrabold text-emerald-600 tracking-wider">CHEMISTRY</span>
                <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100 shadow-inner">
                  <FlaskConical className="w-7 h-7 text-emerald-600 animate-bounce" />
                </div>
                <span className="text-[9px] text-gray-400">Elements & Reactions</span>
              </div>
              <div className="sheet-back p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-400 tracking-widest">CHAPTER 2 BACK</span>
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-gray-300 rounded"></div>
                  <div className="w-4/5 h-1 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flipping-sheet page-3">
              <div className="sheet-face p-4 flex flex-col items-center justify-between text-center">
                <span className="text-[11px] font-extrabold text-sky-600 tracking-wider">MATHEMATICS</span>
                <div className="p-3 bg-sky-50 rounded-full border border-sky-100 shadow-inner">
                  <Calculator className="w-7 h-7 text-sky-600" />
                </div>
                <span className="text-[9px] text-gray-400">Algebra & Geometry</span>
              </div>
              <div className="sheet-back p-4 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-gray-400 tracking-widest">CHAPTER 3 BACK</span>
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-gray-300 rounded"></div>
                  <div className="w-2/3 h-1 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center space-y-2 z-10">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-indigo-500/30 text-slate-700 dark:text-indigo-300 text-xs shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span>Loading Study Planing...</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-indigo-600 to-slate-900 dark:from-indigo-300 dark:via-white dark:to-indigo-400">
              Preparing Portal Environment
            </h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden transition-opacity duration-1000 opacity-100 py-6 bg-slate-50 text-slate-900 dark:bg-[#02060c] dark:text-white">
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-100/50 via-slate-50 to-slate-50 dark:from-cyan-950/20 dark:via-[#02060c] dark:to-[#02060c]"></div>

      <div className="w-full max-w-sm p-5 space-y-4 rounded-2xl border z-10 transition-all duration-300 bg-white border-slate-200 shadow-xl dark:bg-[#0b1326] dark:border-cyan-500/40 dark:shadow-[0_0_50px_rgba(6,182,212,0.25),0_25px_60px_rgba(0,0,0,0.95)] text-slate-900 dark:text-white">
        
        <div className="flex flex-col items-center space-y-1 pt-1">
          <div className="p-2.5 border rounded-xl shadow-inner bg-cyan-50 border-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-400">
            <BookOpen size={22} />
          </div>
          <h2 className="text-lg font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-cyan-700 dark:from-cyan-200 dark:to-white">
            {isLogin ? 'Welcome To (Matric AI)' : 'Create Matric Account'}
          </h2>
        </div>

        <div className="p-1 rounded-xl border max-w-[240px] mx-auto flex bg-slate-100 border-slate-200 dark:bg-[#060b18] dark:border-cyan-500/20">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setValidated(false); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
              isLogin 
                ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-md shadow-cyan-500/30 font-bold' 
                : 'text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setValidated(false); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
              !isLogin 
                ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-md shadow-cyan-500/30 font-bold' 
                : 'text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-200'
            }`}
          >
            Register
          </button>
        </div>

        {error && <p className="text-rose-500 dark:text-rose-400 text-xs text-center bg-rose-50 dark:bg-rose-950/60 p-2 rounded-xl border border-rose-200 dark:border-rose-900/60">{error}</p>}

        <form onSubmit={handleAuth} className="space-y-3">
          {isLogin ? (
            <div>
              <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Email or Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyan-600 dark:text-cyan-400/60">
                  <Mail size={15} />
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                    validated && !identifier ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                  }`}
                  placeholder="student@gmail.com / username"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-cyan-600 dark:text-cyan-400/60">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full pl-8 pr-2.5 py-1.5 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                        validated && !name ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                      }`}
                      placeholder="Name..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-cyan-600 dark:text-cyan-400/60">
                      <AtSign size={14} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full pl-8 pr-2.5 py-1.5 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                        validated && !username ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                      }`}
                      placeholder="username..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Age</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-cyan-600 dark:text-cyan-400/60">
                      <Calendar size={14} />
                    </span>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className={`w-full pl-8 pr-2.5 py-1.5 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                        validated && !age ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                      }`}
                      placeholder="16"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Gender</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-cyan-600 dark:text-cyan-400/60">
                      <Users size={14} />
                    </span>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 border rounded-xl outline-none transition-all text-xs appearance-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 border-slate-200 text-slate-900 dark:bg-[#060b18] dark:border-cyan-500/30 dark:text-white"
                    >
                      <option value="Male" className="bg-white dark:bg-[#060b18]">Male</option>
                      <option value="Female" className="bg-white dark:bg-[#060b18]">Female</option>
                      <option value="Other" className="bg-white dark:bg-[#060b18]">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Email</label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-600 dark:text-cyan-400/60">
                    <Mail size={15} />
                  </span>
                  <input
                    type="text"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    className={`w-full pl-9 pr-[88px] py-2 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                      validated && !emailPrefix ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                    }`}
                    placeholder="student"
                  />
                  <span className="absolute right-3 text-xs font-medium pointer-events-none select-none text-slate-500 dark:text-cyan-400/60">
                    @gmail.com
                  </span>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-medium mb-1 text-slate-700 dark:text-cyan-200/80">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cyan-600 dark:text-cyan-400/60">
                <Lock size={15} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 border rounded-xl outline-none transition-all text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 ${
                  validated && !password ? 'border-rose-500' : 'border-slate-200 dark:border-cyan-500/30'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={loading}
              className="py-1.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-white dark:text-slate-950 rounded-xl font-bold transition-all duration-200 shadow-md shadow-cyan-500/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 text-xs"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:text-slate-950" />
                  <span className="tracking-wide text-[11px] font-bold">verifing...</span>
                </div>
              ) : (
                <span>{isLogin ? 'Login' : 'Register'}</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-cyan-500/20">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-cyan-500/20"></div>
            <span className="flex-shrink mx-2 text-[10px] uppercase tracking-wider text-slate-500 dark:text-cyan-400/60">or sign in with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-cyan-500/20"></div>
          </div>

          <div className="flex justify-center items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-[#060b18] dark:border-cyan-500/30 dark:hover:bg-cyan-500/10"
              title="Sign in with Google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-[#060b18] dark:border-cyan-500/30 dark:hover:bg-cyan-500/10"
              title="Sign in with Facebook"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}