import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { isSupabaseConfigured } from '@/lib/env'
import { router } from './app/router'
import { SetupNotice } from './app/SetupNotice'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
})

export const App = () => {
  if (!isSupabaseConfigured) return <SetupNotice />
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
