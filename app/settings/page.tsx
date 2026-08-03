'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, Settings, ArrowLeft, 
  CheckSquare, Square, Loader2, Upload, Image as ImageIcon 
} from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const router = useRouter()

  // Form States
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [grade, setGrade] = useState('10th Grade')
  const [board, setBoard] = useState('Federal Board (FBISE)')
  const [group, setGroup] = useState<'Science' | 'Arts'>('Science')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology'
  ])

  // Subject pools
  const scienceSubjects = ['English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Islamiyat', 'Pakistan Studies']
  const artsSubjects = ['English', 'Urdu', 'General Mathematics', 'General Science', 'Islamiyat', 'Pakistan Studies', 'Civics', 'Education', 'Economics']

  // Load strictly authenticated user profile & theme synchronizer
  useEffect(() => {
    // Real-time automatic theme synchronizer
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

    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user)

      // Fetch profile strictly matching the logged-in user's auth id
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (data) {
        setName(data.name || session.user.email?.split('@')[0] || '')
        setAvatarUrl(data.avatar_url || '')
        if (data.grade) setGrade(data.grade)
        if (data.board) setBoard(data.board)
        if (data.study_group) setGroup(data.study_group)
        if (data.subjects && Array.isArray(data.subjects)) {
          setSelectedSubjects(data.subjects)
        }
      } else {
        setName(session.user.email?.split('@')[0] || '')
      }
      setLoading(false)
    }

    loadProfile()

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [router])

  // Handle Local PC File Conversion to Base64 (No Bucket Required)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files
      if (!files || files.length === 0 || !user) return

      const file = files[0]
      setUploadingImage(true)

      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
        setUploadingImage(false)
      }
      reader.onerror = () => {
        alert('Failed to read file')
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      alert('Error uploading image: ' + error.message)
      setUploadingImage(false)
    }
  }

  // Handle Group Change
  const handleGroupChange = (newGroup: 'Science' | 'Arts') => {
    setGroup(newGroup)
    if (newGroup === 'Science') {
      setSelectedSubjects(['English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology'])
    } else {
      setSelectedSubjects(['English', 'Urdu', 'General Mathematics', 'General Science', 'Islamiyat', 'Pakistan Studies'])
    }
  }

  // Toggle Subject Checkbox
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
    } else {
      setSelectedSubjects([...selectedSubjects, subject])
    }
  }

  // Save / Update Profile Data mapped securely to current user id & synced to localStorage for Notes module
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const updates = {
      id: user.id, // Ensures data updates only the logged-in user row
      name,
      avatar_url: avatarUrl,
      grade,
      board,
      study_group: group,
      subjects: selectedSubjects,
      updated_at: new Date(),
    }

    // Sync to localStorage so Notes page dynamically reads the correct group, class, and chosen subjects instantly
    const userSettings = {
      classLevel: grade,
      groupType: group,
      subjects: selectedSubjects
    }
    localStorage.setItem('matric_user_settings', JSON.stringify(userSettings))

    const { error } = await supabase
      .from('student_profiles')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      alert('Error saving profile: ' + error.message)
    } else {
      router.push('/')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#02060c] text-cyan-600 dark:text-cyan-400 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#02060c] text-slate-900 dark:text-white relative overflow-hidden flex flex-col p-4 sm:p-8 transition-colors duration-300">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/[0.07] dark:bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-2xl w-full mx-auto space-y-6 z-10">
        
        {/* Top Bar with Back Button */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white/90 dark:bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_4px_16px_rgba(6,182,212,0.12)]"
          >
            <ArrowLeft size={16} />
            <span></span>
          </button>
          
          <div className="flex items-center space-x-2 text-cyan-700 dark:text-cyan-400">
            <Settings size={18} />
            <span className="text-sm font-bold">Profile & Settings</span>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white/90 dark:bg-[#030712]/95 border border-cyan-500/30 hover:border-cyan-500/50 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_35px_rgba(6,182,212,0.15)] space-y-6 transition-colors duration-300">
          
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-200 dark:via-white dark:to-cyan-400">
              Edit Your Academic Profile
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Update your name, photo, class, or subjects anytime to keep your AI tutor personalized.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80 mb-1.5">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Habib"
                  className="w-full p-3 bg-white/90 dark:bg-[#02060c] border border-cyan-500/30 focus:border-cyan-400 rounded-xl text-xs text-slate-900 dark:text-white outline-none transition-all shadow-[0_4px_16px_rgba(6,182,212,0.08)]"
                />
              </div>

              {/* PC Image File Picker Input */}
              <div>
                <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80 mb-1.5">Profile Picture</label>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full border border-cyan-500/40 bg-slate-100 dark:bg-cyan-950 overflow-hidden shrink-0 flex items-center justify-center shadow-[0_2px_10px_rgba(6,182,212,0.15)]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-cyan-600 dark:text-cyan-400" />
                    )}
                  </div>

                  <label className="flex-1 flex items-center justify-center space-x-2 p-2.5 bg-white/90 dark:bg-[#02060c] hover:bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-700 dark:text-cyan-300 font-medium cursor-pointer transition-all shadow-[0_4px_16px_rgba(6,182,212,0.1)]">
                    {uploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-cyan-600 dark:text-cyan-400" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Upload Image</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80 mb-1.5">Select Class</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-3 bg-white/90 dark:bg-[#02060c] border border-cyan-500/30 focus:border-cyan-400 rounded-xl text-xs text-cyan-800 dark:text-cyan-300 outline-none transition-all cursor-pointer shadow-[0_4px_16px_rgba(6,182,212,0.08)]"
                >
                  <option value="9th Grade">9th Grade (SSC-I)</option>
                  <option value="10th Grade">10th Grade (SSC-II)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80 mb-1.5">Board / Curriculum</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full p-3 bg-white/90 dark:bg-[#02060c] border border-cyan-500/30 focus:border-cyan-400 rounded-xl text-xs text-cyan-800 dark:text-cyan-300 outline-none transition-all cursor-pointer shadow-[0_4px_16px_rgba(6,182,212,0.08)]"
                >
                  <option value="Federal Board (FBISE)">Federal Board (FBISE)</option>
                  <option value="Punjab Board">Punjab Boards (Lahore/Rawalpindi)</option>
                  <option value="Sindh Board">Sindh Board</option>
                  <option value="KPK Board">KPK Board</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80 mb-2">Select Study Group</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleGroupChange('Science')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    group === 'Science' 
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-[0_4px_20px_rgba(6,182,212,0.2)]' 
                      : 'bg-white/90 dark:bg-[#02060c] border-cyan-500/30 text-gray-600 dark:text-gray-400 hover:border-cyan-500/50 shadow-[0_4px_16px_rgba(6,182,212,0.08)]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Science Group</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Physics, Chemistry, Bio/Comp</div>
                  </div>
                  {group === 'Science' && <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleGroupChange('Arts')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    group === 'Arts' 
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-[0_4px_20px_rgba(6,182,212,0.2)]' 
                      : 'bg-white/90 dark:bg-[#02060c] border-cyan-500/30 text-gray-600 dark:text-gray-400 hover:border-cyan-500/50 shadow-[0_4px_16px_rgba(6,182,212,0.08)]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Arts / Humanities</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">General Science & Arts</div>
                  </div>
                  {group === 'Arts' && <Sparkles size={16} className="text-cyan-600 dark:text-cyan-400" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-cyan-800 dark:text-cyan-200/80">
                  ({group} Group) - Choose Your Subjects
                </label>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg shadow-sm">
                  {selectedSubjects.length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/90 dark:bg-[#02060c]/70 p-4 rounded-2xl border border-cyan-500/25 shadow-[0_4px_20px_rgba(6,182,212,0.08)] transition-colors duration-300">
                {(group === 'Science' ? scienceSubjects : artsSubjects).map((subj) => {
                  const isChecked = selectedSubjects.includes(subj)
                  return (
                    <div
                      key={subj}
                      onClick={() => toggleSubject(subj)}
                      className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        isChecked 
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-slate-900 dark:text-white shadow-[0_2px_12px_rgba(6,182,212,0.15)]' 
                          : 'bg-white/90 dark:bg-[#030712] border-cyan-500/30 text-gray-600 dark:text-gray-400 hover:border-cyan-500/50 shadow-[0_2px_10px_rgba(6,182,212,0.06)]'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                      ) : (
                        <Square size={15} className="text-gray-400 dark:text-gray-600 shrink-0" />
                      )}
                      <span className="text-xs font-medium truncate">{subj}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-1/3 py-3 bg-white/90 dark:bg-gray-800/80 hover:bg-cyan-500/10 text-gray-700 dark:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all border border-cyan-500/30 shadow-[0_4px_16px_rgba(6,182,212,0.1)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || selectedSubjects.length === 0}
                className="w-2/3 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold transition-all shadow-[0_6px_20px_rgba(6,182,212,0.35)] flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save & Update Profile</span>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  )
}