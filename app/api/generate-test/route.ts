import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const { subject, chapter, topic, numQuestions, grade } = await req.json()

    if (!subject || !chapter || !topic) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const prompt = `
      You are an expert board examiner and curriculum creator for Pakistan educational boards (${grade} grade).
      Generate exactly ${numQuestions || 5} multiple choice questions (MCQs) for the following syllabus context:
      - Subject: ${subject}
      - Chapter: ${chapter}
      - Topic: ${topic}

      Return ONLY a valid JSON object with a key "questions" containing an array of objects. 
      Each object must have:
      - "question": string (the MCQ question text)
      - "options": array of 4 distinct string options
      - "correct_answer": string (must exact match one of the options)
      - "explanation": string (brief explanation of why the correct answer is right)

      Do not wrap the JSON in markdown code blocks like \`\`\`json, just return pure raw JSON string.
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()

    // Clean markdown code blocks if AI included them
    const cleanJsonText = responseText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')

    const parsedData = JSON.parse(cleanJsonText)

    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('Error in generate-test API:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate test questions.' }, { status: 500 })
  }
}