import type { MemoryItem } from "../api";

export interface MapPin {
  item: MemoryItem;
  lat: number;
  lng: number;
  label: string;
}

export function extractMapPins(items: MemoryItem[]): MapPin[] {
  const pins: MapPin[] = [];
  for (const item of items) {
    const lat = item.metadata.lat;
    const lng = item.metadata.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      pins.push({
        item,
        lat,
        lng,
        label: item.title ?? item.text.slice(0, 40),
      });
    }
  }
  return pins;
}

interface Props {
  pins: MapPin[];
  onSelect: (item: MemoryItem) => void;
}

/** Simple map using OpenStreetMap embed links (no API key required) */
export function MapView({ pins, onSelect }: Props) {
  if (pins.length === 0) {
    return (
      <div className="empty">
        <h2>No places yet</h2>
        <p>Import photos with location data or items tagged with coordinates to see them on the map.</p>
      </div>
    );
  }

  const center = pins[0]!;

  return (
    <div className="map-view">
      <iframe
        title="Memory map"
        className="map-embed"
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.05}%2C${center.lat - 0.03}%2C${center.lng + 0.05}%2C${center.lat + 0.03}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
      />
      <ul className="map-pin-list">
        {pins.map((pin) => (
          <li key={pin.item.id}>
            <button type="button" className="map-pin-btn" onClick={() => onSelect(pin.item)}>
              <strong>{pin.label}</strong>
              <span>
                {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
