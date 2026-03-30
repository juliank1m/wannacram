import AuthForm from '@/components/AuthForm';

type SearchParams = { [key: string]: string | string[] | undefined };

export default function LoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const raw = searchParams?.verified;
  const flag = Array.isArray(raw) ? raw[0] : raw;
  const verified = flag === '1' || flag === 'true';

  return <AuthForm mode="login" verified={verified} />;
}
