import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/session";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireUser("teacher");
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">{children}</main>
    </>
  );
}
