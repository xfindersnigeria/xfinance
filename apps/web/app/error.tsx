'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const ErrorPage = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  const router = useRouter();
  const err = 'Oops!, Something went wrong';
  const errorMessage = process.env.NEXT_PUBLIC_ENV === 'development' ? error?.message : err;
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      <Image src={'/svgs/error.webp'} priority width={300} height={300} alt="error" className="rounded-full" />
      <div className="max-w-125 flex flex-col gap-2 items-center justify-center text-center ">
        <h1 className="text-2xl font-semibold">{errorMessage}</h1>
        <p className="text-gray-600">
          Apologies for the inconvenience, an error has occurred. Please retry your request.
        </p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <Button className="border-2 border-primary-500 px-5 py-3 my-5 rounded-lg outline-none" onClick={reset}>
          Try again
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
