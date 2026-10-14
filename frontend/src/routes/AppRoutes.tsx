import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentCommunitiesPage from '../pages/student/StudentCommunitiesPage'
import JournalPage from '../pages/journal/JournalPage'
import NewsDetailPage from '../pages/journal/NewsDetailPage'
import CreateNewsPage from '../pages/journal/CreateNewsPage'
import EditNewsPage from '../pages/journal/EditNewsPage'
import StudentCommunityDetailPage from '../pages/student/StudentCommunityDetailPage'
import ProfilePage from '../pages/ProfilePage'
import DirectorDashboard from '../pages/director/DirectorDashboard'
import DirectorUsersPage from '../pages/director/DirectorUsersPage'
import DirectorCreateUserPage from '../pages/director/DirectorCreateUserPage'
import DirectorEditUserPage from '../pages/director/DirectorEditUserPage'
import DirectorCommunitiesPage from '../pages/director/DirectorCommunitiesPage'
import DirectorCreateCommunityPage from '../pages/director/DirectorCreateCommunityPage'
import DirectorCommunityDetailPage from '../pages/director/DirectorCommunityDetailPage'
import TeacherDashboard from '../pages/teacher/TeacherDashboard'
import TeacherCommunitiesPage from '../pages/teacher/TeacherCommunitiesPage'
import TeacherEditCommunityPage from '../pages/teacher/TeacherEditCommunityPage'
import LoginPage from '../pages/LoginPage'
import RegisterStudentPage from '../pages/RegisterStudentPage'
import AccessDeniedPage from '../pages/AccessDeniedPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import ModerationPreviewPage from '../pages/moderation/ModerationPreviewPage'
import HomeRedirect from './HomeRedirect'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterStudentPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/acesso-negado" element={<AccessDeniedPage />} />

      {/* Protótipo isolado: somente dados fictícios, sem integração com APIs. */}
      <Route path="/preview/moderacao" element={<ModerationPreviewPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
        <Route element={<AppLayout />}>
          <Route path="/aluno/inicio" element={<StudentDashboard />} />
          <Route path="/aluno/jornal" element={<JournalPage />} />
          <Route path="/aluno/jornal/:noticiaId" element={<NewsDetailPage />} />
          <Route path="/aluno/comunidades" element={<StudentCommunitiesPage />} />
          <Route path="/aluno/comunidades/:comunidadeId" element={<StudentCommunityDetailPage />} />
          <Route path="/aluno/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
        <Route element={<AppLayout />}>
          <Route path="/professor/inicio" element={<TeacherDashboard />} />
          <Route path="/professor/jornal" element={<JournalPage />} />
          <Route path="/professor/jornal/:noticiaId" element={<NewsDetailPage />} />
          <Route path="/professor/jornal/nova" element={<CreateNewsPage />} />
          <Route path="/professor/jornal/:noticiaId/editar" element={<EditNewsPage />} />
          <Route path="/professor/comunidades" element={<TeacherCommunitiesPage />} />
          <Route path="/professor/comunidades/nova" element={<DirectorCreateCommunityPage />} />
          <Route path="/professor/comunidades/:comunidadeId" element={<DirectorCommunityDetailPage />} />
          <Route path="/professor/comunidades/:comunidadeId/editar" element={<TeacherEditCommunityPage />} />
          <Route path="/professor/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['DIRECAO']} />}>
        <Route element={<AppLayout />}>
          <Route path="/diretor/inicio" element={<DirectorDashboard />} />
          <Route path="/diretor/jornal" element={<JournalPage />} />
          <Route path="/diretor/jornal/:noticiaId" element={<NewsDetailPage />} />
          <Route path="/diretor/jornal/nova" element={<CreateNewsPage />} />
          <Route path="/diretor/jornal/:noticiaId/editar" element={<EditNewsPage />} />
          <Route path="/diretor/comunidades" element={<DirectorCommunitiesPage />} />
          <Route path="/diretor/comunidades/nova" element={<DirectorCreateCommunityPage />} />
          <Route path="/diretor/comunidades/:comunidadeId" element={<DirectorCommunityDetailPage />} />
          <Route path="/diretor/usuarios" element={<DirectorUsersPage />} />
          <Route path="/diretor/usuarios/novo" element={<DirectorCreateUserPage />} />
          <Route path="/diretor/usuarios/:usuarioId/editar" element={<DirectorEditUserPage />} />
          <Route path="/diretor/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
