/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FamilyMember } from '../types';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useAdvancedMarkerRef,
  useMapsLibrary,
  useMap
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Baby, 
  Skull, 
  Eye, 
  Compass, 
  Search, 
  Activity, 
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LineageMapProps {
  members: FamilyMember[];
  onSelectMember: (id: string) => void;
}

// Pre-seeded high-speed coordinate dictionary for classic family demo records
// Prevents API latency, reduces cold start and quota expense
const STATIC_COORDINATE_CACHE: Record<string, { lat: number; lng: number }> = {
  'Edinburgh, Scotland': { lat: 55.9533, lng: -3.1883 },
  'Glasgow, Scotland': { lat: 55.8642, lng: -4.2518 },
  'Ellis Island, NY': { lat: 40.6987, lng: -74.0396 },
  'Boston, Massachusetts, USA': { lat: 42.3601, lng: -71.0589 },
  'Boston, Massachusetts': { lat: 42.3601, lng: -71.0589 },
  'Boston, MA': { lat: 42.3601, lng: -71.0589 },
  'Belfast, Ireland': { lat: 54.5973, lng: -5.9301 },
  'Portland, Oregon, USA': { lat: 45.5152, lng: -122.6784 },
  'Portland, OR': { lat: 45.5152, lng: -122.6784 },
  'Portland, Oregon': { lat: 45.5152, lng: -122.6784 },
  'Eugene, Oregon': { lat: 44.0521, lng: -123.0868 },
  'Oregon, USA': { lat: 43.8041, lng: -120.5542 },
  'Eugene, OR': { lat: 44.0521, lng: -123.0868 },
  'Philadelphia, Pennsylvania': { lat: 39.9526, lng: -75.1652 },
  'Brooklyn, New York': { lat: 40.6782, lng: -73.9442 },
  'Brooklyn, NY': { lat: 40.6782, lng: -73.9442 },
  'New York, New York, USA': { lat: 40.7128, lng: -74.0060 },
  'New York, NY': { lat: 40.7128, lng: -74.0060 },
  'New York, USA': { lat: 40.7128, lng: -74.0060 },
  'Seattle, Washington': { lat: 47.6062, lng: -122.3321 },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
  'Denver, Colorado': { lat: 39.7392, lng: -104.9903 },
  'New Haven, Connecticut, USA': { lat: 41.3083, lng: -72.9279 },
  'New Haven, CT': { lat: 41.3083, lng: -72.9279 },
  'San Francisco, California': { lat: 37.7749, lng: -122.4194 },
  'Salem, OR': { lat: 44.9429, lng: -123.0351 },
  'Western Europe': { lat: 48.8566, lng: 2.3522 }
};

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface PlotData {
  id: string; // unique plot point key
  member: FamilyMember;
  type: 'birth' | 'death';
  locationName: string;
  lat: number;
  lng: number;
}

export const LineageMap: React.FC<LineageMapProps> = ({ members, onSelectMember }) => {
  const [showBirthplaces, setShowBirthplaces] = useState(true);
  const [showDeathplaces, setShowDeathplaces] = useState(true);
  const [showJourneys, setShowJourneys] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  
  // Geolocation cache for custom additions (saved in localStorage)
  const [customGeocodes, setCustomGeocodes] = useState<Record<string, { lat: number; lng: number }>>(() => {
    try {
      const saved = localStorage.getItem('family_lineage_geocodes_cache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Dynamic Google Geocoder instance reference
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  // Run dynamic geocoder for unfamiliar custom added user locations
  useEffect(() => {
    if (!hasValidKey || !geocoderRef.current) return;

    // Scan for locations not cached statically or historically in custom cache
    const locationsToResolve = new Set<string>();
    members.forEach(m => {
      if (m.birthPlace && m.birthPlace.trim()) {
        const p = m.birthPlace.trim();
        if (!STATIC_COORDINATE_CACHE[p] && !customGeocodes[p]) {
          locationsToResolve.add(p);
        }
      }
      if (m.deathPlace && m.deathPlace.trim()) {
        const p = m.deathPlace.trim();
        if (!STATIC_COORDINATE_CACHE[p] && !customGeocodes[p]) {
          locationsToResolve.add(p);
        }
      }
    });

    if (locationsToResolve.size === 0) return;

    // Throttle sequential geocoding calls to respect API quotas
    let delay = 0;
    locationsToResolve.forEach(loc => {
      setTimeout(() => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ address: loc }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const coords = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng()
            };
            setCustomGeocodes(prev => {
              const updated = { ...prev, [loc]: coords };
              localStorage.setItem('family_lineage_geocodes_cache', JSON.stringify(updated));
              return updated;
            });
          } else {
            console.warn(`Geocoding failed for place: "${loc}" with status:`, status);
          }
        });
      }, delay);
      delay += 400; // 400ms interval matching rate constraints
    });
  }, [members, customGeocodes, geocodingLib]);

  // Combined coordinate lookup helper
  const getCoordinates = (placeName: string | undefined): { lat: number; lng: number } | null => {
    if (!placeName) return null;
    const name = placeName.trim();
    if (STATIC_COORDINATE_CACHE[name]) return STATIC_COORDINATE_CACHE[name];
    if (customGeocodes[name]) return customGeocodes[name];
    return null;
  };

  // Compile active plotting points list matching requested filters
  const points = useMemo<PlotData[]>(() => {
    const list: PlotData[] = [];
    
    members.forEach(m => {
      // Filter by specific member spotlight if requested
      if (selectedMemberId !== 'all' && m.id !== selectedMemberId) return;

      if (showBirthplaces && m.birthPlace) {
        const coords = getCoordinates(m.birthPlace);
        if (coords) {
          list.push({
            id: `${m.id}-birth`,
            member: m,
            type: 'birth',
            locationName: m.birthPlace,
            lat: coords.lat,
            lng: coords.lng
          });
        }
      }

      if (showDeathplaces && m.isDeceased && m.deathPlace) {
        const coords = getCoordinates(m.deathPlace);
        if (coords) {
          list.push({
            id: `${m.id}-death`,
            member: m,
            type: 'death',
            locationName: m.deathPlace,
            lat: coords.lat,
            lng: coords.lng
          });
        }
      }
    });

    return list;
  }, [members, showBirthplaces, showDeathplaces, selectedMemberId, customGeocodes]);

  // Migration Lines compiled based on matching coordinates
  const migrationLines = useMemo(() => {
    const lines: { id: string; member: FamilyMember; start: {lat: number; lng: number}; end: {lat: number; lng: number} }[] = [];
    
    members.forEach(m => {
      if (selectedMemberId !== 'all' && m.id !== selectedMemberId) return;

      if (m.birthPlace && (m.isDeceased ? m.deathPlace : true)) {
        const start = getCoordinates(m.birthPlace);
        
        let endCoords = null;
        if (m.isDeceased && m.deathPlace) {
          endCoords = getCoordinates(m.deathPlace);
        } else if (!m.isDeceased) {
          // Living members who have moved from birthplace (e.g. James born in Eugene, relocated to Portland)
          // We can draft a connection to their recorded adult events if there are any
          const lastEventLoc = m.events[m.events.length - 1]?.location;
          if (lastEventLoc) {
            endCoords = getCoordinates(lastEventLoc);
          }
        }

        if (start && endCoords && (start.lat !== endCoords.lat || start.lng !== endCoords.lng)) {
          lines.push({
            id: `line-${m.id}`,
            member: m,
            start,
            end: endCoords
          });
        }
      }
    });

    return lines;
  }, [members, selectedMemberId, customGeocodes]);

  // Interactive Marker selection item state
  const [activeInfoWindowPoint, setActiveInfoWindowPoint] = useState<PlotData | null>(null);

  // Splash screen shown during zero API config
  if (!hasValidKey) {
    return (
      <div className="bg-white border border-[#E5E1DA] rounded-xl p-8 max-w-2xl mx-auto shadow-xs text-left my-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg text-amber-600 shrink-0 select-none">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="space-y-4 grow">
            <div>
              <h3 className="text-base font-bold text-[#2D2926] font-serif">Geographic Lineage Atlas</h3>
              <p className="text-xs text-[#7A7570] mt-1.5 leading-relaxed">
                This is a future feature and will be added later. Once fully integrated, it will allow you to plot your ancestors' birth positions, death locations, and trans-continental migration paths on an interactive coordinate map.
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-4 rounded-lg border border-[#E5E1DA] text-xs space-y-2">
              <span className="font-semibold text-stone-800 block">Upcoming Feature Scope:</span>
              <ul className="list-disc list-inside text-stone-500 space-y-1">
                <li>Interactive world coordinate plots of birthplaces and final resting locations</li>
                <li>Geodesic migration lines representing historical family journeys across generations</li>
                <li>Spotlight filters to isolate branches of your pedigree chart on a custom atlas</li>
              </ul>
            </div>

            <div className="text-[11px] text-[#A8A29E] flex items-center gap-1.5 font-mono select-none">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>We are preparing this visualization module for full integration. Stay tuned!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Information Bar */}
      <div className="bg-white rounded-xl p-5 border border-[#E5E1DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-[#FAF9F6] text-[#7A7570] tracking-widest font-mono font-bold px-2 py-0.5 rounded border border-[#E5E1DA]">
              CARTOGRAPHY PLATFORM
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#2D2926] font-serif leading-tight">Geographic Lineage Atlas</h3>
          <p className="text-xs text-[#7A7570] mt-1 leading-relaxed">
            Plotted historical distribution of birth positions and ancestral relocation journeys on an interactive coordinate atlas.
          </p>
        </div>

        {/* Member Focus Select Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <label htmlFor="member-filter" className="text-xs font-mono font-bold text-[#7A7570] whitespace-nowrap">
            SPOTLIGHT MEMBER:
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="member-filter"
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setActiveInfoWindowPoint(null);
              }}
              className="bg-white border border-[#E5E1DA] rounded-lg pl-8 pr-10 py-1.5 text-xs text-[#2D2926] font-bold focus:outline-none focus:border-[#7A7570] cursor-pointer appearance-none min-w-[200px]"
            >
              <option value="all">Plot Entire Index ({members.length} members)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.isDeceased ? 'Deceased' : 'Living'})
                </option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 border-l border-t border-[#7A7570] w-1.5 h-1.5 rotate-45 pointer-events-none mt-[-2px]" />
          </div>
        </div>
      </div>

      {/* 2. Primary Controls and Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Left Side: Legend & Layer control sidebar */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="border border-[#E5E1DA] bg-white rounded-xl p-5 space-y-5 text-left">
            <div>
              <span className="text-[10px] text-[#A8A29E] tracking-wider uppercase font-mono font-bold block mb-1">
                Display Layers
              </span>
              <h4 className="text-xs font-bold font-serif text-[#2D2926]">Toggle Active Indicators</h4>
            </div>

            {/* Checkbox controls */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-stone-100 hover:border-[#E5E1DA] cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={showBirthplaces}
                  onChange={(e) => {
                    setShowBirthplaces(e.target.checked);
                    if (!e.target.checked) setActiveInfoWindowPoint(null);
                  }}
                  className="mt-0.5 accent-emerald-600 rounded cursor-pointer size-4"
                />
                <div className="leading-tight">
                  <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block shadow-sm"></span>
                    Birthplaces Plotted
                  </span>
                  <span className="text-[10px] text-[#7A7570] block mt-0.5 font-sans leading-relaxed">
                    Identified positions of birth origins.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-stone-100 hover:border-[#E5E1DA] cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={showDeathplaces}
                  onChange={(e) => {
                    setShowDeathplaces(e.target.checked);
                    if (!e.target.checked) setActiveInfoWindowPoint(null);
                  }}
                  className="mt-0.5 accent-amber-600 rounded cursor-pointer size-4"
                />
                <div className="leading-tight">
                  <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white inline-block shadow-sm"></span>
                    Deathplaces Plotted
                  </span>
                  <span className="text-[10px] text-[#7A7570] block mt-0.5 font-sans leading-relaxed">
                    Positions of passing for deceased ancestors.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg border border-stone-100 hover:border-[#E5E1DA] cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={showJourneys}
                  onChange={(e) => setShowJourneys(e.target.checked)}
                  className="mt-0.5 accent-stone-700 rounded cursor-pointer size-4"
                />
                <div className="leading-tight">
                  <span className="text-xs font-bold text-[#2D2926] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-stone-600 rotate-45 inline-block" />
                    Migration Paths
                  </span>
                  <span className="text-[10px] text-[#7A7570] block mt-0.5 font-sans leading-relaxed">
                    Lines demonstrating continental transitions and journeys.
                  </span>
                </div>
              </label>
            </div>

            {/* Quick Metrics */}
            <div className="pt-4 border-t border-[#E5E1DA] space-y-3">
              <span className="text-[10px] text-[#A8A29E] tracking-wider uppercase font-mono font-bold block">
                Active Map Index
              </span>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg p-2 flex flex-col justify-center">
                  <strong className="text-lg font-serif font-bold text-[#2D2926]">
                    {points.filter(p => p.type === 'birth').length}
                  </strong>
                  <span className="text-[9px] font-mono text-[#7A7570] uppercase">Birth Markers</span>
                </div>
                <div className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg p-2 flex flex-col justify-center">
                  <strong className="text-lg font-serif font-bold text-[#2D2926]">
                    {points.filter(p => p.type === 'death').length}
                  </strong>
                  <span className="text-[9px] font-mono text-[#7A7570] uppercase">Death Markers</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[#E5E1DA] bg-[#FAF9F6] rounded-xl p-4 text-left space-y-2">
            <span className="font-mono text-[9px] font-bold text-stone-400 block uppercase">Cartographer Hint</span>
            <div className="flex gap-2 text-[11px] text-[#7A7570] leading-normal font-sans">
              <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span>
                Select any marker to invoke details popups displaying their birth/death chronicles. Press "Set Focus" inside popups to browse their lineage trees.
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Google Map container */}
        <div className="lg:col-span-3 border border-[#E5E1DA] bg-[#FAF9F6] rounded-xl overflow-hidden min-h-[500px] h-[550px] relative shadow-xs flex flex-col">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: 39.8283, lng: -42.5795 }} // Medium view looking across Atlantic connecting UK to US
              defaultZoom={2.8}
              mapId="LINEAGE_DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              gestureHandling="cooperative"
              disableDefaultUI={false}
            >
              
              {/* Dynamic Connection lines using helper component to cleanly reference map hooks */}
              {showJourneys && (
                <DrawMigrationLines lines={migrationLines} highlightMemberId={selectedMemberId} />
              )}

              {/* Render dynamic geocoded map markers */}
              {points.map((point) => (
                <MarkerWithPopup
                  key={point.id}
                  point={point}
                  isSelected={activeInfoWindowPoint?.id === point.id}
                  onActivate={() => setActiveInfoWindowPoint(point)}
                  onDeactivate={() => setActiveInfoWindowPoint(null)}
                  onSelectMember={onSelectMember}
                />
              ))}

            </Map>
          </APIProvider>
        </div>

      </div>

    </div>
  );
};

// Component to handle drawing advanced polylines in Google Maps dynamically (complying with GMP rules)
interface DrawMigrationLinesProps {
  lines: {
    id: string;
    member: FamilyMember;
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  }[];
  highlightMemberId: string;
}

const DrawMigrationLines: React.FC<DrawMigrationLinesProps> = ({ lines, highlightMemberId }) => {
  const map = useMap();
  const polylineRegistry = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear obsolete coordinates lines
    polylineRegistry.current.forEach(line => line.setMap(null));
    polylineRegistry.current = [];

    lines.forEach(path => {
      const isSpotlighted = highlightMemberId === path.member.id || highlightMemberId === 'all';
      
      const poly = new google.maps.Polyline({
        path: [path.start, path.end],
        geodesic: true,
        strokeColor: highlightMemberId === path.member.id ? '#2D2926' : '#7A7570',
        strokeOpacity: highlightMemberId === path.member.id ? 0.9 : 0.4,
        strokeWeight: highlightMemberId === path.member.id ? 2.5 : 1.5,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2,
            strokeWeight: 1,
            fillColor: highlightMemberId === path.member.id ? '#2D2926' : '#7A7570',
            fillOpacity: 0.8
          },
          offset: '50%'
        }]
      });

      poly.setMap(map);
      polylineRegistry.current.push(poly);
    });

    return () => {
      polylineRegistry.current.forEach(line => line.setMap(null));
      polylineRegistry.current = [];
    };
  }, [map, lines, highlightMemberId]);

  return null;
};

// Advanced marker + info window handling using vis.gl anchors pattern
interface MarkerProps {
  point: PlotData;
  isSelected: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onSelectMember: (id: string) => void;
}

const MarkerWithPopup: React.FC<MarkerProps> = ({
  point,
  isSelected,
  onActivate,
  onDeactivate,
  onSelectMember
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  // Pick color themes
  const markerBackground = point.type === 'birth' ? '#10b981' : '#f59e0b';
  const labelText = point.type === 'birth' ? 'B' : 'D';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.lat, lng: point.lng }}
        title={`${point.member.firstName} - ${point.type === 'birth' ? 'Birth' : 'Death'} Location`}
        onClick={onActivate}
      >
        <Pin 
          background={markerBackground} 
          borderColor="#ffffff" 
          glyphColor="#ffffff" 
          scale={0.9}
        >
          <span className="text-[9px] font-mono font-bold text-white leading-none flex items-center justify-center select-none">
            {labelText}
          </span>
        </Pin>
      </AdvancedMarker>

      {isSelected && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onDeactivate}
          minWidth={240}
        >
          <div className="text-left font-sans text-xs space-y-2 p-1 text-[#2D2926]">
            
            {/* Header member summary with badge */}
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <div 
                className="w-7 h-7 rounded-full text-white font-serif font-bold text-xs flex items-center justify-center select-none shrink-0"
                style={{ backgroundColor: point.member.avatarUrl || '#7A7570' }}
              >
                {point.member.firstName[0]}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold leading-tight truncate">
                  {point.member.firstName} {point.member.lastName}
                </h4>
                <div className="flex items-center gap-1 text-[9px] leading-tight">
                  {point.type === 'birth' ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                      <Baby className="w-2.5 h-2.5" /> Birth Origin
                    </span>
                  ) : (
                    <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded flex items-center gap-0.5">
                      <Skull className="w-2.5 h-2.5" /> Descendant Demise
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Event Details and Timeline context */}
            <div className="space-y-1.5 text-[11px] text-[#7A7570] leading-normal bg-[#FAF9F6] p-2 rounded border border-[#E5E1DA]">
              <div className="flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 stroke-1.5 shrink-0 mt-0.5" />
                <span className="font-medium text-[#2D2926] leading-tight">{point.locationName}</span>
              </div>
              
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <Calendar className="w-3.5 h-3.5 stroke-1.5 shrink-0" />
                <span>
                  {point.type === 'birth' 
                    ? `Born: ${point.member.birthDate || 'Unknown date'}` 
                    : `Died: ${point.member.deathDate || 'Unknown date'}`
                  }
                </span>
              </div>

              {point.member.occupation && (
                <div className="text-[10px] italic border-t border-stone-200/60 pt-1 mt-1 font-sans">
                  Occupation: {point.member.occupation}
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-stone-100">
              <button
                onClick={() => {
                  onSelectMember(point.member.id);
                  onDeactivate();
                }}
                className="bg-[#2D2926] hover:bg-[#1C1A18] text-white px-2.5 py-1 rounded text-[10px] font-bold font-sans transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Eye className="w-3 h-3" /> Set Focus Active
              </button>
            </div>

          </div>
        </InfoWindow>
      )}
    </>
  );
};
