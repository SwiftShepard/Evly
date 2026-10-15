/**
 * Kilométrage de la semaine, sur l'année, et le forfait de location (LLD, LOA) qui le
 * couvre, en colonne serrée dans la barre du bas. Pendant la lecture, les kilomètres
 * montent depuis lundi.
 */
import { formatKm, formatNumber } from "@/lib/format";
import { annualKm, leaseTier } from "@/lib/map/mileage";

/** extraYearKm : grands trajets de l'année (vacances, famille), en plus des 52 semaines */
export default function WeekMileage({ km, live, extraYearKm = 0 }: { km: number; live: boolean; extraYearKm?: number }) {
  const year = annualKm(km) + Math.round(extraYearKm / 100) * 100;
  const tier = leaseTier(year);
  return (
    <section className="week-stat week-mileage" aria-label="Kilométrage">
      <span className="week-stat-label">Kilométrage</span>
      <span className="week-stat-key">{live ? "Depuis lundi" : "Semaine"}</span>
      <b className="tabular">{formatKm(Math.round(km))}</b>
      {!live && (
        <>
          <span className="week-stat-key" title={extraYearKm > 0 ? "52 semaines comme celle-ci, plus vos grands trajets" : "52 semaines comme celle-ci ; ajoutez vos grands trajets dans le volet"}>
            {extraYearKm > 0 ? "An, trajets compris" : "An"}
          </span>
          <b className="tabular">{formatKm(year)}</b>
          <span className="week-stat-key">Location</span>
          <b className="tabular week-stat-small">{tier ? `forfait ${formatNumber(tier)} km` : "+ de 50 000 km"}</b>
        </>
      )}
    </section>
  );
}
