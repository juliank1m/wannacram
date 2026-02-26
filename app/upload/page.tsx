import Header from '@/components/Header';
import FileUploader from '@/components/FileUploader';

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Upload Study Material</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload your lecture notes, slides, or past exams to get started
          </p>
        </div>
        <FileUploader />
      </main>
    </>
  );
}
