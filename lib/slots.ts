import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

export type HorarioTrabalho = Record<string, [string, string][]>;
export type Busy = { inicio: Date; fim: Date };
export type Slot = { inicio: Date; fim: Date };

function parseHM(date: Date, hm: string, tz: string): Date {
  const [h, m] = hm.split(":").map(Number);
  const zoned = toZonedTime(date, tz);
  zoned.setHours(h, m, 0, 0);
  return fromZonedTime(zoned, tz);
}

export function slotsLivresSemana(args: {
  inicioSemana: Date;
  horarioTrabalho: HorarioTrabalho;
  ocupados: Busy[];
  duracaoMin: number;
  tz: string;
}): Slot[] {
  const { inicioSemana, horarioTrabalho, ocupados, duracaoMin, tz } = args;
  const livres: Slot[] = [];

  for (let d = 0; d < 7; d++) {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + d);
    const dow = String(toZonedTime(dia, tz).getDay());
    const intervalos = horarioTrabalho[dow] || [];

    for (const [start, end] of intervalos) {
      let cursor = parseHM(dia, start, tz);
      const fimTrabalho = parseHM(dia, end, tz);

      while (isBefore(addMinutes(cursor, duracaoMin), fimTrabalho) ||
             +addMinutes(cursor, duracaoMin) === +fimTrabalho) {
        const fimSlot = addMinutes(cursor, duracaoMin);
        const conflita = ocupados.some(
          (b) => isBefore(b.inicio, fimSlot) && isBefore(cursor, b.fim),
        );
        if (!conflita) livres.push({ inicio: new Date(cursor), fim: fimSlot });
        cursor = fimSlot;
      }
    }
  }
  return livres;
}

export function formatSlot(s: Slot, tz: string) {
  return `${format(toZonedTime(s.inicio, tz), "EEE dd/MM HH:mm", { timeZone: tz })}`;
}
