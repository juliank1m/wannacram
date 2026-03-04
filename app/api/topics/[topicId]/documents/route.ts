import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { extractText, getFileType, validateFileSize } from '@/lib/parsers';

// POST /api/topics/[topicId]/documents — upload a file and attach it to the topic
export async function POST(
  request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the topic belongs to the user
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id')
      .eq('id', params.topicId)
      .eq('user_id', user.id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or PPTX.' },
        { status: 400 }
      );
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText: string;
    try {
      extractedText = await extractText(buffer, fileType);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to extract text from file' },
        { status: 422 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Upload to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await serviceClient.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.type });

    if (storageError) {
      return NextResponse.json(
        { error: storageError.message || 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Save document record
    const { data: document, error: docError } = await serviceClient
      .from('documents')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_path: filePath,
        extracted_text: extractedText,
        file_type: fileType,
      })
      .select('id, title, file_type, created_at')
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    // Link document to topic
    const { error: linkError } = await serviceClient
      .from('topic_documents')
      .insert({ topic_id: params.topicId, document_id: document.id });

    if (linkError) {
      return NextResponse.json({ error: 'Failed to link document to topic' }, { status: 500 });
    }

    return NextResponse.json({ document });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
