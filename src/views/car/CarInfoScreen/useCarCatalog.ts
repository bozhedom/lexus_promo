import { useEffect, useState } from 'react'

import { DEFAULT_CAR_CATALOG, fetchCarCatalog } from '@/shared/config/car-data'

/** Каталог из админки; до ответа и при сбое остаётся встроенный список. */
export function useCarCatalog() {
  const [catalog, setCatalog] = useState(DEFAULT_CAR_CATALOG)

  useEffect(() => {
    let active = true
    fetchCarCatalog()
      .then((configured) => {
        if (active) setCatalog(configured)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return catalog
}
