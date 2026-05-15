import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="text-[8rem] md:text-[10rem] font-extrabold font-syne leading-none text-ink/5 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center">
              <span className="text-3xl md:text-4xl">🕉️</span>
            </div>
          </div>
        </div>
        <h1 className="text-2xl md:text-[2rem] font-extrabold font-syne tracking-tight text-ink mb-2">Page Not Found</h1>
        <p className="text-gray-400 text-sm md:text-base mb-8 max-w-[320px] mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-3 bg-ink text-white rounded-[10px] font-syne font-bold text-sm tracking-wide no-underline hover:bg-[#222] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
