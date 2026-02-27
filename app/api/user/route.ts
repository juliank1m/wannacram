import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { count: documentCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name ?? null,
        createdAt: user.created_at,
        documentCount: documentCount ?? 0,
      },
    });
  } catch (err) {
    console.error('GET /api/user error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { displayName } = (await request.json()) as { displayName: string };
    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name required' }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/user error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createServiceRoleClient();

    // Delete user data (sessions cascade from documents via FK)
    await supabase.from('study_sessions').delete().eq('user_id', user.id);
    await supabase.from('documents').delete().eq('user_id', user.id);

    // Delete the auth user (requires service role)
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/user error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
