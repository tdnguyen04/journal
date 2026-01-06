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

export async function DELETE(request: Request) {
  if (!TELEGRAM_TOKEN) {
    return NextResponse.json({ success: false, message: 'Bot token missing' }, { status: 500 });
  }

  try {
    // STEP 1: PURGE (Delete Webhook + Drop Pending Updates)
    // 'drop_pending_updates: true' is CRITICAL. It deletes stuck messages 
    // trying to reach your old ngrok tunnel so they don't flood your new server.
    const deleteRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=true`
    );
    const deleteData = await deleteRes.json();

    if (!deleteData.ok) {
      throw new Error(`Failed to delete: ${deleteData.description}`);
    }

    // STEP 2: RECONNECT (Identify the correct URL)
    // We reuse the logic from the GET request to find the right URL
    let baseUrl = '';
    if (NGROK_URL) {
      baseUrl = NGROK_URL;
    } else {
      const host = request.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl.replace(/\/$/, '');
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;

    // STEP 3: SET (Register new Webhook)
    const setRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`
    );
    const setData = await setRes.json();

    if (setData.ok) {
      return NextResponse.json({ 
        success: true, 
        message: `♻️ Hard Reset Complete. Pointing to: ${webhookUrl}` 
      });
    } else {
      throw new Error(`Failed to set new webhook: ${setData.description}`);
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
