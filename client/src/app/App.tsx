import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Header } from '@/widgets/header'
import { AdminPage } from '@/pages/admin'
import { EditorPage } from '@/pages/form-editor'
import { NotFoundPage } from '@/pages/not-found'
import { PublicFormPage } from '@/pages/public-form'
import { ResponsesPage } from '@/pages/responses'

function AdminLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminPage />} />
        <Route path="forms/:id" element={<EditorPage />} />
        <Route path="forms/:id/responses" element={<ResponsesPage />} />
      </Route>
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
