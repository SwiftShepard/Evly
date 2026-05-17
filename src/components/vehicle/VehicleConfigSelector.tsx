import { useState } from "react";
import ConfigSelector from "@/components/compare/ConfigSelector";
import type { Vehicle } from "@/data/schemas";

interface Props {
  vehicle: Vehicle;
}

export default function VehicleConfigSelector({ vehicle }: Props) {
  const [activeConfigId, setActiveConfigId] = useState(vehicle.configurations[0]?.id || "");

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 md:p-5 shadow-sm">
      <ConfigSelector
        vehicle={vehicle}
        activeConfigId={activeConfigId}
        onConfigChange={(id) => {
          setActiveConfigId(id);
          const event = new CustomEvent("config-changed", { detail: { configId: id } });
          window.dispatchEvent(event);
        }}
      />
    </div>
  );
}
