import { useParams } from 'react-router-dom'
import { PublicForm } from '@/widgets/public-form'

export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <div className="min-h-screen bg-canvas">
      <PublicForm slug={slug ?? ''} />
    </div>
  )
}
