import { Car } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-white px-6 py-6">
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          flex-col
          items-center
          justify-between
          gap-3
          md:flex-row
        "
      >
        <div className="flex items-center gap-2">
          <Car className="text-emerald-600" size={24} />

          <p className="m-0 font-bold text-slate-800">
            Uni{" "}
            <span className="text-emerald-600">Ride</span>
          </p>
        </div>

        <p className="m-0 text-sm text-slate-500">
          © 2026 UniRide · Movilidad universitaria
        </p>
      </div>
    </footer>
  );
}
