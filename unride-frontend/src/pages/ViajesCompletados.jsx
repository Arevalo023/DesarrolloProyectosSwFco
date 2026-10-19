import HistorialViajes from "./HistorialViajes";

export default function ViajesCompletados({ onBack }) {
  return <HistorialViajes tipo="completados" onBack={onBack} />;
}
