import Header from '@/components/Header';
import FileUploader from '@/components/FileUploader';

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-pixel text-[14px] leading-loose mb-2">UPLOAD MATERIAL</h1>
          <p className="font-vt323 text-xl text-ink/55">
            Upload your lecture notes, slides, or past exams to get started
          </p>
        </div>
        <FileUploader />
      </main>
    </>
  );
}
