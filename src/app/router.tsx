import { createBrowserRouter } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Spinner } from '@/components/ui/Feedback'
import { RequireStaff } from './RequireStaff'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', lazy: () => import('@/features/public/HomePage').then((m) => ({ Component: m.HomePage })) },
          { path: '/suche', lazy: () => import('@/features/public/SearchPage').then((m) => ({ Component: m.SearchPage })) },
          { path: '/o/:slug', lazy: () => import('@/features/public/OrganisationPage').then((m) => ({ Component: m.OrganisationPage })) },
          { path: '/fund/:id', lazy: () => import('@/features/public/ItemPage').then((m) => ({ Component: m.ItemPage })) },
          { path: '/verlust-melden', lazy: () => import('@/features/public/LossReportPage').then((m) => ({ Component: m.LossReportPage })) },
          { path: '/status/anfrage/:token', lazy: () => import('@/features/public/RequestStatusPage').then((m) => ({ Component: m.RequestStatusPage })) },
          { path: '/status/meldung/:token', lazy: () => import('@/features/public/LossReportStatusPage').then((m) => ({ Component: m.LossReportStatusPage })) },
          { path: '/meine-anfragen', lazy: () => import('@/features/public/MyRequestsPage').then((m) => ({ Component: m.MyRequestsPage })) },
          { path: '/anmelden', lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
          { path: '/registrieren', lazy: () => import('@/features/auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
          { path: '*', lazy: () => import('@/features/public/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
        ],
      },
      {
        path: '/verwaltung',
        element: (
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        ),
        children: [
          { index: true, lazy: () => import('@/features/admin/ItemsPage').then((m) => ({ Component: m.ItemsPage })) },
          { path: 'neu', lazy: () => import('@/features/admin/ItemEditorPages').then((m) => ({ Component: m.NewItemPage })) },
          { path: 'gegenstand/:id', lazy: () => import('@/features/admin/StaffItemPage').then((m) => ({ Component: m.StaffItemPage })) },
          { path: 'gegenstand/:id/bearbeiten', lazy: () => import('@/features/admin/ItemEditorPages').then((m) => ({ Component: m.EditItemPage })) },
          { path: 'anfragen', lazy: () => import('@/features/admin/RequestsPage').then((m) => ({ Component: m.RequestsPage })) },
          { path: 'anfragen/:id', lazy: () => import('@/features/admin/RequestDetailPage').then((m) => ({ Component: m.RequestDetailPage })) },
          { path: 'meldungen', lazy: () => import('@/features/admin/LossReportsPage').then((m) => ({ Component: m.LossReportsPage })) },
          { path: 'postausgang', lazy: () => import('@/features/admin/OutboxPage').then((m) => ({ Component: m.OutboxPage })) },
          { path: 'fundstelle', lazy: () => import('@/features/admin/OfficeSettingsPage').then((m) => ({ Component: m.OfficeSettingsPage })) },
        ],
      },
    ],
  },
])
