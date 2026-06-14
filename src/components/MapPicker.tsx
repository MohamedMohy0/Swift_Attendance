import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Vite doesn't resolve Leaflet's bundled images)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  lat: number;
  lng: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function MapPicker({ lat, lng, radius, onChange, height = 280 }: Props) {
  return (
    <div
      className="rounded-md overflow-hidden border"
      style={{ height }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={17}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const p = m.getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
        <Circle
          center={[lat, lng]}
          radius={radius}
          pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15 }}
        />
        <ClickHandler onChange={onChange} />
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
