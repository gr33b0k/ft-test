import { get, post, put, del } from '@/shared/api/http'
import { type Attempt, type Form, type Question } from './model'

export interface FormPayload {
  title: string
  description?: string
  questions: Question[]
}

export const formsApi = {
  list(): Promise<Form[]> {
    return get<Form[]>('/forms')
  },
  get(id: string): Promise<Form> {
    return get<Form>(`/forms/${id}`)
  },
  create(payload: FormPayload): Promise<Form> {
    return post<Form>('/forms', payload)
  },
  update(id: string, payload: FormPayload): Promise<Form> {
    return put<Form>(`/forms/${id}`, payload)
  },
  remove(id: string): Promise<void> {
    return del(`/forms/${id}`)
  },
  publish(id: string): Promise<Form> {
    return post<Form>(`/forms/${id}/publish`)
  },
  unpublish(id: string): Promise<Form> {
    return post<Form>(`/forms/${id}/unpublish`)
  },
  attempts(id: string): Promise<Attempt[]> {
    return get<Attempt[]>(`/forms/${id}/attempts`)
  },
}
