"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from '@/components/ui'
import { downloadAppBackup, parseAppBackup, readBackupFile } from '@/lib/appBackup'
import { loadAppState, saveAppState } from '@/lib/storage'

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Сегодня' },
  { href: '/month', label: 'Месяц' },
  { href: '/nutrition', label: 'Питание' },
  { href: '/home', label: 'Дом' },
  { href: '/workouts', label: 'Тренировки' },
]

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const text = await readBackupFile(file)
      const backup = parseAppBackup(text)

      const confirmed = window.confirm('Импорт заменит текущие данные приложения.Продолжить?')

      if (!confirmed) {
        return
      }

      saveAppState(backup.data)
      window.location.reload()
    } catch {
      window.alert('Не удалось импортировать файл')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <nav
      className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8"
      aria-label="Основная навигация"
    >
      <div className="relative">
        <div className="surface-card flex items-center justify-between gap-3 rounded-3xl border border-rose-200/70 px-3 py-2.5">
          <Link
            href="/"
            className="group inline-flex min-w-0 items-center gap-3 rounded-2xl px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50"
            aria-label="MightyBloom на главную"
          >
            <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[1.15rem] border border-rose-200/80 bg-gradient-to-br from-pink-200 via-rose-100 to-white shadow-[0_14px_28px_-18px_rgba(244,63,94,0.95)] sm:h-15 sm:w-15">
              <span className="text-3xl leading-none" aria-hidden="true">
                🌸
              </span>
              <span className="pointer-events-none absolute -right-1 -top-1 rounded-full border border-white/80 bg-rose-300 px-1 py-0 text-[9px] font-black tracking-[0.14em] text-white shadow-sm">
                POP
              </span>
            </span>
            <span className="min-w-0 pr-1">
              <span
                className="block truncate text-[1.38rem] leading-none font-light tracking-[0.12em] text-rose-950 sm:text-[1.52rem]"
                style={{ fontFamily: '"Didot", "Bodoni MT", "Times New Roman", serif' }}
              >
                MightyBloom
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="group relative inline-flex h-14 w-11 items-center justify-center rounded-2xl border border-rose-200/80 bg-white/75 text-rose-900 shadow-[0_10px_20px_-16px_rgba(225,29,72,0.7)] transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50"
            aria-expanded={isOpen}
            aria-controls="main-nav-menu"
            aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <span
              className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-rose-200/80"
              aria-hidden="true"
            />
            <span
              className={`relative block h-8 w-[3px] rounded-full bg-current transition-all duration-200 ${
                isOpen ? 'rotate-90' : 'rotate-0'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          id="main-nav-menu"
          className={`absolute right-0 top-[calc(100%+0.55rem)] z-30 w-[min(20rem,100%)] origin-top-right rounded-3xl border border-rose-200/80 bg-white/88 p-2 shadow-[0_24px_54px_-28px_rgba(190,24,93,0.5)] backdrop-blur-xl transition duration-200 ${
            isOpen
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
          }`}
        >
          <div className="paper-grid rounded-2xl border border-white/70 bg-gradient-to-b from-rose-50/60 to-pink-50/70 p-2">
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = isActiveRoute(pathname, item.href)
                const classes = isActive
                  ? 'inline-flex min-h-11 items-center rounded-2xl border border-rose-300/80 bg-gradient-to-br from-rose-200 to-pink-200 px-3.5 py-2 text-sm font-semibold text-rose-950 shadow-[0_10px_20px_-14px_rgba(190,24,93,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50'
                  : 'inline-flex min-h-11 items-center rounded-2xl border border-transparent bg-white/55 px-3.5 py-2 text-sm font-semibold text-rose-800/90 transition hover:border-rose-200 hover:bg-rose-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50'

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={classes}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="my-2 h-px bg-gradient-to-r from-transparent via-rose-200 to-transparent" />

            <div className="flex flex-col gap-1.5">
              <Button
                onClick={() => downloadAppBackup(loadAppState())}
                type="button"
                variant="secondary"
                className="w-full justify-start"
              >
                Скачать данные
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
                className="w-full justify-start"
              >
                Загрузить данные
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
