import { createBrowserRouter } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ItemsPage } from '@/features/admin/ItemsPage'
import { EditItemPage, NewItemPage } from '@/features/admin/ItemEditorPages'
import { LossReportsPage } from '@/features/admin/LossReportsPage'
import { OfficeSettingsPage } from '@/features/admin/OfficeSettingsPage'
import { OutboxPage } from '@/features/admin/OutboxPage'
import { RequestDetailPage } from '@/features/admin/RequestDetailPage'
import { RequestsPage } from '@/features/admin/RequestsPage'
import { StaffItemPage } from '@/features/admin/StaffItemPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/public/HomePage'
import { ItemPage } from '@/features/public/ItemPage'
import { LossReportPage } from '@/features/public/LossReportPage'
import { LossReportStatusPage } from '@/features/public/LossReportStatusPage'
import { NotFoundPage } from '@/features/public/NotFoundPage'
import { OrganisationPage } from '@/features/public/OrganisationPage'
import { RequestStatusPage } from '@/features/public/RequestStatusPage'
import { SearchPage } from '@/features/public/SearchPage'
import { RequireStaff } from './RequireStaff'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/suche', element: <SearchPage /> },
          { path: '/o/:slug', element: <OrganisationPage /> },
          { path: '/fund/:id', element: <ItemPage /> },
          { path: '/verlust-melden', element: <LossReportPage /> },
          { path: '/status/anfrage/:token', element: <RequestStatusPage /> },
          { path: '/status/meldung/:token', element: <LossReportStatusPage /> },
          { path: '/anmelden', element: <LoginPage /> },
          { path: '/registrieren', element: <RegisterPage /> },
          { path: '*', element: <NotFoundPage /> },
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
          { index: true, element: <ItemsPage /> },
          { path: 'neu', element: <NewItemPage /> },
          { path: 'gegenstand/:id', element: <StaffItemPage /> },
          { path: 'gegenstand/:id/bearbeiten', element: <EditItemPage /> },
          { path: 'anfragen', element: <RequestsPage /> },
          { path: 'anfragen/:id', element: <RequestDetailPage /> },
          { path: 'meldungen', element: <LossReportsPage /> },
          { path: 'postausgang', element: <OutboxPage /> },
          { path: 'fundstelle', element: <OfficeSettingsPage /> },
        ],
      },
    ],
  },
])
