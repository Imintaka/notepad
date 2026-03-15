"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { getCompletedTrackersCount } from "@/lib/dayProgress";
import { formatDateKey, getDateKeysOfMonth, getMonthStart } from "@/lib/dates";
import { recalculateStreaks } from "@/lib/gamification";
import { loadAppState, saveAppState } from "@/lib/storage";
import { getStickerById, getStickerByTrackers } from "@/lib/stickers";
import type { AppState, DayMetrics, MonthTrackerColor } from "@/types/app.types";

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const TRACKER_COLOR_STYLES: Record<
  MonthTrackerColor,
  {
    dot: string;
    fill: string;
    chip: string;
    chipActive: string;
    picker: string;
    pickerActive: string;
  }
> = {
  green: {
    dot: "bg-emerald-500",
    fill: "bg-emerald-200",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chipActive: "border-emerald-400 bg-emerald-200 text-emerald-950",
    picker: "border-emerald-300 bg-emerald-200",
    pickerActive: "ring-2 ring-emerald-400",
  },
  mint: {
    dot: "bg-teal-500",
    fill: "bg-teal-200",
    chip: "border-teal-200 bg-teal-50 text-teal-900",
    chipActive: "border-teal-400 bg-teal-200 text-teal-950",
    picker: "border-teal-300 bg-teal-200",
    pickerActive: "ring-2 ring-teal-400",
  },
  sky: {
    dot: "bg-sky-500",
    fill: "bg-sky-200",
    chip: "border-sky-200 bg-sky-50 text-sky-900",
    chipActive: "border-sky-400 bg-sky-200 text-sky-950",
    picker: "border-sky-300 bg-sky-200",
    pickerActive: "ring-2 ring-sky-400",
  },
  amber: {
    dot: "bg-amber-500",
    fill: "bg-amber-200",
    chip: "border-amber-200 bg-amber-50 text-amber-900",
    chipActive: "border-amber-400 bg-amber-200 text-amber-950",
    picker: "border-amber-300 bg-amber-200",
    pickerActive: "ring-2 ring-amber-400",
  },
  rose: {
    dot: "bg-rose-500",
    fill: "bg-rose-200",
    chip: "border-rose-200 bg-rose-50 text-rose-900",
    chipActive: "border-rose-400 bg-rose-200 text-rose-950",
    picker: "border-rose-300 bg-rose-200",
    pickerActive: "ring-2 ring-rose-400",
  },
};

const TRACKER_COLORS: MonthTrackerColor[] = ["green", "mint", "sky", "amber", "rose"];

function parseMetricValue(raw: string): number | undefined {
  if (!raw.trim()) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function shiftMonth(monthDate: Date, offset: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
}

function createMonthGrid(monthDate: Date): Array<string | null> {
  const monthStart = getMonthStart(monthDate);
  const leadingEmpty = (monthStart.getDay() + 6) % 7;
  const dateKeys = getDateKeysOfMonth(monthDate);
  const cells = [...Array<string | null>(leadingEmpty).fill(null), ...dateKeys];
  const trailingEmpty = (7 - (cells.length % 7)) % 7;

  return [...cells, ...Array<string | null>(trailingEmpty).fill(null)];
}

function getSleepState(metrics: DayMetrics | undefined): "none" | "low" | "medium" | "high" {
  const value = metrics?.sleepHours ?? 0;
  if (value >= 9) {
    return "high";
  }
  if (value >= 6 && value <= 8) {
    return "medium";
  }
  if (value >= 3 && value <= 5) {
    return "low";
  }

  return "none";
}

function generateTrackerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tracker-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function CircleDayNode({
  dateKey,
  day,
  index,
  total,
  selected,
  sleepState,
  stickerImageSrc,
  onClick,
}: {
  dateKey: string;
  day: number;
  index: number;
  total: number;
  selected: boolean;
  sleepState: "none" | "low" | "medium" | "high";
  stickerImageSrc: string | null;
  onClick: () => void;
}) {
  const angle = (360 / total) * index;
  const daySizeClass = total > 30 ? "h-9 w-9 min-h-10 min-w-10 text-[11px]" : "h-10 w-10 text-xs";
  const ringRadius = total > 30 ? 150 : 146;
  const sleepClass =
    sleepState === "high"
      ? "border-emerald-400 bg-emerald-200 text-emerald-900"
      : sleepState === "medium"
        ? "border-amber-400 bg-amber-200 text-amber-900"
        : sleepState === "low"
          ? "border-red-400 bg-red-200 text-red-900"
          : "border-rose-200 bg-white/90 text-rose-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-1/2 top-1/2 flex items-center justify-center rounded-2xl border font-semibold shadow-sm transition duration-200 hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50 ${daySizeClass} ${sleepClass} ${
        selected ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-rose-100" : ""
      }`}
      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${ringRadius}px) rotate(${-angle}deg)` }}
      aria-label={`День ${day}`}
      title={dateKey}
    >
      {day}
      {stickerImageSrc ? (
        <span className="absolute -right-1 -top-1 overflow-hidden rounded-full border border-rose-200 bg-white shadow-sm">
          <Image src={stickerImageSrc} alt="" width={14} height={14} className="h-3.5 w-3.5 object-cover" />
        </span>
      ) : null}
    </button>
  );
}

export function MonthScreen() {
  const [today] = useState(() => new Date());
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(today));
  const [newTrackerTitle, setNewTrackerTitle] = useState("");
  const [newTrackerColor, setNewTrackerColor] = useState<MonthTrackerColor>("green");
  const [activeTrackerId, setActiveTrackerId] = useState<string | null>(null);

  const dateKeys = useMemo(() => getDateKeysOfMonth(monthDate), [monthDate]);
  const monthGrid = useMemo(() => createMonthGrid(monthDate), [monthDate]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric",
      }).format(monthDate),
    [monthDate],
  );

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const selectedMetrics = appState.metricsByDate[selectedDateKey] ?? {};
  const selectedStickerId = appState.stickersByDate[selectedDateKey];
  const selectedSticker = getStickerById(selectedStickerId);
  const activeTracker =
    appState.monthTrackers.find((tracker) => tracker.id === activeTrackerId) ?? appState.monthTrackers[0] ?? null;
  const currentActiveTrackerId = activeTracker?.id ?? null;
  const activeTrackerStyle = activeTracker ? TRACKER_COLOR_STYLES[activeTracker.color] : null;

  const goToMonth = (offset: number) => {
    const nextMonthDate = shiftMonth(monthDate, offset);
    const nextDateKey = formatDateKey(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1));
    setMonthDate(nextMonthDate);
    setSelectedDateKey(nextDateKey);
  };

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
  };

  const updateSelectedMetrics = (partial: Partial<DayMetrics>) => {
    setAppState((prev) => {
      const nextMetrics = {
        ...(prev.metricsByDate[selectedDateKey] ?? {}),
        ...partial,
      };
      const nextMetricsByDate = {
        ...prev.metricsByDate,
        [selectedDateKey]: nextMetrics,
      };
      const completedTrackers = getCompletedTrackersCount(nextMetrics, prev);
      const sticker = getStickerByTrackers(completedTrackers);

      return {
        ...prev,
        metricsByDate: nextMetricsByDate,
        stickersByDate: {
          ...prev.stickersByDate,
          [selectedDateKey]: sticker.id,
        },
        streaks: recalculateStreaks(
          {
            ...prev,
            metricsByDate: nextMetricsByDate,
          },
          today,
        ),
      };
    });
  };

  const addMonthTracker = () => {
    const title = newTrackerTitle.trim();
    if (!title) {
      return;
    }

    const tracker = {
      id: generateTrackerId(),
      title,
      color: newTrackerColor,
    };

    setAppState((prev) => ({
      ...prev,
      monthTrackers: [...prev.monthTrackers, tracker],
    }));
    setNewTrackerTitle("");
    setActiveTrackerId(tracker.id);
  };

  const renameActiveTracker = () => {
    if (!activeTracker || !currentActiveTrackerId) {
      return;
    }

    const nextTitle = window.prompt("Новое название трекера", activeTracker.title)?.trim();
    if (!nextTitle) {
      return;
    }

    setAppState((prev) => ({
      ...prev,
      monthTrackers: prev.monthTrackers.map((tracker) =>
        tracker.id === currentActiveTrackerId ? { ...tracker, title: nextTitle } : tracker,
      ),
    }));
  };

  const deleteActiveTracker = () => {
    if (!currentActiveTrackerId) {
      return;
    }

    const approved = window.confirm("Удалить выбранный трекер и все его отметки в календаре?");
    if (!approved) {
      return;
    }

    setAppState((prev) => {
      const nextTrackers = prev.monthTrackers.filter((tracker) => tracker.id !== currentActiveTrackerId);
      const nextLog: typeof prev.monthTrackerLogByDate = {};

      for (const [dateKey, trackerIds] of Object.entries(prev.monthTrackerLogByDate)) {
        const filteredTrackerIds = trackerIds.filter((trackerId) => trackerId !== currentActiveTrackerId);
        if (filteredTrackerIds.length > 0) {
          nextLog[dateKey] = filteredTrackerIds;
        }
      }

      return {
        ...prev,
        monthTrackers: nextTrackers,
        monthTrackerLogByDate: nextLog,
      };
    });

    setActiveTrackerId(null);
  };

  const toggleActiveTrackerDay = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    if (!currentActiveTrackerId) {
      return;
    }

    setAppState((prev) => {
      const existing = prev.monthTrackerLogByDate[dateKey] ?? [];
      const nextIds = new Set(existing);

      if (nextIds.has(currentActiveTrackerId)) {
        nextIds.delete(currentActiveTrackerId);
      } else {
        nextIds.add(currentActiveTrackerId);
      }

      const nextDateTrackerIds = Array.from(nextIds).sort();
      const nextLog = { ...prev.monthTrackerLogByDate };

      if (nextDateTrackerIds.length === 0) {
        delete nextLog[dateKey];
      } else {
        nextLog[dateKey] = nextDateTrackerIds;
      }

      return {
        ...prev,
        monthTrackerLogByDate: nextLog,
      };
    });
  };

  return (
    <Container className="space-y-5 pb-12">
      <Card className="paper-grid relative overflow-hidden bg-gradient-to-br from-rose-100/80 via-pink-50/95 to-white">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-rose-200/60 blur-2xl" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-rose-950 sm:text-[1.75rem]">Месяц</h1>
            <p className="mt-1 text-sm font-medium text-rose-800/85">Круговой трекер сна и редактирование дня</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-10 px-3" onClick={() => goToMonth(-1)}>
              Назад
            </Button>
            <Button variant="secondary" className="h-10 px-3" onClick={() => goToMonth(1)}>
              Вперед
            </Button>
          </div>
        </div>
        <p className="mt-3 inline-flex rounded-2xl border border-rose-200 bg-white/75 px-3 py-2 text-sm font-semibold capitalize text-rose-900">
          {monthLabel}
        </p>
      </Card>

      <div className="h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />

      <Card className="paper-grid">
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-semibold text-rose-950">Круговой трекер сна</h2>
          <p className="mt-1 max-w-md text-center text-sm text-rose-700">
            Нажми на день, чтобы открыть редактирование. Цвет ячейки зависит от часов сна.
          </p>

          <div className="relative mt-6 h-[360px] w-[360px] rounded-full border-2 border-rose-200/90 bg-rose-50/65 shadow-[0_22px_50px_-35px_rgba(190,24,93,0.65)]">
            <div className="absolute inset-[58px] rounded-full border border-rose-200 bg-white/92 p-4 text-center shadow-inner">
              <p className="mt-5 text-sm font-medium text-rose-700">Трекер сна</p>
              <p className="mt-2 text-xl font-semibold capitalize text-rose-950">{monthLabel}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-rose-800">
                <span className="rounded-full border border-red-300/70 bg-red-200 px-2 py-1 font-semibold text-red-900">сон 3-5 ч</span>
                <span className="rounded-full border border-amber-300/70 bg-amber-200 px-2 py-1 font-semibold text-amber-900">сон 6-8 ч</span>
                <span className="rounded-full border border-emerald-300/70 bg-emerald-200 px-2 py-1 font-semibold text-emerald-900">
                  сон 9+ ч
                </span>
              </div>
            </div>

            {dateKeys.map((dateKey, index) => {
              const day = Number(dateKey.slice(-2));
              const metrics = appState.metricsByDate[dateKey];
              const sleepState = getSleepState(metrics);
              const sticker = getStickerById(appState.stickersByDate[dateKey]);

              return (
                <CircleDayNode
                  key={dateKey}
                  dateKey={dateKey}
                  day={day}
                  index={index}
                  total={dateKeys.length}
                  selected={selectedDateKey === dateKey}
                  sleepState={sleepState}
                  stickerImageSrc={sticker?.imageSrc ?? null}
                  onClick={() => selectDate(dateKey)}
                />
              );
            })}
          </div>
        </div>
      </Card>

      <div className="h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />

      <Card>
        <h2 className="text-lg font-semibold text-rose-950">Резервный вид: трекер-сетка месяца</h2>
        <p className="mt-1 text-sm text-rose-700">Добавь кнопку-трекер и отмечай дни в сетке. У каждого трекера свой календарный слой.</p>

        <div className="mt-4 rounded-2xl border border-rose-200/85 bg-rose-50/60 p-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Например: День без стресса"
              value={newTrackerTitle}
              onChange={(event) => setNewTrackerTitle(event.target.value)}
            />
            <Button className="sm:w-auto" onClick={addMonthTracker}>
              Добавить кнопку
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {TRACKER_COLORS.map((color) => {
              const style = TRACKER_COLOR_STYLES[color];

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTrackerColor(color)}
                  className={`h-10 w-10 rounded-full border transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${style.picker} ${
                    newTrackerColor === color ? style.pickerActive : ""
                  }`}
                  aria-label={`Цвет трекера: ${color}`}
                  title={color}
                />
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {appState.monthTrackers.map((tracker) => {
              const style = TRACKER_COLOR_STYLES[tracker.color];
              const isActive = tracker.id === currentActiveTrackerId;

              return (
                <button
                  key={tracker.id}
                  type="button"
                  onClick={() => setActiveTrackerId(tracker.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    isActive ? style.chipActive : style.chip
                  }`}
                >
                  {tracker.title}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" className="sm:w-auto" onClick={renameActiveTracker} disabled={!currentActiveTrackerId}>
              Переименовать
            </Button>
            <Button
              variant="secondary"
              className="sm:w-auto"
              onClick={deleteActiveTracker}
              disabled={!currentActiveTrackerId}
            >
              Удалить
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 rounded-2xl border border-rose-100/90 bg-rose-50/30 p-2">
          {WEEKDAY_SHORT.map((weekday) => (
            <p key={weekday} className="text-center text-xs font-semibold text-rose-700">
              {weekday}
            </p>
          ))}

          {monthGrid.map((dateKey, index) => {
            if (!dateKey) {
              return <div key={`empty-${index}`} className="h-14 rounded-xl bg-rose-50/55" />;
            }

            const day = Number(dateKey.slice(-2));
            const isMarked = currentActiveTrackerId
              ? (appState.monthTrackerLogByDate[dateKey] ?? []).includes(currentActiveTrackerId)
              : false;
            const bgClass = isMarked && activeTrackerStyle ? activeTrackerStyle.fill : "bg-white/80";

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => toggleActiveTrackerDay(dateKey)}
                className={`h-14 rounded-xl border border-rose-200/85 p-1 text-left transition duration-200 hover:scale-[1.02] hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50 ${bgClass} ${
                  selectedDateKey === dateKey ? "ring-2 ring-rose-500 ring-offset-1 ring-offset-rose-50" : ""
                }`}
              >
                <p className="text-xs font-semibold text-rose-900">{day}</p>
                {isMarked && activeTrackerStyle ? <span className={`mt-1 block h-1.5 w-1.5 rounded-full ${activeTrackerStyle.dot}`} /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />

      <Card>
        <h2 className="text-lg font-semibold text-rose-950">Редактирование дня: {selectedDateKey}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-rose-800">Сон (часы)</span>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={selectedMetrics.sleepHours ?? ""}
              onChange={(event) => updateSelectedMetrics({ sleepHours: parseMetricValue(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-rose-800">Вода (мл)</span>
            <Input
              type="number"
              min={0}
              value={selectedMetrics.waterMl ?? ""}
              onChange={(event) => updateSelectedMetrics({ waterMl: parseMetricValue(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-rose-800">Шаги</span>
            <Input
              type="number"
              min={0}
              value={selectedMetrics.steps ?? ""}
              onChange={(event) => updateSelectedMetrics({ steps: parseMetricValue(event.target.value) })}
            />
          </label>

          <div className="rounded-2xl border border-rose-200/85 bg-rose-50/65 p-3.5">
            <p className="text-sm text-rose-800">Тренировка</p>
            <Button
              variant={selectedMetrics.workoutDone ? "primary" : "secondary"}
              className="mt-2 w-full"
              onClick={() => updateSelectedMetrics({ workoutDone: !selectedMetrics.workoutDone })}
            >
              {selectedMetrics.workoutDone ? "Сделано" : "Не отмечено"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-100/70 px-3 py-2 text-sm text-rose-800">
            {selectedSticker ? (
              <Image src={selectedSticker.imageSrc} alt={selectedSticker.alt} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
            ) : (
              "нет"
            )}
          </span>
        </div>
      </Card>
    </Container>
  );
}
