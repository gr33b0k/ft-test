import {
  type Attempt,
  type Form,
  type Question,
  isChoiceType,
} from "@/entities/form/model";

export interface OptionCount {
  option: string;
  count: number;
}

export interface AttemptOptionSummary {
  question: Question;
  counts: OptionCount[];
  total: number;
}

export function buildOptionCounts(
  form: Form,
  attempts: Attempt[],
): AttemptOptionSummary[] {
  return form.questions.map((q) => {
    if (!isChoiceType(q.type))
      return { question: q, counts: [] as OptionCount[], total: attempts.length };
    const totals = new Map<string, number>();
    for (const o of q.options ?? []) totals.set(o, 0);
    let total = 0;
    for (const a of attempts) {
      const answer = a.answers.find((ans) => ans.questionId === q.id);
      if (!answer) continue;
      const values = Array.isArray(answer.value)
        ? answer.value
        : String(answer.value).trim() !== ""
          ? [answer.value]
          : [];
      for (const v of values) totals.set(v, (totals.get(v) ?? 0) + 1);
      total += values.length;
    }
    return {
      question: q,
      counts: [...totals.entries()]
        .map(([option, count]) => ({ option, count }))
        .sort((x, y) => y.count - x.count),
      total,
    };
  });
}

export function pluralizeAnswers(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return "ответ";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "ответа";
  return "ответов";
}
