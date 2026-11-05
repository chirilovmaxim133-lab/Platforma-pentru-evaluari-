import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, classes, classMembers, tests, users, type Class, type User } from "@/lib/db/schema";
import { generateAccessCode } from "@/lib/tests/random";
import { classAverage, gradedOnly, groupBy, mean, type Result } from "@/lib/stats";

export async function getOwnedClass(classId: string, user: User): Promise<Class | null> {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return null;
  const [row] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!row) return null;
  return row.ownerId === user.id || user.role === "admin" ? row : null;
}

export async function createClass(owner: User, input: { name: string; subject: string; gradeLevel: number | null }): Promise<string> {
  for (let i = 0; i < 8; i++) {
    try {
      const [row] = await db
        .insert(classes)
        .values({ ownerId: owner.id, schoolId: owner.schoolId, name: input.name, subject: input.subject, gradeLevel: input.gradeLevel, joinCode: generateAccessCode() })
        .returning({ id: classes.id });
      return row.id;
    } catch (err) {
      // Coliziune de cod (index unic) — încercăm alt cod.
      if (i === 7) throw err;
    }
  }
  throw new Error("unreachable");
}

export async function isMember(classId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: classMembers.classId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)))
    .limit(1);
  return !!row;
}

export async function joinClass(classId: string, studentId: string): Promise<void> {
  await db.insert(classMembers).values({ classId, studentId }).onConflictDoNothing();
}

type ClassAttempt = {
  attemptId: string;
  testId: string;
  studentId: string;
  status: "in_progress" | "submitted";
  complete: boolean;
  grade: number | null;
  percent: number | null;
  at: Date;
  visible: boolean;
};

/** Lucrările elevilor (doar membrii clasei) la testele clasei. */
async function classAttempts(classIds: string[]): Promise<(ClassAttempt & { classId: string })[]> {
  if (!classIds.length) return [];
  const rows = await db
    .select({
      attemptId: attempts.id,
      testId: attempts.testId,
      studentId: attempts.studentId,
      status: attempts.status,
      complete: attempts.gradingComplete,
      grade: attempts.grade,
      percent: attempts.percent,
      submittedAt: attempts.submittedAt,
      startedAt: attempts.startedAt,
      classId: tests.classId,
      settings: tests.settings,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .innerJoin(classMembers, and(eq(classMembers.classId, tests.classId), eq(classMembers.studentId, attempts.studentId)))
    .where(inArray(tests.classId, classIds));
  return rows.map((r) => ({
    attemptId: r.attemptId,
    testId: r.testId,
    studentId: r.studentId,
    status: r.status,
    complete: r.complete,
    grade: r.grade,
    percent: r.percent,
    at: r.submittedAt ?? r.startedAt,
    visible: r.settings.results.showScore,
    classId: r.classId!,
  }));
}

function averageForClass(rows: ClassAttempt[], onlyVisible: boolean): number | null {
  const graded = gradedOnly(onlyVisible ? rows.filter((r) => r.visible) : rows);
  return classAverage(new Map([...groupBy(graded, (r) => r.studentId)].map(([k, v]) => [k, v.map((x) => x.grade)])));
}

export type ClassCard = Class & { students: number; tests: number; average: number | null; teacherName?: string };

export async function listTeacherClasses(ownerId: string): Promise<ClassCard[]> {
  const rows = await db
    .select({
      cls: classes,
      students: sql<number>`(select count(*)::int from ${classMembers} where ${classMembers.classId} = ${classes.id})`,
      tests: sql<number>`(select count(*)::int from ${tests} where ${tests.classId} = ${classes.id})`,
    })
    .from(classes)
    .where(eq(classes.ownerId, ownerId))
    .orderBy(asc(classes.name));
  const byClass = groupBy(await classAttempts(rows.map((r) => r.cls.id)), (r) => r.classId);
  return rows.map((r) => ({ ...r.cls, students: r.students, tests: r.tests, average: averageForClass(byClass.get(r.cls.id) ?? [], false) }));
}

/** Totul pentru pagina clasei la profesor: elevii cu mediile lor, testele cu mediile lor, media clasei. */
export async function classDetail(cls: Class) {
  const [members, classTests, rows] = await Promise.all([
    db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, joinedAt: classMembers.joinedAt })
      .from(classMembers)
      .innerJoin(users, eq(users.id, classMembers.studentId))
      .where(eq(classMembers.classId, cls.id))
      .orderBy(asc(users.lastName), asc(users.firstName)),
    db
      .select({ id: tests.id, title: tests.title, status: tests.status, publishedAt: tests.publishedAt, createdAt: tests.createdAt, settings: tests.settings })
      .from(tests)
      .where(eq(tests.classId, cls.id))
      .orderBy(asc(tests.createdAt)),
    classAttempts([cls.id]),
  ]);
  const graded = gradedOnly(rows);
  const byStudent = groupBy(graded, (r) => r.studentId);
  const byTest = groupBy(graded, (r) => r.testId);
  const submittedByTest = groupBy(rows.filter((r) => r.status === "submitted"), (r) => r.testId);

  const students = members.map((m) => {
    const mine = (byStudent.get(m.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime());
    return {
      ...m,
      graded: mine.length,
      average: mean(mine.map((x) => x.grade)),
      last: mine.length ? mine[mine.length - 1].grade : null,
    };
  });
  const testRows = classTests.map((tt) => ({
    ...tt,
    average: mean((byTest.get(tt.id) ?? []).map((x) => x.grade)),
    submitted: submittedByTest.get(tt.id)?.length ?? 0,
    gradeMode: tt.settings.grading.mode,
  }));
  return {
    students,
    tests: testRows,
    average: averageForClass(rows, false),
    averagePercent: mean(rows.filter((r) => r.status === "submitted" && r.complete && r.percent !== null).map((r) => r.percent!)),
  };
}

/** Toate rezultatele unui elev, pentru contul lui (doar ce are voie să vadă). */
export async function studentResults(studentId: string): Promise<(Result & { teacher: string; gradeMode: "grade10" | "percent" })[]> {
  const rows = await db
    .select({
      attemptId: attempts.id,
      testId: tests.id,
      classId: tests.classId,
      title: tests.title,
      subject: tests.subject,
      status: attempts.status,
      complete: attempts.gradingComplete,
      grade: attempts.grade,
      percent: attempts.percent,
      submittedAt: attempts.submittedAt,
      startedAt: attempts.startedAt,
      settings: tests.settings,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .innerJoin(users, eq(users.id, tests.ownerId))
    .where(eq(attempts.studentId, studentId))
    .orderBy(desc(attempts.startedAt))
    .limit(500);
  return rows.map((r) => {
    const visible = r.settings.results.showScore;
    return {
      attemptId: r.attemptId,
      testId: r.testId,
      classId: r.classId,
      title: r.title,
      subject: r.subject,
      at: r.submittedAt ?? r.startedAt,
      status: r.status,
      complete: r.complete,
      visible,
      // Ce a ascuns profesorul nu ajunge nici în statisticile elevului.
      grade: visible ? r.grade : null,
      percent: visible ? r.percent : null,
      teacher: `${r.teacherFirst} ${r.teacherLast}`,
      gradeMode: r.settings.grading.mode,
    };
  });
}

/** Clasele elevului, cu media lui și media clasei (calculată doar din rezultatele vizibile elevilor). */
export async function studentClasses(studentId: string) {
  const rows = await db
    .select({ cls: classes, teacherFirst: users.firstName, teacherLast: users.lastName })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .innerJoin(users, eq(users.id, classes.ownerId))
    .where(eq(classMembers.studentId, studentId))
    .orderBy(asc(classes.name));
  const byClass = groupBy(await classAttempts(rows.map((r) => r.cls.id)), (r) => r.classId);
  return rows.map((r) => {
    const all = byClass.get(r.cls.id) ?? [];
    const mine = gradedOnly(all.filter((x) => x.studentId === studentId && x.visible));
    return {
      id: r.cls.id,
      name: r.cls.name,
      subject: r.cls.subject,
      teacher: `${r.teacherFirst} ${r.teacherLast}`,
      yourAverage: mean(mine.map((x) => x.grade)),
      classAverage: averageForClass(all, true),
      graded: mine.length,
    };
  });
}

/** Pagina unei clase la elev: fiecare test al clasei, cu nota lui și media clasei la acel test. */
export async function studentClassDetail(classId: string, studentId: string) {
  const [row] = await db
    .select({ cls: classes, teacherFirst: users.firstName, teacherLast: users.lastName })
    .from(classes)
    .innerJoin(users, eq(users.id, classes.ownerId))
    .where(eq(classes.id, classId))
    .limit(1);
  if (!row || !(await isMember(classId, studentId))) return null;
  const all = (await classAttempts([classId])).filter((x) => x.visible);
  const classTests = await db
    .select({ id: tests.id, title: tests.title, createdAt: tests.createdAt, settings: tests.settings })
    .from(tests)
    .where(eq(tests.classId, classId))
    .orderBy(asc(tests.createdAt));
  const graded = gradedOnly(all);
  const byTest = groupBy(graded, (r) => r.testId);
  const testRows = classTests
    .filter((tt) => tt.settings.results.showScore)
    .map((tt) => {
      const mine = all.find((x) => x.testId === tt.id && x.studentId === studentId);
      return {
        id: tt.id,
        title: tt.title,
        at: mine?.at ?? tt.createdAt,
        your: mine && mine.status === "submitted" && mine.complete ? mine.grade : null,
        yourStatus: mine ? (mine.status === "submitted" ? (mine.complete ? "graded" : "pending") : "in_progress") : "none",
        classAverage: mean((byTest.get(tt.id) ?? []).map((x) => x.grade)),
      };
    });
  const mine = graded.filter((x) => x.studentId === studentId);
  return {
    cls: row.cls,
    teacher: `${row.teacherFirst} ${row.teacherLast}`,
    tests: testRows,
    yourAverage: mean(mine.map((x) => x.grade)),
    classAverage: averageForClass(all, true),
  };
}
