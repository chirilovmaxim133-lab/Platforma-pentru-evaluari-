import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireUser("student");
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">{children}</main>
    </>
  );
}
