"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Field, Input, Select } from "@/components/ui";
import { createClassAction } from "./actions";

export function CreateClassForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(createClassAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_9rem_auto] sm:items-end">
      <Field label={t.classes.name} htmlFor="cls-name">
        <Input id="cls-name" name="name" placeholder={t.classes.namePlaceholder} required maxLength={40} />
      </Field>
      <Field label={t.classes.subject} htmlFor="cls-subject">
        <Input id="cls-subject" name="subject" placeholder={t.classes.subjectPlaceholder} maxLength={80} />
      </Field>
      <Field label={t.classes.gradeLevel} htmlFor="cls-level">
        <Select id="cls-level" name="gradeLevel" defaultValue="">
          <option value="">{t.classes.gradeLevelNone}</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="red" size="lg" disabled={pending}>
        <Plus className="size-5" /> {t.classes.create}
      </Button>
      {state?.error ? <p className="text-sm font-semibold text-red sm:col-span-4">{state.error}</p> : null}
    </form>
  );
}
