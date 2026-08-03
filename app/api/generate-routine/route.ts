import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grade, topics, dailyHours, targetDate } = body

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields or empty topics list' }, 
        { status: 400 }
      )
    }

    // Smart weekly routine generation based on selected topics and daily study hours
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    let topicIndex = 0
    const hoursNum = parseInt(dailyHours) || 4
    const slotsCount = hoursNum > 4 ? 3 : 2

    const routine = days.map((day, index) => {
      const daySlots = []

      for (let i = 0; i < slotsCount; i++) {
        const topic = topics[topicIndex % topics.length]
        
        // Dynamic time slots based on slot index
        const timeSlot = i === 0 
          ? '04:00 PM - 05:30 PM' 
          : i === 1 
          ? '06:00 PM - 07:30 PM' 
          : '08:00 PM - 09:15 PM'

        daySlots.push({
          time: timeSlot,
          task: `Matric (${grade || '9th'}) Focus: ${topic.title} (${hoursNum}h daily pacing)`,
          type: 'study'
        })
        topicIndex++
      }

      return {
        day,
        dayIndex: index,
        slots: daySlots
      }
    })

    return NextResponse.json({ 
      success: true, 
      routine 
    })

  } catch (err: any) {
    console.error('API Error in generate-routine:', err)
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}