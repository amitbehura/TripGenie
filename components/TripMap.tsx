import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TripPlan, DayPlan, Activity } from '../types';

interface TripMapProps {
  plan: TripPlan;
  selectedDay: number;
}

const MapUpdater: React.FC<{ center: [number, number], zoom: number, bounds: L.LatLngBoundsExpression | null }> = ({ center, zoom, bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    else map.setView(center, zoom);
  }, [center, zoom, bounds, map]);
  return null;
};

const createCustomIcon = (index: number, type: string) => {
  let colorClass = 'bg-blue-600';
  if (type === 'food') colorClass = 'bg-orange-500';
  if (type === 'landmark') colorClass = 'bg-purple-600';
  if (type === 'relax') colorClass = 'bg-green-500';
  if (type === 'stay') colorClass = 'bg-blue-700 ring-4 ring-blue-200';

  const inner = type === 'stay' ? '🏠' : (index + 1);

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div class="${colorClass} w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm">
        ${inner}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const TripMap: React.FC<TripMapProps> = ({ plan, selectedDay }) => {
  const dayPlan = plan.itinerary[selectedDay];
  
  // Calculate path including stay location at start and end
  let pathPositions: [number, number][] = dayPlan.activities.map(act => [act.location.lat, act.location.lng]);
  
  if (plan.stayLocation) {
    const stayPos: [number, number] = [plan.stayLocation.location.lat, plan.stayLocation.location.lng];
    pathPositions = [stayPos, ...pathPositions, stayPos];
  }

  let bounds: L.LatLngBoundsExpression | null = null;
  if (pathPositions.length > 0) bounds = L.latLngBounds(pathPositions);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-slate-200 z-0 relative">
      <MapContainer center={[plan.centerCoordinates.lat, plan.centerCoordinates.lng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapUpdater center={[plan.centerCoordinates.lat, plan.centerCoordinates.lng]} zoom={13} bounds={bounds} />

        {/* Stay Marker */}
        {plan.stayLocation && (
          <Marker position={[plan.stayLocation.location.lat, plan.stayLocation.location.lng]} icon={createCustomIcon(-1, 'stay')}>
            <Popup className="font-sans">
              <div className="p-1">
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block mb-1">Base Camp / Hotel</span>
                <h3 className="font-bold text-slate-800 text-base mb-1">{plan.stayLocation.name}</h3>
              </div>
            </Popup>
          </Marker>
        )}

        {dayPlan.activities.map((activity, index) => (
          <Marker key={`${selectedDay}-${index}`} position={[activity.location.lat, activity.location.lng]} icon={createCustomIcon(index, activity.type)}>
            <Popup className="font-sans">
              <div className="p-1">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-1">{activity.time}</span>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{activity.name}</h3>
                <p className="text-sm text-slate-600 m-0">{activity.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {pathPositions.length > 1 && <Polyline positions={pathPositions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '10, 10' }} />}
      </MapContainer>
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-xs">
        <div className="font-semibold mb-2 text-slate-700">Day {dayPlan.dayNumber}: {dayPlan.theme}</div>
        <div className="space-y-1">
           {plan.stayLocation && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-700"></div>Hotel</div>}
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div>Food</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600"></div>Landmark</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div>Activity</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Relax</div>
        </div>
      </div>
    </div>
  );
};

export default TripMap;