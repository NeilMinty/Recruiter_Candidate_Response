import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    stored: process.env.ADMIN_SECRET,
    length: process.env.ADMIN_SECRET?.length,
  })
}
