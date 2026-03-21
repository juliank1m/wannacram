import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { extractText, getFileType } from '@/lib/parsers';

// POST /api/topics/[topicId]/documents
// Body: { filePath: string, fileName: string, fileType: string }
// File is already in Supabase Storage (uploaded directly by the browser).
// This route downloads it, extracts text, saves metadata, and links to the topic.
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

    const { filePath, fileName } = await request.json();
    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'Missing filePath or fileName' }, { status: 400 });
    }

    // Verify the storage path is owned by this user (must start with their user ID)
    if (!filePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    const fileType = getFileType(fileName);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or PPTX.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Download from Supabase Storage to extract text
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('documents')
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to retrieve uploaded file from storage' },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    let extractedText: string;
    try {
      extractedText = await extractText(buffer, fileType);
    } catch (err) {
      // Clean up storage if text extraction fails
      await serviceClient.storage.from('documents').remove([filePath]);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to extract text from file' },
        { status: 422 }
      );
    }

    // Save document record
    const { data: document, error: docError } = await serviceClient
      .from('documents')
      .insert({
        user_id: user.id,
        title: fileName.replace(/\.[^/.]+$/, ''),
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
