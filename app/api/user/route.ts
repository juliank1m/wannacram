import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { readJson } from '@/lib/http';

const MAX_DISPLAY_NAME_LENGTH = 100;

/** Deletes every object under <userId>/ in the documents bucket. */
async function removeUserFiles(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<Error | null> {
  const pageSize = 100;
  const maxPages = 200; // 20k files; a stuck delete must not loop forever

  // Always read the first page: each pass removes what it listed, so the next
  // batch shifts into its place.
  for (let page = 0; page < maxPages; page++) {
    const { data: files, error } = await admin.storage
      .from('documents')
      .list(userId, { limit: pageSize });

    if (error) return error;
    if (!files || files.length === 0) return null;

    const { error: removeError } = await admin.storage
      .from('documents')
      .remove(files.map((file) => `${userId}/${file.name}`));

    if (removeError) return removeError;
  }

  return new Error('Too many files to delete in one request');
}

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

    const body = await readJson<{ displayName?: unknown }>(request);
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';

    if (!displayName) {
      return NextResponse.json({ error: 'Display name required' }, { status: 400 });
    }
    // user_metadata rides in every JWT, so an unbounded name inflates the
    // session cookie on every request.
    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
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

    // Order matters: every table with a foreign key to auth.users must be empty
    // before deleteUser, or it fails with a constraint violation *after* the
    // data is already gone. study_sessions references documents and topics,
    // topics cascades to topic_documents.
    for (const table of ['study_sessions', 'topics', 'documents'] as const) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id);
      if (error) {
        console.error(`DELETE /api/user: failed to delete ${table}:`, error);
        return NextResponse.json({ error: 'Failed to delete account data' }, { status: 500 });
      }
    }

    // Storage objects live under <user id>/ and are not covered by any FK, so
    // once the auth user is gone the RLS policies keyed on auth.uid() make them
    // permanently unreachable. Remove them while we still can.
    const storageError = await removeUserFiles(admin, user.id);
    if (storageError) {
      console.error('DELETE /api/user: failed to delete storage objects:', storageError);
      return NextResponse.json({ error: 'Failed to delete account files' }, { status: 500 });
    }

    // Delete the auth user (requires service role)
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/user error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
