// "use client";
// import { cn } from "@/lib/utils";

// export default function Loader() {
//   // Read synchronously during render so the src is correct on first paint.
//   // Server renders the fallback ("/images/logo.png"); React hydration applies
//   // the localStorage value via suppressHydrationWarning without a warning or
//   // a second render cycle — avoiding the useEffect race where the Suspense
//   // fallback unmounts before the state update can paint.
//   const logoSrc =
//     typeof window !== "undefined"
//       ? localStorage.getItem("xf-logo-url") || "/images/logo.png"
//       : "/images/logo.png";

//   return (
//     <div
//       className={cn(
//         "fixed inset-0 z-100 h-screen w-screen flex flex-col justify-center items-center bg-transparent"
//       )}
//     >
//       {/* Plain <img> so the browser uses its cache directly — next/image routes
//           through /_next/image optimization which adds a network round-trip */}
//       <img
//         suppressHydrationWarning
//         className="outline-none outline-0 border-none border-0 animate-bounce duration-500 transition-transform"
//         src={logoSrc}
//         alt="loader"
//         width={140}
//         height={140}
//       />
//     </div>
//   );
// }

"use client";
import { cn } from "@/lib/utils";

export default function Loader() {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md",
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated ring */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted opacity-30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        {/* <div className="w-40 h-1 rounded-full bg-muted overflow-hidden">
  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_1.5s_infinite]" />
</div> */}

        {/* Subtle animated dots */}
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>

        {/* Optional text */}
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
