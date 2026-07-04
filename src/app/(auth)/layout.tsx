import { Toaster } from "@/components/ui/sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-indigo-500/10 blur-3xl animate-gradient" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-purple-500/10 blur-3xl animate-gradient" style={{ animationDelay: "-4s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-sky-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        {children}
      </div>
      <Toaster />
    </div>
  );
}
