export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative z-10 flex flex-col flex-1">{children}</div>;
}
