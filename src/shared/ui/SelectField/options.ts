export interface SelectOption {
  value: string
  label: string
  /** Приоритетный пункт: стоит наверху списка и подсвечен золотом. */
  featured?: boolean
  /** Отчеркнуть группу: линия рисуется под этим пунктом. */
  divider?: boolean
}

/** Поиск по первым буквам: «то» -> Toyota. Набранное живёт 900 мс. */
export function createTypeahead(window = 900) {
  const state = { text: '', at: 0 }
  return (key: string, options: SelectOption[]) => {
    const now = Date.now()
    state.text = now - state.at > window ? key : state.text + key
    state.at = now
    const query = state.text.toLowerCase()
    return options.findIndex((option) => option.label.toLowerCase().startsWith(query))
  }
}
