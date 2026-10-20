import { type Answer, type Attempt } from '@/entities/form/model'

const KEY_PREFIX = 'futureforms:started-attempt:'

export function attemptStorageKey(formId: string): string {
  return `${KEY_PREFIX}${formId}`
}

export function readSavedAttemptId(formId: string): string | null {
  try {
    return window.localStorage.getItem(attemptStorageKey(formId))
  } catch {
    return null
  }
}

export function saveAttemptId(formId: string, attemptId: string): void {
  try {
    window.localStorage.setItem(attemptStorageKey(formId), attemptId)
  } catch {
    // приватный режим/квоты — прогресс просто не восстановится после перезагрузки
  }
}

export function clearSavedAttempt(formId: string): void {
  try {
    window.localStorage.removeItem(attemptStorageKey(formId))
  } catch {
    // ignore
  }
}

/** Ответы из черновика в карту questionId → значение (для восстановления формы). */
export function answersFromAttempt(attempt: Attempt): Record<string, string | string[]> {
  const map: Record<string, string | string[]> = {}
  for (const a of attempt.answers) map[a.questionId] = a.value
  return map
}

/**
 * Отложенный сохранитель прогресса: вызовы save() дебаунсятся;
 * первый сохраняемый слепок уходит в onStart, дальше — в onUpdate.
 */
export interface ProgressSaver {
  save(answers: Answer[]): void
  flush(): Promise<void>
  cancel(): void
}

const SAVE_DEBOUNCE_MS = 700

export function createProgressSaver(options: {
  onStart: (answers: Answer[]) => Promise<void>
  onUpdate: (answers: Answer[]) => Promise<void>
  hasStarted: () => boolean
  delay?: number
}): ProgressSaver {
  const delay = options.delay ?? SAVE_DEBOUNCE_MS
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingAnswers: Answer[] | null = null
  let queue: Promise<void> = Promise.resolve()

  return {
    save(answers: Answer[]) {
      pendingAnswers = answers
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const snapshot = pendingAnswers!
        pendingAnswers = null
        const isStart = !options.hasStarted()
        queue = queue.then(() =>
          isStart ? options.onStart(snapshot) : options.onUpdate(snapshot),
        )
      }, delay)
    },
    async flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
        const snapshot = pendingAnswers!
        pendingAnswers = null
        const isStart = !options.hasStarted()
        queue = queue.then(() =>
          isStart ? options.onStart(snapshot) : options.onUpdate(snapshot),
        )
      }
      await queue
    },
    cancel() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      pendingAnswers = null
    },
  }
}
