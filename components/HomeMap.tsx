import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { TripBounds } from '../types';
import L from 'leaflet';
import { MousePointer2, PenTool, Undo2, Layers, Search, Loader2, Maximize } from 'lucide-react';

interface HomeMapProps {
  onAreasSelect: (bounds: TripBounds[]) => void;
  selectedAreas: TripBounds[];
}

// Component to handle drawing logic
const AreaDrawer = ({ 
  isDrawingMode, 
  onDrawComplete, 
}: { 
  isDrawingMode: boolean; 
  onDrawComplete: (bounds: TripBounds) => void;
}) => {
  const map = useMap();
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
  const [currentPoint, setCurrentPoint] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (isDrawingMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = 'grab';
    }
  }, [isDrawingMode, map]);

  useMapEvents({
    mousedown(e) {
      if (!isDrawingMode) return;
      setStartPoint(e.latlng);
      setCurrentPoint(e.latlng);
    },
    mousemove(e) {
      if (!isDrawingMode || !startPoint) return;
      setCurrentPoint(e.latlng);
    },
    mouseup() {
      if (startPoint && currentPoint && isDrawingMode) {
        const bounds = L.latLngBounds(startPoint, currentPoint);
        if (startPoint.distanceTo(currentPoint) > 100) {
            onDrawComplete({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest()
            });
        }
        setStartPoint(null);
        setCurrentPoint(null);
      }
    }
  });

  if (startPoint && currentPoint) {
    const bounds = L.latLngBounds(startPoint, currentPoint);
    return <Rectangle bounds={bounds} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.2, dashArray: '5, 5' }} />;
  }

  return null;
};

// Component to handle map movement when searching and helper for "Select Whole View"
const MapController = ({ 
  location, 
  onSelectVisible 
}: { 
  location: any; 
  onSelectVisible: (bounds: TripBounds) => void;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (location) {
      const [minLat, maxLat, minLon, maxLon] = location.boundingbox.map(parseFloat);
      const bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);
      map.fitBounds(bounds, { animate: true, duration: 1.5 });
    }
  }, [location, map]);

  // We attach a function to the window or a ref pattern to allow the parent UI to call this
  // For simplicity in this structure, we'll just handle the button click via a global event or similar,
  // but a better way is to pass a trigger prop.
  return null;
};

// Helper component to provide access to map.getBounds()
const SelectVisibleHelper = ({ trigger, onSelect }: { trigger: number, onSelect: (bounds: TripBounds) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0) {
      const b = map.getBounds();
      onSelect({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest()
      });
    }
  }, [trigger]);
  return null;
};

const HomeMap: React.FC<HomeMapProps> = ({ onAreasSelect, selectedAreas }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [selectVisibleTrigger, setSelectVisibleTrigger] = useState(0);

  const handleDrawComplete = (newBounds: TripBounds) => {
    onAreasSelect([...selectedAreas, newBounds]);
  };

  const handleUndo = () => {
    if (selectedAreas.length > 0) {
      const newAreas = [...selectedAreas];
      newAreas.pop();
      onAreasSelect(newAreas);
    }
  };

  const handleSelectVisible = () => {
    setSelectVisibleTrigger(prev => prev + 1);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setSearchResult(data[0]);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute inset-0 z-0 bg-slate-100">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
        maxBounds={[[-90, -180], [90, 180]]}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <AreaDrawer 
          isDrawingMode={isDrawingMode} 
          onDrawComplete={handleDrawComplete}
        />

        <MapController location={searchResult} onSelectVisible={handleDrawComplete} />
        <SelectVisibleHelper trigger={selectVisibleTrigger} onSelect={handleDrawComplete} />

        {selectedAreas.map((area, index) => {
            const bounds = L.latLngBounds(
                [area.south, area.west],
                [area.north, area.east]
            );
            return (
                <Rectangle 
                    key={index}
                    bounds={bounds} 
                    pathOptions={{ color: '#2563eb', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.4 }} 
                />
            );
        })}
      </MapContainer>
      
      {/* Search Bar Overlay */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1002] w-full max-w-sm px-4 pointer-events-none">
        <form onSubmit={handleSearch} className="pointer-events-auto relative shadow-2xl rounded-full group transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-12 py-3 border-none rounded-full leading-5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 sm:text-sm shadow-sm"
                placeholder="Find a city or place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-1 flex items-center">
                <button 
                    type="submit" 
                    disabled={isSearching}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-70"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
            </div>
        </form>
      </div>

      {/* Interaction Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1002] flex flex-col items-center pointer-events-auto gap-4 w-full max-w-lg px-4">
        
        {/* Main Action Bar */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full p-2 shadow-2xl border border-white/20">
            
            {/* Draw Toggle */}
            <button
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={`px-5 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${
                isDrawingMode 
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
                {isDrawingMode ? <MousePointer2 className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
                {isDrawingMode ? 'Drawing Active' : 'Draw Area'}
            </button>

            {/* Select Visible View */}
            <button
                onClick={handleSelectVisible}
                className="px-5 py-3 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm transition-all flex items-center gap-2"
                title="Select entire visible area"
            >
                <Maximize className="w-4 h-4" />
                Select Whole View
            </button>

            {/* Undo Button */}
            {selectedAreas.length > 0 && (
                <button
                    onClick={handleUndo}
                    className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-red-500 transition-colors"
                    title="Undo last selection"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
            )}

            {/* Counter Badge */}
            <div className="px-3 flex items-center gap-1 text-slate-500 font-medium text-sm border-l border-slate-300 ml-1">
                <Layers className="w-4 h-4" />
                {selectedAreas.length}
            </div>
        </div>

        {/* Instructions */}
        <div className={`transition-all duration-300 ${isDrawingMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-slate-800/90 text-white px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold shadow-md backdrop-blur">
                Drag on map to select custom areas
            </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-slate-900/10 z-[1]" />
    </div>
  );
};

export default HomeMap;