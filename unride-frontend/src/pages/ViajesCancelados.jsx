import HistorialViajes from "./HistorialViajes";

export default function ViajesCancelados({ onBack }) {
  return <HistorialViajes tipo="cancelados" onBack={onBack} />;
}
