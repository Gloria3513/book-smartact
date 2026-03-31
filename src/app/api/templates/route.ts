import { NextResponse } from 'next/server'
import { TEMPLATES } from '@/templates/registry'

export async function GET() {
  return NextResponse.json({
    success: true,
    templates: TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      thumbnail: t.thumbnail,
      category: t.category,
      colors: t.colors,
    })),
  })
}
