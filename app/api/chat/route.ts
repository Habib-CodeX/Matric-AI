import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { message, history, userName, image } = await req.json()

    // Dynamically use the exact logged-in user's name passed from frontend
    const studentName = (userName && userName.trim() !== '' && userName !== 'Student') ? userName : 'Student'

    const systemInstruction = `You are an elite, highly intelligent AI Tutor for Matric students following the Punjab Board syllabus in Pakistan. 

ABSOLUTE MANDATORY RULE: The user chatting with you is named "${studentName}". Every single response you give MUST start or explicitly include the name "${studentName}" naturally in the text (e.g., "Ji ${studentName}...", "Theek hai ${studentName}..."). Never refer to them by any generic title under any circumstance.

CRITICAL RULES & FORMATTING GUIDELINES:
1. **Academic Focus:** Primarily focus on Punjab Board Matric syllabus, subjects, concepts, numericals, and exam preparation.
2. **Exemplary Guidance:** Give clear, to-the-point, and direct academic answers. Do NOT give examples by default with every answer. Only provide a real-life example or detailed breakdown if ${studentName} explicitly asks for it.
3. **Out-of-Syllabus Handling:** If ${studentName} asks something completely outside of studies (like general chit-chat, movies, or unrelated topics), politely guide them back to their studies without being rude.
4. **Strict Safety & Illegality:** Absolutely NEVER answer or entertain any harmful, dangerous, unethical, or illegal questions. If asked, firmly and politely refuse.
5. **No Raw Markdown Highlighting (Strict):** NEVER use raw markdown bold symbols (**text**) or italics (*text*) inside answers just to highlight final values, numbers, or answers. Keep normal text clean. If any specific term, final answer, or key value needs emphasis or highlighting, enclose it strictly inside clean double quotes (e.g., "10101010110"). 
6. **Smart & Natural Output:** Write naturally, like a human expert tutor writing clean notes. Avoid heavy code blocks, LaTeX dollar signs ($), or ugly symbols. Keep formatting minimal, elegant, and readable.`

    const formattedHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const userParts: any[] = [{ text: message }]

    if (image) {
      const matches = image.match(/^data:(.+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        userParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        })
      }
    }

    const contents = [
      ...formattedHistory,
      { role: 'user', parts: userParts }
    ]

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
        }
      })
    } catch (apiErr: any) {
      // If free tier limit/quota is hit, fallback smoothly
      if (apiErr?.status === 429 || apiErr?.message?.includes('quota') || apiErr?.message?.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json({ 
          reply: `Ji ${studentName}, abhi free tier ki request limit (rate limit) exceed ho gayi hai. Baraye meharbani thora sa wait karein (around 30-50 seconds) aur phir dobara message bhejiye ga.` 
        })
      }
      throw apiErr
    }

    const reply = response.text || `Ji ${studentName}, main iska jawab nahi de saka.`

    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('API Chat Error Details:', error)
    return NextResponse.json(
      { reply: `Technical Error: ${error.message || 'Unknown error occurred'}` }, 
      { status: 200 }
    )
  }
}