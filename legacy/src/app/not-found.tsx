import Link from 'next/link'

export default function NotFound(){
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
      <h1 className="text-3xl font-bold">Page Not Found</h1>
      <p className="text-sm text-muted-foreground max-w-md">The page you are looking for does not exist or may have been moved.</p>
      <Link href="/" className="text-primary underline text-sm">Go back home</Link>
    </div>
  )
}
