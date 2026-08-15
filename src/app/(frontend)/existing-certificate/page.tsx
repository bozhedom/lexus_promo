import { ExistingCertificateScreen } from '@/views/existing-certificate'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Ваш пригласительный')

export default function ExistingCertificatePage() {
  return <ExistingCertificateScreen />
}
