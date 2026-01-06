import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NGROK_URL = process.env.NGROK_URL; // <--- Read from .env

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manualOverride = searchParams.get('url');

  let baseUrl = '';

  // LOGIC: Decide which base URL to use
  if (manualOverride) {
    // 1. Manual Override (via ?url=...)
    baseUrl = manualOverride;
  } else if (NGROK_URL) {
    // 2. Env Variable (Local Dev)
    baseUrl = NGROK_URL;
  } else {
    // 3. Auto-Detect (Production)
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }

  // Cleanup: Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/$/, '');

  // Construct final Webhook URL
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  if (!TELEGRAM_TOKEN) {
    return NextResponse.json(
      { success: false, message: 'Bot token missing' },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`,
    );
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: `Webhook set to: ${webhookUrl}`,
        source: manualOverride ? 'manual' : NGROK_URL ? 'env' : 'auto',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Telegram Error: ${data.description}`,
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
