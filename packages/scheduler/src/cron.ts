import type { CronFields } from "./types.js";

export function parseCron(expression: string): CronFields {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 6) {
    throw new Error("Invalid cron expression: need 6 fields");
  }

  return {
    second: parseField(parts[0], 0, 59),
    minute: parseField(parts[1], 0, 59),
    hour: parseField(parts[2], 0, 23),
    dayOfMonth: parseField(parts[3], 1, 31),
    month: parseField(parts[4], 1, 12),
    dayOfWeek: parseField(parts[5], 0, 6),
  };
}

function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) {
        values.add(i);
      }
    } else if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepNum = parseInt(step, 10);

      if (range === "*") {
        for (let i = min; i <= max; i += stepNum) {
          values.add(i);
        }
      } else if (range.includes("-")) {
        const [start, end] = range.split("-").map(Number);
        for (let i = start; i <= end; i += stepNum) {
          values.add(i);
        }
      }
    } else if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        values.add(i);
      }
    } else {
      values.add(parseInt(part, 10));
    }
  }

  return [...values].sort((a, b) => a - b);
}

export function matchCron(fields: CronFields, date: Date): boolean {
  return (
    fields.second.includes(date.getSeconds()) &&
    fields.minute.includes(date.getMinutes()) &&
    fields.hour.includes(date.getHours()) &&
    fields.dayOfMonth.includes(date.getDate()) &&
    fields.month.includes(date.getMonth() + 1) &&
    fields.dayOfWeek.includes(date.getDay())
  );
}

export function getNextRunTime(fields: CronFields, after: Date): Date {
  const next = new Date(after.getTime() + 1000);
  next.setMilliseconds(0);

  for (let i = 0; i < 366 * 24 * 60 * 60; i++) {
    if (matchCron(fields, next)) {
      return next;
    }
    next.setSeconds(next.getSeconds() + 1);
  }

  throw new Error("Cannot find next run time");
}
