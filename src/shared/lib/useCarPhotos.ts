'use client'

import { useEffect, useState } from 'react'

import type { CarPhoto } from '@/shared/config/car-photos'

/**
 * Кадры автомобилей из админки. Запрос уходит один раз на вкладку: список
 * общий для всех пригласительных на странице, и перезапрашивать его на каждое
 * превью незачем.
 */
let pending: Promise<CarPhoto[]> | null = null
let loaded: CarPhoto[] = []

export function fetchCarPhotos(): Promise<CarPhoto[]> {
  pending ??= fetch('/api/car-photos')
    .then((res) => (res.ok ? res.json() : { photos: [] }))
    .then((body: { photos?: CarPhoto[] }) => {
      loaded = Array.isArray(body.photos) ? body.photos : []
      return loaded
    })
    .catch(() => {
      // Без админских кадров пригласительное рисуется на встроенных: пустой
      // список — рабочее состояние, а не ошибка.
      pending = null
      return []
    })
  return pending
}

export function useCarPhotos(): CarPhoto[] {
  const [photos, setPhotos] = useState<CarPhoto[]>(loaded)

  useEffect(() => {
    let alive = true
    fetchCarPhotos().then((next) => {
      if (alive && next.length > 0) setPhotos(next)
    })
    return () => {
      alive = false
    }
  }, [])

  return photos
}
