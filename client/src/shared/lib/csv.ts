import {
  type Attempt,
  type Form,
  type Question,
} from "@/entities/form/model";
import { formatDateTime } from "@/shared/lib/format";

export interface AttemptsCsvInput {
  form: Form;
  attempts: Attempt[];
}

export function buildAttemptsCsv({ form, attempts }: AttemptsCsvInput): string {
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const header = ["Дата отправки", ...form.questions.map((q) => q.label)];
  const rows = attempts.map((attempt) => {
    const cells = form.questions.map((q: Question) => {
      const answer = attempt.answers.find((a) => a.questionId === q.id);
      if (!answer) return "";
      return Array.isArray(answer.value)
        ? answer.value.join("; ")
        : answer.value;
    });
    return [formatDateTime(attempt.createdAt), ...cells].map(escape);
  });
  return (
    "\uFEFF" +
    [header.map(escape).join(","), ...rows.map((r) => r.join(","))].join("\n")
  );
}
