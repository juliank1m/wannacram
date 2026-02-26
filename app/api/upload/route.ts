import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import { extractText, getFileType, validateFileSize } from '@/lib/parsers';

export async function POST(request: Request) {
  try {
    // Verify auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or PPTX.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText: string;
    try {
      extractedText = await extractText(buffer, fileType);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to extract text from file',
        },
        { status: 422 }
      );
    }

    // Upload file to Supabase Storage
    const serviceClient = createServiceRoleClient();
    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: storageError } = await serviceClient.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (storageError) {
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Save document record
    const { data: document, error: dbError } = await serviceClient
      .from('documents')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_path: filePath,
        extracted_text: extractedText,
        file_type: fileType,
      })
      .select('id')
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ documentId: document.id });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
