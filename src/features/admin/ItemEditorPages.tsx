import { useNavigate, useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { ItemForm } from './ItemForm'
import { useSaveItem, useStaffItem } from './queries'

export const NewItemPage = () => {
  const navigate = useNavigate()
  const save = useSaveItem()
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to="/verwaltung" />
      <PageHeader title="Fundgegenstand erfassen" description="Die Fundnummer wird beim Speichern automatisch vergeben." />
      <ItemForm
        submitLabel="Gegenstand speichern"
        onCancel={() => navigate('/verwaltung')}
        onSubmit={async (input) => {
          const id = await save.mutateAsync({ input })
          navigate(`/verwaltung/gegenstand/${id}`, { state: { created: true }, replace: true })
        }}
      />
    </div>
  )
}

export const EditItemPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const item = useStaffItem(id)
  const save = useSaveItem()

  if (item.isPending) return <Spinner />
  if (item.isError) return <ErrorState error={item.error} />
  if (!item.data) return <EmptyState title="Gegenstand nicht gefunden">Er gehört nicht zu Ihrer Organisation oder wurde gelöscht.</EmptyState>

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to={`/verwaltung/gegenstand/${id}`} />
      <PageHeader title="Gegenstand bearbeiten" eyebrow={<span className="font-mono">{item.data.itemNumber}</span>} />
      <ItemForm
        item={item.data}
        submitLabel="Änderungen speichern"
        onCancel={() => navigate(`/verwaltung/gegenstand/${id}`)}
        onSubmit={async (input) => {
          await save.mutateAsync({ id, input })
          navigate(`/verwaltung/gegenstand/${id}`, { state: { saved: true }, replace: true })
        }}
      />
    </div>
  )
}
