import Image from 'next/image'

import { Button } from '@/shared/ui'
import styles from './MessengerButton.module.scss'

interface MessengerButtonProps {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}

export function MessengerButton({ icon, label, disabled, onClick }: MessengerButtonProps) {
  return (
    <div className={styles.wrap}>
      <Button
        variant="outline"
        className={styles.btn}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        <Image src={icon} alt="" width={48} height={48} className={styles.icon} />
      </Button>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
