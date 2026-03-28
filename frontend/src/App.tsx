import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Layout } from '@/components/layout/Layout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ToastProvider, Toaster } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useAuthStore } from '@/store/auth.store'

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((m) => ({
    default: m.RegisterPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const EditProfilePage = lazy(() =>
  import('@/pages/EditProfilePage').then((m) => ({
    default: m.EditProfilePage,
  })),
)
const CoursesPage = lazy(() =>
  import('@/pages/CoursesPage').then((m) => ({ default: m.CoursesPage })),
)
const CourseDetailPage = lazy(() =>
  import('@/pages/CourseDetailPage').then((m) => ({
    default: m.CourseDetailPage,
  })),
)
const ProfessorsPage = lazy(() =>
  import('@/pages/ProfessorsPage').then((m) => ({
    default: m.ProfessorsPage,
  })),
)
const ProfessorDetailPage = lazy(() =>
  import('@/pages/ProfessorDetailPage').then((m) => ({
    default: m.ProfessorDetailPage,
  })),
)
const MaterialsPage = lazy(() =>
  import('@/pages/MaterialsPage').then((m) => ({
    default: m.MaterialsPage,
  })),
)
const MaterialUploadPage = lazy(() =>
  import('@/pages/MaterialUploadPage').then((m) => ({
    default: m.MaterialUploadPage,
  })),
)
const MaterialDetailPage = lazy(() =>
  import('@/pages/MaterialDetailPage').then((m) => ({
    default: m.MaterialDetailPage,
  })),
)
const ForumPage = lazy(() =>
  import('@/pages/ForumPage').then((m) => ({ default: m.ForumPage })),
)
const AskQuestionPage = lazy(() =>
  import('@/pages/AskQuestionPage').then((m) => ({
    default: m.AskQuestionPage,
  })),
)
const QuestionDetailPage = lazy(() =>
  import('@/pages/QuestionDetailPage').then((m) => ({
    default: m.QuestionDetailPage,
  })),
)
const GroupsPage = lazy(() =>
  import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsPage })),
)
const FindTeamPage = lazy(() =>
  import('@/pages/FindTeamPage').then((m) => ({ default: m.FindTeamPage })),
)
const GroupDetailPage = lazy(() =>
  import('@/pages/GroupDetailPage').then((m) => ({
    default: m.GroupDetailPage,
  })),
)
const DeadlinesPage = lazy(() =>
  import('@/pages/DeadlinesPage').then((m) => ({
    default: m.DeadlinesPage,
  })),
)
const MarketplacePage = lazy(() =>
  import('@/pages/MarketplacePage').then((m) => ({
    default: m.MarketplacePage,
  })),
)
const NewListingPage = lazy(() =>
  import('@/pages/NewListingPage').then((m) => ({
    default: m.NewListingPage,
  })),
)
const ListingDetailPage = lazy(() =>
  import('@/pages/ListingDetailPage').then((m) => ({
    default: m.ListingDetailPage,
  })),
)
const EventsPage = lazy(() =>
  import('@/pages/EventsPage').then((m) => ({ default: m.EventsPage })),
)
const EventDetailPage = lazy(() =>
  import('@/pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/AnalyticsPage').then((m) => ({
    default: m.AnalyticsPage,
  })),
)
const FriendsPage = lazy(() =>
  import('@/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
)

function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  return <Layout />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min — show cached data instantly, refetch in background
      gcTime: 10 * 60 * 1000,   // 10 min — keep unused data for back-navigation
      retry: 1,
      refetchOnMount: 'always',  // always refetch when component mounts (navigating to page)
      refetchOnWindowFocus: false, // don't spam refetch on tab switch
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route element={<ProtectedLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="/profile/edit" element={<EditProfilePage />} />
                  <Route path="/profile/:id" element={<ProfilePage />} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/courses/:id" element={<CourseDetailPage />} />
                  <Route path="/professors" element={<ProfessorsPage />} />
                  <Route path="/professors/:id" element={<ProfessorDetailPage />} />
                  <Route path="/materials" element={<MaterialsPage />} />
                  <Route path="/materials/upload" element={<MaterialUploadPage />} />
                  <Route path="/materials/:id" element={<MaterialDetailPage />} />
                  <Route path="/forum" element={<ForumPage />} />
                  <Route path="/forum/ask" element={<AskQuestionPage />} />
                  <Route path="/forum/:id" element={<QuestionDetailPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/groups/find" element={<FindTeamPage />} />
                  <Route path="/groups/:id" element={<GroupDetailPage />} />
                  <Route path="/deadlines" element={<DeadlinesPage />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/marketplace/new" element={<NewListingPage />} />
                  <Route path="/marketplace/:id" element={<ListingDetailPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
            <Toaster />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
