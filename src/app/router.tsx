import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PlaceholderPage } from '@/components/ui/PlaceholderPage'
import { HomePage } from '@/features/public/HomePage'
import { t } from '@/i18n/de-CH'
import { RouteError } from './RouteError'

/** Seiten, die in späteren Etappen gebaut werden, sind vorerst Platzhalter (Routen gemäss docs/concept.md Abschnitt 7). */
const placeholder = (path: string, title: string): RouteObject => ({ path, element: <PlaceholderPage title={title} /> })

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          placeholder('/suche', t.pages.search.title),
          placeholder('/fund/:fundnummer', t.pages.item.title),
          placeholder('/fundstellen', t.pages.offices.title),
          placeholder('/o/:slug', t.pages.office.title),
          placeholder('/verlust-melden', t.pages.reportLoss.title),
          placeholder('/verlust/:token', t.pages.myLoss.title),
          placeholder('/gefunden', t.pages.found.title),
          placeholder('/anfrage/:token', t.pages.myClaim.title),
          placeholder('/hilfe', t.pages.help.title),
          placeholder('/verwaltung/login', t.admin.login.title),
          { path: '*', element: <PlaceholderPage title={t.pages.notFound.title}>{t.pages.notFound.text}</PlaceholderPage> },
        ],
      },
      {
        path: '/verwaltung',
        element: <AdminLayout />,
        children: [
          { index: true, element: <PlaceholderPage title={t.admin.overview.title} /> },
          placeholder('funde', t.admin.items.title),
          placeholder('funde/neu', t.admin.newItem.title),
          placeholder('funde/:id', t.admin.items.title),
          placeholder('meldungen', t.admin.lossReports.title),
          placeholder('anfragen', t.admin.claims.title),
          placeholder('postausgang', t.admin.outbox.title),
          placeholder('fundstelle', t.admin.office.title),
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
