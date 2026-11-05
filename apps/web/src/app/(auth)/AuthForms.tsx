"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Field, Input, cn } from "@/components/ui";
import { completeMpassAction, loginAction, registerAction, type FormState } from "./actions";

function ErrorBox({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-2xl border border-red/30 bg-red-soft px-4 py-3 text-sm font-semibold text-red">
      {state.error}
    </p>
  );
}

function MpassButton({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-3">
        <span className="h-px flex-1 bg-line" />
        {t.auth.or}
        <span className="h-px flex-1 bg-line" />
      </div>
      {enabled ? (
        <a href="/api/auth/mpass/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card font-semibold hover:border-ink/40">
          <ShieldCheck className="size-5 text-blue" /> {t.auth.mpass}
        </a>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-center">
          <p className="flex items-center justify-center gap-2 font-semibold text-ink-3">
            <ShieldCheck className="size-5" /> {t.auth.mpass}
          </p>
          <p className="mt-1 text-xs text-ink-3">{t.auth.mpassUnavailable}</p>
        </div>
      )}
    </div>
  );
}

export function LoginForm({ next, mpass }: { next?: string; mpass: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t.auth.email} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t.auth.password} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <ErrorBox state={state} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t.common.loading : t.auth.submitLogin}
        </Button>
      </form>
      <MpassButton enabled={mpass} />
      <p className="mt-8 text-center text-sm text-ink-2">
        {t.auth.noAccount}{" "}
        <Link href={next ? `/inregistrare?next=${encodeURIComponent(next)}` : "/inregistrare"} className="font-bold text-blue hover:underline">
          {t.nav.register}
        </Link>
      </p>
    </>
  );
}

function RolePicker({ role, setRole }: { role: "student" | "teacher"; setRole: (r: "student" | "teacher") => void }) {
  const { t } = useI18n();
  const options = [
    { id: "student" as const, label: t.common.student, icon: GraduationCap },
    { id: "teacher" as const, label: t.common.teacher, icon: Presentation },
  ];
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink-2">{t.auth.role}</legend>
      <input type="hidden" name="role" value={role} />
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={role === o.id}
            onClick={() => setRole(o.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 font-bold transition-all",
              role === o.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-ink/30",
            )}
          >
            <o.icon className="size-5" /> {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SchoolFields({
  role,
  schools,
  defaultSchool,
  defaultClass,
}: {
  role: "student" | "teacher";
  schools: string[];
  defaultSchool?: string;
  defaultClass?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("grid gap-4", role === "student" && "sm:grid-cols-[1fr_7rem]")}>
      <Field label={t.auth.school} htmlFor="school">
        <Input id="school" name="school" list="schools-list" placeholder={t.auth.schoolPlaceholder} defaultValue={defaultSchool} required autoComplete="off" />
        <datalist id="schools-list">
          {schools.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Field>
      {role === "student" ? (
        <Field label={t.auth.className} htmlFor="className">
          <Input id="className" name="className" placeholder={t.auth.classPlaceholder} defaultValue={defaultClass} required maxLength={10} />
        </Field>
      ) : null}
    </div>
  );
}

export type ClassInvite = { code: string; name: string; teacher: string; school: string };

export function RegisterForm({
  next,
  schools,
  mpass,
  invite,
}: {
  next?: string;
  schools: string[];
  mpass: boolean;
  invite?: ClassInvite | null;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [role, setRole] = useState<"student" | "teacher">("student");
  return (
    <>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        {invite ? (
          <>
            <input type="hidden" name="classCode" value={invite.code} />
            <input type="hidden" name="role" value="student" />
            <p className="flex items-center gap-2 rounded-2xl border border-red/25 bg-red-soft px-4 py-3 text-sm font-bold text-red">
              <GraduationCap className="size-5 shrink-0" /> {t.auth.joiningClass.replace("{name}", invite.name).replace("{teacher}", invite.teacher)}
            </p>
          </>
        ) : (
          <RolePicker role={role} setRole={setRole} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.auth.firstName} htmlFor="firstName">
            <Input id="firstName" name="firstName" autoComplete="given-name" required maxLength={60} />
          </Field>
          <Field label={t.auth.lastName} htmlFor="lastName">
            <Input id="lastName" name="lastName" autoComplete="family-name" required maxLength={60} />
          </Field>
        </div>
        <SchoolFields role={invite ? "student" : role} schools={schools} defaultSchool={invite?.school} defaultClass={invite?.name} />
        <Field label={t.auth.email} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t.auth.password} hint={t.auth.passwordHint} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <ErrorBox state={state} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t.common.loading : t.auth.submitRegister}
        </Button>
      </form>
      <MpassButton enabled={mpass} />
      <p className="mt-8 text-center text-sm text-ink-2">
        {t.auth.haveAccount}{" "}
        <Link href={next ? `/autentificare?next=${encodeURIComponent(next)}` : "/autentificare"} className="font-bold text-blue hover:underline">
          {t.nav.login}
        </Link>
      </p>
    </>
  );
}

export function MpassCompleteForm({ firstName, lastName, schools }: { firstName: string; lastName: string; schools: string[] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(completeMpassAction, undefined);
  const [role, setRole] = useState<"student" | "teacher">("student");
  return (
    <form action={action} className="space-y-4">
      <RolePicker role={role} setRole={setRole} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.auth.firstName} htmlFor="firstName">
          <Input id="firstName" name="firstName" defaultValue={firstName} readOnly={!!firstName} required />
        </Field>
        <Field label={t.auth.lastName} htmlFor="lastName">
          <Input id="lastName" name="lastName" defaultValue={lastName} readOnly={!!lastName} required />
        </Field>
      </div>
      <SchoolFields role={role} schools={schools} />
      <ErrorBox state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t.common.loading : t.auth.submitRegister}
      </Button>
    </form>
  );
}
