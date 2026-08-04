'use client'

import React from 'react'

// Кнопка над списком заявок: скачивает CSV (эндпоинт закрыт авторизацией).
export function ExportApplicationsButton() {
  return (
    <div style={{ marginBottom: 'var(--base, 20px)' }}>
      <a
        className="btn btn--style-secondary btn--size-small"
        href="/api/export/applications"
        download
      >
        Скачать CSV
      </a>
    </div>
  )
}

export default ExportApplicationsButton
