'use client'

import React, { useEffect, useState } from 'react'

import styles from './FunnelDashboard.module.scss'

interface Step {
  key: string
  label: string
  sessions: number
  ofFirst: number
  ofPrev: number
  dropped: number
}

interface Summary {
  steps: Step[]
  applications: { total: number; completed: number; api: number; manual: number }
  brands: Array<{ brand: string; count: number }>
  actions: Record<string, number>
}

const PERIODS = [
  { value: 'today', label: 'Сегодня' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: 'all', label: 'Всё время' },
]

function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export function FunnelDashboard() {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ответ на прошлый период может прийти позже нового, поэтому флаг
    let alive = true
    fetch(`/api/funnel?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((json) => {
        if (!alive) return
        setData(json)
        setError('')
      })
      .catch(() => alive && setError('Не удалось загрузить сводку'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [period])

  const choose = (next: string) => {
    if (next === period) return
    setLoading(true)
    setPeriod(next)
  }

  // худшим считаем шаг, на котором потеряли больше всего людей
  const worst = data?.steps.reduce(
    (acc, s) => (s.dropped > (acc?.dropped ?? 0) ? s : acc),
    null as Step | null,
  )

  const app = data?.applications
  const identified = app ? app.api + app.manual : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Как проходит воронка</h2>
          <p className={styles.hint}>
            Считаем по людям: один человек за один визит учитывается один раз
          </p>
        </div>
        <div className={styles.periods}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.period} ${p.value === period ? styles.periodActive : ''}`}
              onClick={() => choose(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className={styles.state}>Загружаем…</p>}
      {error && <p className={styles.state}>{error}</p>}

      {data && !loading && (
        <>
          <div className={styles.funnel}>
            {data.steps.map((s, i) => (
              <div
                key={s.key}
                className={`${styles.step} ${worst && worst.key === s.key ? styles.worst : ''}`}
              >
                <div className={styles.stepLabel}>
                  {i + 1}. {s.label}
                </div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${s.ofFirst}%` }} />
                  <div className={styles.barValue}>
                    {s.sessions} {plural(s.sessions, 'человек', 'человека', 'человек')}
                  </div>
                </div>
                <div className={styles.stepMeta}>
                  {i === 0
                    ? '100% начали'
                    : `${s.ofFirst}% от начала · дошли ${s.ofPrev}%${
                        s.dropped ? ` · ушли ${s.dropped}` : ''
                      }`}
                </div>
              </div>
            ))}
          </div>

          {worst && worst.dropped > 0 && (
            <p className={styles.hint} style={{ marginBottom: 20 }}>
              Больше всего людей теряется на шаге «{worst.label}»: не дошли {worst.dropped}.
            </p>
          )}

          <div className={styles.tiles}>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Заявок за период</p>
              <div className={styles.tileValue}>{app?.total ?? 0}</div>
              <p className={styles.tileNote}>из них доведено до конца: {app?.completed ?? 0}</p>
            </div>

            <div className={styles.tile}>
              <p className={styles.tileLabel}>Машина определилась сама</p>
              <div className={styles.tileValue}>
                {identified ? Math.round(((app?.api ?? 0) / identified) * 100) : 0}%
              </div>
              <p className={styles.tileNote}>
                по номеру {app?.api ?? 0}, вручную {app?.manual ?? 0}
              </p>
            </div>

            <div className={styles.tile}>
              <p className={styles.tileLabel}>Сохранили пригласительный</p>
              <div className={styles.tileValue}>{data.actions.certificate_saved ?? 0}</div>
              <p className={styles.tileNote}>
                перешли по ссылкам в конце: {data.actions.outbound_click ?? 0}
              </p>
            </div>

            <div className={styles.tile}>
              <p className={styles.tileLabel}>Авто не нашлось по номеру</p>
              <div className={styles.tileValue}>{data.actions.car_not_found ?? 0}</div>
              <p className={styles.tileNote}>
                ошиблись при вводе номера: {data.actions.plate_error ?? 0}
              </p>
            </div>

            <div className={styles.tile}>
              <p className={styles.tileLabel}>Частые марки</p>
              {data.brands.length ? (
                <ul className={styles.brands}>
                  {data.brands.map((b) => (
                    <li key={b.brand}>
                      <span>{b.brand}</span>
                      <span>{b.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.tileNote}>пока нет данных</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default FunnelDashboard
