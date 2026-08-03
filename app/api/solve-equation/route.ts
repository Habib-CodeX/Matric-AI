import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export async function POST(req: Request) {
  try {
    const { equation } = await req.json()

    if (!equation) {
      return NextResponse.json({ error: 'Equation is required' }, { status: 400 })
    }

    const prompt = `
      You are a precise mathematical solver. Solve the given equation or expression step-by-step.
      
      Input: "${equation}"
      
      Strict Rules:
      - Do NOT write long English sentences or explanations.
      - Keep it short, clean, and focus purely on the mathematical steps.
      - Format strictly like this:
        Step 1: [math expression]
        Step 2: [math expression]
        ...
        [✔] FINAL RESULT: [Answer]
    `

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    })

    const terminalSteps = response.text || 'Could not parse equation.'

    return NextResponse.json({ success: true, output: terminalSteps })

  } catch (error: any) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}