import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'; // Fallback

export async function GET() {
  const WEBHOOK_URL = `${APP_URL}/api/telegram/webhook`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK_URL}`
    );
    const data = await response.json();

    return NextResponse.json({
      success: data.ok,
      message: data.description,
      webhook_url: WEBHOOK_URL
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}