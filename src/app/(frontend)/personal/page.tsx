import { ContactScreen } from '@/views/contact'
import { privateScreen } from '@/shared/config/site'

export const metadata = privateScreen('Ваши данные')

export default function PersonalPage() {
  return <ContactScreen />
}
