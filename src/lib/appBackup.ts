import type { AppState } from '@/types/app.types'

export function downloadAppBackup(appState: AppState) {
  const backup = {
    backupVersion: 1,
    app: 'mightybloom',
    exportedAt: new Date().toISOString(),
    data: appState,
  }
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mightybloom-backup.json'

  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function readBackupFile(file: File): Promise<string> {
  return file.text()
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Record<string, unknown>
  const goals = state.goals as Record<string, unknown> | undefined
  const streaks = state.streaks as Record<string, unknown> | undefined

  return (
    state.version === 1 &&
    !!goals &&
    typeof goals === 'object' &&
    typeof goals.waterMl === 'number' &&
    typeof goals.steps === 'number' &&
    typeof goals.sleepHours === 'number' &&
    !!state.metricsByDate &&
    typeof state.metricsByDate === 'object' &&
    Array.isArray(state.foodItems) &&
    !!state.foodLogByDate &&
    typeof state.foodLogByDate === 'object' &&
    Array.isArray(state.chores) &&
    !!state.choreLogByDate &&
    typeof state.choreLogByDate === 'object' &&
    !!state.workoutLogByDate &&
    typeof state.workoutLogByDate === 'object' &&
    Array.isArray(state.monthTrackers) &&
    !!state.monthTrackerLogByDate &&
    typeof state.monthTrackerLogByDate === 'object' &&
    !!state.stickersByDate &&
    typeof state.stickersByDate === 'object' &&
    !!streaks &&
    typeof streaks === 'object' &&
    typeof streaks.currentDays === 'number' &&
    typeof streaks.bestDays === 'number'
  )
}

export function parseAppBackup(jsonText: string) {
  const backup = JSON.parse(jsonText)

  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file')
  }

  if (backup.backupVersion !== 1) {
    throw new Error('Unsupported backup version')
  }

  if (backup.app !== 'mightybloom') {
    throw new Error('Invalid app backup')
  }

  if (!isAppState(backup.data)) {
    throw new Error('Backup data is invalid')
  }

  return backup
}
