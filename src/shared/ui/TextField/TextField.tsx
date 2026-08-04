import clsx from 'clsx'
import { forwardRef, type InputHTMLAttributes } from 'react'

import styles from './TextField.module.scss'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, className, id, ...rest },
  ref,
) {
  return (
    <label className={styles.wrap} htmlFor={id}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        ref={ref}
        id={id}
        className={clsx(styles.input, error && styles.invalid, className)}
        {...rest}
      />
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
})
