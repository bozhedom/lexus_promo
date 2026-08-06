'use client'

import { useEffect, useState } from 'react'

const loaded = new Set<string>()
const pending = new Map<string, Promise<void>>()

const loadOne = (src: string): Promise<void> => {
  if (loaded.has(src)) return Promise.resolve()
  const current = pending.get(src)
  if (current) return current

  const task = new Promise<void>((resolve) => {
    const image = new window.Image()
    image.fetchPriority = 'high'
    const finish = () => {
      loaded.add(src)
      pending.delete(src)
      resolve()
    }
    image.onload = () => {
      if (typeof image.decode === 'function') image.decode().catch(() => undefined).finally(finish)
      else finish()
    }
    // Ошибка одного декоративного файла не должна оставлять экран чёрным.
    image.onerror = finish
    image.src = src
  })
  pending.set(src, task)
  return task
}

export const preloadSceneAssets = (sources: readonly string[]): Promise<void> =>
  Promise.all(sources.map(loadOne)).then(() => undefined)

export function useSceneAssets(sources: readonly string[]): boolean {
  // При переходе между экранами сцены эти ассеты уже находятся в нашем кэше.
  // Не начинаем новый экран с `false`, иначе StageLayout на один кадр скрывается
  // целиком и пользователь видит неприятный рывок перед загрузкой автомобиля.
  const [ready, setReady] = useState(() => sources.every((src) => loaded.has(src)))
  const key = sources.join('|')

  useEffect(() => {
    let active = true
    const list = key ? key.split('|') : []
    preloadSceneAssets(list).then(() => active && setReady(true))
    return () => {
      active = false
    }
  }, [key])

  return ready
}
