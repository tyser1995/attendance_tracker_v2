import { getSettings } from '@/lib/settings/getSettings'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { InitialPageForm } from '@/components/settings/InitialPageForm'
import { BackupSection } from '@/components/settings/BackupSection'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Initial Page</h2>
        </CardHeader>
        <CardBody>
          <InitialPageForm initialPage={settings.initialPage} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-zinc-900">Data Backup &amp; Restore</h2>
        </CardHeader>
        <CardBody>
          <BackupSection />
        </CardBody>
      </Card>
    </div>
  )
}
