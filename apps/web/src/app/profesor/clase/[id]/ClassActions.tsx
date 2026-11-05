"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserMinus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { btn } from "@/components/ui";
import { deleteClassAction, removeMemberAction } from "../actions";

export function DeleteClassButton({ classId }: { classId: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={btn("danger", "sm")}
      onClick={() => {
        if (confirm(t.classes.deleteConfirm)) start(() => deleteClassAction(classId));
      }}
    >
      <Trash2 className="size-4" /> {t.classes.delete}
    </button>
  );
}

export function RemoveMemberButton({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title={`${t.classes.remove}: ${name}`}
      aria-label={`${t.classes.remove}: ${name}`}
      className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-red-soft hover:text-red disabled:opacity-40"
      onClick={() => {
        if (!confirm(t.classes.removeConfirm)) return;
        start(async () => {
          await removeMemberAction(classId, studentId);
          router.refresh();
        });
      }}
    >
      <UserMinus className="size-4" />
    </button>
  );
}
