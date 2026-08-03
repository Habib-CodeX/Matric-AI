'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Send, ArrowLeft, Bot, User, Loader2, Image as ImageIcon, Camera, X, Paperclip, History, Plus } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  image?: string
}

interface ChatSession {
  id: string
  title: string
  created_at: string
}

export default function ChatPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('Student')
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Gemini-like Session States
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatHistoryList, setChatHistoryList] = useState<ChatSession[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Webcam modal states
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch current authenticated user, profile name, and load past chats list
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
      
      setIsDarkMode(isDark)
      if (isDark) {
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

    async function initUserAndChats() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user

        if (user) {
          setUserId(user.id)
          
          // Direct fetch from student_profiles using user id
          let { data: profile } = await supabase
            .from('student_profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle()

          // Fallback check by email if id row isn't matched directly
          if (!profile && user.email) {
            const { data: profileByEmail } = await supabase
              .from('student_profiles')
              .select('name')
              .ilike('name', `%${user.email.split('@')[0]}%`)
              .maybeSingle()
            profile = profileByEmail
          }

          const currentName = profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Student')
          
          // Capitalize first letter cleanly
          const formattedName = currentName.charAt(0).toUpperCase() + currentName.slice(1)

          setUserName(formattedName)
          fetchUserSessions(user.id)
          startNewChat(formattedName)
        } else {
          setUserName('Student')
          startNewChat('Student')
        }
      } catch (err) {
        console.error("Error initializing user profile:", err)
        setUserName('Student')
        startNewChat('Student')
      }
    }

    initUserAndChats()

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Fetch all chat sessions for sidebar/history list
  const fetchUserSessions = async (uid: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setChatHistoryList(data)
    }
  }

  // Start a Brand New Chat (Gemini Style) - dynamically uses current userName state if not passed
  const startNewChat = (name = userName) => {
    setCurrentChatId(null)
    setMessages([
      { 
        role: 'assistant', 
        content: `Hi ${name}, how are you? Which subject, chapter, or topic would you like help with today?` 
      }
    ])
    setIsHistoryOpen(false)
  }

  // Load a Specific Past Chat from Supabase
  const loadPastChat = async (chatId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content, image_url')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        const loadedMessages: Message[] = data.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          image: m.image_url || undefined
        }))
        setMessages(loadedMessages)
        setCurrentChatId(chatId)
        setIsHistoryOpen(false)
      }
    } catch (err) {
      console.error("Error loading chat:", err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Handle Image Selection from Gallery
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Start Live Webcam
  const startCamera = async () => {
    setIsCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Webcam access error:", err)
      alert("Camera access denied or not available.")
      setIsCameraOpen(false)
    }
  }

  // Capture Photo from Live Webcam
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.height || 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg')
        setSelectedImage(dataUrl)
        stopCamera()
      }
    }
  }

  // Stop Webcam Stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !selectedImage) || loading) return

    const userMessage = input.trim()
    const currentImage = selectedImage

    setInput('')
    setSelectedImage(null)
    
    const newMsgList = [...messages, { role: 'user' as const, content: userMessage || 'Please explain this image:', image: currentImage || undefined }]
    setMessages(newMsgList)
    setLoading(true)

    try {
      let activeChatId = currentChatId

      // If it's a brand new chat, create a session in Supabase first
      if (!activeChatId && userId) {
        const titleSnippet = userMessage ? userMessage.slice(0, 30) + '...' : 'Image Question'
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: userId, title: titleSnippet }])
          .select()
          .single()

        if (!sessionError && sessionData) {
          activeChatId = sessionData.id
          setCurrentChatId(activeChatId)
          fetchUserSessions(userId) // Refresh history list
        }
      }

      // Save user message to Supabase
      if (activeChatId) {
        await supabase.from('chat_messages').insert([{
          chat_id: activeChatId,
          role: 'user',
          content: userMessage || 'Please explain this image:',
          image_url: currentImage
        }])
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage || 'Please solve or explain this image according to the syllabus.', 
          image: currentImage, 
          history: messages, 
          userName, 
          userId 
        })
      })

      const data = await response.json()
      
      if (response.ok && data.reply) {
        const botReply = data.reply
        setMessages(prev => [...prev, { role: 'assistant', content: botReply }])

        // Save assistant reply to Supabase
        if (activeChatId) {
          await supabase.from('chat_messages').insert([{
            chat_id: activeChatId,
            role: 'assistant',
            content: botReply
          }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Maazrat, kuch technical issue ki wajah se jawab nahi aa saka.' }])
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your backend API.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#02060c] text-slate-900 dark:text-white overflow-hidden relative font-sans transition-colors duration-200">
      
      {/* Live Webcam Modal Popup */}
      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-[#030712] border border-cyan-500/30 p-4 rounded-2xl max-w-lg w-full flex flex-col items-center space-y-4 shadow-2xl">
            <div className="flex justify-between w-full items-center">
              <h3 className="text-sm font-bold text-cyan-600 dark:text-cyan-400">Capture Question from Webcam</h3>
              <button onClick={stopCamera} className="p-1 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-cyan-500/20">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Take Snapshot
            </button>
          </div>
        </div>
      )}

      {/* History Drawer / Modal (Gemini Style Sidebar) */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-start">
          <div className="bg-white dark:bg-[#030712] border-r border-cyan-500/20 w-80 h-full flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/15">
              <h2 className="text-sm font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <History size={16} /> Chat History
              </h2>
              <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <button
              onClick={() => startNewChat(userName)}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Plus size={16} /> New Chat
            </button>

            <div className="flex-1 overflow-y-auto mt-4 space-y-2">
              {chatHistoryList.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-gray-500 text-center py-4">No past chats found.</p>
              ) : (
                chatHistoryList.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => loadPastChat(chat.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer truncate border ${
                      currentChatId === chat.id 
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-900 dark:text-cyan-200 font-bold' 
                        : 'bg-slate-50 dark:bg-[#02060c] border-cyan-500/10 text-slate-700 dark:text-gray-300 hover:bg-cyan-500/10'
                    }`}
                  >
                    {chat.title}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsHistoryOpen(false)}></div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white/80 dark:bg-[#030712]/80 border-b border-cyan-500/15 backdrop-blur-md shadow-sm">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/')}
            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          
          {/* History Toggle Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Chat History"
          >
            <History size={16} /> <span className="hidden sm:inline">History</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-600 dark:text-cyan-400">
              <Bot size={18} />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 dark:from-cyan-200 to-slate-900 dark:to-white">
                  AI Tutor
              </h1>
              <span className="text-[10px] text-cyan-600/70 dark:text-cyan-400/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                Online • Punjab Board Expert ({userName})
              </span>
            </div>
          </div>
        </div>

        {/* New Chat Button Top Right */}
        <button
          onClick={() => startNewChat(userName)}
          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
        >
          <Plus size={14} /> <span className="hidden sm:inline">New Chat</span>
        </button>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full scroll-smooth">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              msg.role === 'user' 
                ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                : 'bg-slate-100 dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            <div className={`max-w-[80%] md:max-w-[70%] p-3 rounded-2xl text-xs md:text-sm leading-relaxed space-y-2 ${
              msg.role === 'user'
                ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-none shadow-lg shadow-cyan-500/10'
                : 'bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-gray-200 border border-cyan-500/20 rounded-tl-none shadow-xl'
            }`}>
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded question" 
                  className="max-h-48 rounded-lg object-cover border border-cyan-500/30" 
                />
              )}
              <p className='whitespace-pre-wrap'>{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Bot size={14} />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#030712] border border-cyan-500/20 rounded-2xl rounded-tl-none flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <div className="p-3.5 bg-white/90 dark:bg-[#030712]/90 border-t border-cyan-500/15 backdrop-blur-md mt-auto sticky bottom-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Selected Image Preview Bar */}
          {selectedImage && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#02060c] p-2 rounded-xl border border-cyan-500/30 w-fit">
              <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
              <span className="text-xs text-cyan-700 dark:text-cyan-300">Image attached</span>
              <button 
                onClick={() => setSelectedImage(null)} 
                className="p-1 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-lg transition-all cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            {/* Hidden File Input for Gallery */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
            />

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Attach image"
            >
              <Paperclip size={18} />
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={startCamera}
              className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Capture photo"
            >
              <Camera size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any question or capture a picture..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-[#02060c] border border-cyan-500/20 rounded-xl outline-none text-slate-900 dark:text-white text-xs md:text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:border-cyan-500/50 transition-all shadow-inner"
            />
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-xl font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}