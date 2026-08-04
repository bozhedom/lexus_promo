import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

import styles from './Button.module.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline'
  block?: boolean
}

export function Button({
  variant = 'solid',
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(styles.btn, styles[variant], block && styles.block, className)}
      {...rest}
    />
  )
}
