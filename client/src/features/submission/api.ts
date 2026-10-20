import { get, post, put } from '@/shared/api/http'
import { type Answer, type Attempt, type Form } from '@/entities/form/model'

export const submissionApi = {
  getPublishedForm(slug: string): Promise<Form> {
    return get<Form>(`/public/forms/${slug}`)
  },
  submit(slug: string, answers: Answer[], attemptId?: string): Promise<Attempt> {
    return post<Attempt>(`/public/forms/${slug}/attempts`, { answers, attemptId })
  },
  startAttempt(slug: string, answers: Answer[]): Promise<Attempt> {
    return post<Attempt>(`/public/forms/${slug}/attempts/start`, { answers })
  },
  updateAttempt(slug: string, attemptId: string, answers: Answer[]): Promise<Attempt> {
    return put<Attempt>(`/public/forms/${slug}/attempts/${attemptId}`, { answers })
  },
  getAttempt(slug: string, attemptId: string): Promise<Attempt> {
    return get<Attempt>(`/public/forms/${slug}/attempts/${attemptId}`)
  },
}
