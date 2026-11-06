import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Spinner } from '@/components/ui/Feedback'
import { RequireStaff } from '@/features/admin/RequireStaff'
import { HomePage } from '@/features/public/HomePage'
import { RouteError } from './RouteError'

/** Seiten werden bei Bedarf geladen (kleineres Start-Bundle). Routen gemäss docs/concept.md Abschnitt 7. */
const page = (path: string | undefined, load: () => Promise<{ Component: React.ComponentType }>): RouteObject =>
  path === undefined ? { index: true, lazy: load } : { path, lazy: load }

const lazyPublic = {
  search: () => import('@/features/public/SearchPage').then((m) => ({ Component: m.SearchPage })),
  item: () => import('@/features/public/ItemPage').then((m) => ({ Component: m.ItemPage })),
  offices: () => import('@/features/public/OfficesPage').then((m) => ({ Component: m.OfficesPage })),
  office: () => import('@/features/public/OfficePage').then((m) => ({ Component: m.OfficePage })),
  report: () => import('@/features/public/LossReportPage').then((m) => ({ Component: m.LossReportPage })),
  myLoss: () => import('@/features/public/MyLossPage').then((m) => ({ Component: m.MyLossPage })),
  found: () => import('@/features/public/FoundPage').then((m) => ({ Component: m.FoundPage })),
  myClaim: () => import('@/features/public/MyClaimPage').then((m) => ({ Component: m.MyClaimPage })),
  help: () => import('@/features/public/HelpPage').then((m) => ({ Component: m.HelpPage })),
  myReports: () => import('@/features/public/MyReportsPage').then((m) => ({ Component: m.MyReportsPage })),
  login: () => import('@/features/admin/LoginPage').then((m) => ({ Component: m.LoginPage })),
  notFound: () => import('@/features/public/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
}

const lazyAdmin = {
  overview: () => import('@/features/admin/OverviewPage').then((m) => ({ Component: m.OverviewPage })),
  items: () => import('@/features/admin/ItemsPage').then((m) => ({ Component: m.ItemsPage })),
  newItem: () => import('@/features/admin/NewItemPage').then((m) => ({ Component: m.NewItemPage })),
  item: () => import('@/features/admin/ItemDetailPage').then((m) => ({ Component: m.ItemDetailPage })),
  reports: () => import('@/features/admin/ReportsPage').then((m) => ({ Component: m.ReportsPage })),
  report: () => import('@/features/admin/ReportDetailPage').then((m) => ({ Component: m.ReportDetailPage })),
  claims: () => import('@/features/admin/ClaimsPage').then((m) => ({ Component: m.ClaimsPage })),
  claim: () => import('@/features/admin/ClaimDetailPage').then((m) => ({ Component: m.ClaimDetailPage })),
  outbox: () => import('@/features/admin/OutboxPage').then((m) => ({ Component: m.OutboxPage })),
  office: () => import('@/features/admin/OfficeProfilePage').then((m) => ({ Component: m.OfficeProfilePage })),
}

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          page('/suche', lazyPublic.search),
          page('/fund/:fundnummer', lazyPublic.item),
          page('/fundstellen', lazyPublic.offices),
          page('/o/:slug', lazyPublic.office),
          page('/verlust-melden', lazyPublic.report),
          page('/verlust/:token', lazyPublic.myLoss),
          page('/gefunden', lazyPublic.found),
          page('/anfrage/:token', lazyPublic.myClaim),
          page('/hilfe', lazyPublic.help),
          page('/meine-meldungen', lazyPublic.myReports),
          page('/verwaltung/login', lazyPublic.login),
          page('*', lazyPublic.notFound),
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
          page(undefined, lazyAdmin.overview),
          page('funde', lazyAdmin.items),
          page('funde/neu', lazyAdmin.newItem),
          page('funde/:id', lazyAdmin.item),
          page('meldungen', lazyAdmin.reports),
          page('meldungen/:id', lazyAdmin.report),
          page('anfragen', lazyAdmin.claims),
          page('anfragen/:id', lazyAdmin.claim),
          page('postausgang', lazyAdmin.outbox),
          page('fundstelle', lazyAdmin.office),
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
