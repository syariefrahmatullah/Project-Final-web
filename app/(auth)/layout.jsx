import Logo from "@/components/Logo";

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand to-brand-light px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-xl bg-white px-5 py-3 shadow">
            <Logo width={180} height={54} />
          </div>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
