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
      const valid = (Array.isArray(answer.value)
        ? answer.value
        : String(answer.value).trim() !== ""
          ? [answer.value]
          : []
      ).filter((v) => (q.options ?? []).includes(v));
      for (const v of valid) totals.set(v, (totals.get(v) ?? 0) + 1);
      total += valid.length;
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

export interface AttemptStats {
  started: Attempt[]
  submitted: Attempt[]
}

export function splitByStatus(attempts: Attempt[]): AttemptStats {
  return {
    started: attempts.filter((a) => a.status === 'started'),
    submitted: attempts.filter((a) => a.status === 'submitted'),
  }
}

export interface ConversionStats {
  startedCount: number
  submittedCount: number
  /** submitted / (started + submitted), 0..1 */
  rate: number
}

export function buildConversion(attempts: Attempt[]): ConversionStats {
  const startedCount = attempts.filter((a) => a.status === 'started').length
  const submittedCount = attempts.filter((a) => a.status === 'submitted').length
  const total = startedCount + submittedCount
  return {
    startedCount,
    submittedCount,
    rate: total > 0 ? submittedCount / total : 0,
  }
}

export interface DayActivity {
  /** YYYY-MM-DD (локальная зона) */
  date: string
  label: string
  count: number
}

function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function buildDailyActivity(attempts: Attempt[], now: Date = new Date()): DayActivity[] {
  const DAYS = 14
  const buckets = new Map<string, DayActivity>()
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() - i)
    const key = dateKey(d)
    buckets.set(key, { date: key, label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, count: 0 })
  }
  for (const a of attempts) {
    if (a.status !== 'submitted') continue
    const key = dateKey(new Date(a.createdAt))
    const bucket = buckets.get(key)
    if (bucket) bucket.count += 1
  }
  return [...buckets.values()]
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function pluralizeAnswers(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  if (last === 1 && lastTwo !== 11) return 'ответ'
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'ответа'
  return 'ответов'
}
