import prisma from '@/lib/prisma/prisma';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await prisma.log.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { error: `Internal Server Error: ${JSON.stringify(error)}` },
      { status: 500 },
    );
  }
}
