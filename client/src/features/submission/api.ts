import { get, post } from '@/shared/api/http'
import { type Answer, type Attempt, type Form } from '@/entities/form/model'

export const submissionApi = {
  getPublishedForm(slug: string): Promise<Form> {
    return get<Form>(`/public/forms/${slug}`)
  },
  submit(slug: string, answers: Answer[]): Promise<Attempt> {
    return post<Attempt>(`/public/forms/${slug}/attempts`, { answers })
  },
}
