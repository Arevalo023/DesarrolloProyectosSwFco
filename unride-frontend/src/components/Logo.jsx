import { Car } from "lucide-react";

export default function Logo({ iconSize = 32, textSize = "text-xl" }) {
  return (
    <div className="flex items-center gap-2">
      <Car className="text-emerald-600" size={iconSize} />

      <span className={`${textSize} font-bold text-slate-900`}>
        Uni<span className="text-emerald-600">Ride</span>
      </span>
    </div>
  );
}
