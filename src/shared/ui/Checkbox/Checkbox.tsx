import clsx from 'clsx'
import type { InputHTMLAttributes, ReactNode } from 'react'

import styles from './Checkbox.module.scss'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode
}

export function Checkbox({ children, className, ...rest }: CheckboxProps) {
  return (
    <label className={clsx(styles.wrap, className)}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden />
      <span className={styles.text}>{children}</span>
    </label>
  )
}
