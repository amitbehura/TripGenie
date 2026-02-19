import React, { useState, useEffect } from 'react';
import { TripRequest, TripBounds, Activity } from '../types';
import { MapPin, Calendar, Heart, Search, Loader2, X, Layers, CheckCircle2, DollarSign, Coins, Clock, ChevronDown, ChevronUp, MessageSquareQuote, Wallet, CloudSun, Home } from 'lucide-react';

interface TripInputProps {
  onPlanTrip: (request: TripRequest) => void;
  isLoading: boolean;
  selectedAreas: TripBounds[];
  onClearSelection: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const TripInput: React.FC<TripInputProps> = ({ onPlanTrip, isLoading, selectedAreas, onClearSelection }) => {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(1);
  const [interests, setInterests] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
  const [includeStay, setIncludeStay] = useState(false);
  const [preSelectedStay, setPreSelectedStay] = useState<Activity | null>(null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('20:00');
  const [customInstructions, setCustomInstructions] = useState('');
  const [budgetCap, setBudgetCap] = useState<number | undefined>(undefined);
  const [travelMonth, setTravelMonth] = useState<string>(MONTHS[new Date().getMonth()]);

  // Hotel Search State
  const [hotelQuery, setHotelQuery] = useState('');
  const [isSearchingHotels, setIsSearchingHotels] = useState(false);
  const [hotelResults, setHotelResults] = useState<any[]>([]);

  useEffect(() => {
    if (selectedAreas.length > 0) setDestination('');
  }, [selectedAreas]);

  const handleHotelSearch = async () => {
    if (!hotelQuery.trim()) return;
    setIsSearchingHotels(true);
    try {
      const searchLoc = destination || (selectedAreas.length > 0 ? "near selected area" : "");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(hotelQuery + ' ' + searchLoc)}`);
      const data = await res.json();
      setHotelResults(data);
    } catch (e) {
      console.error("Hotel search failed", e);
    } finally {
      setIsSearchingHotels(false);
    }
  };

  const selectHotel = (result: any) => {
    const stay: Activity = {
      name: result.display_name.split(',')[0],
      location: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
      description: `Stay location: ${result.display_name}`,
      time: 'Check-in',
      type: 'stay',
      price: '0',
      items: []
    };
    setPreSelectedStay(stay);
    setHotelResults([]);
    setHotelQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() && selectedAreas.length === 0) return;
    onPlanTrip({ 
      destination: destination, 
      days, 
      interests,
      currency,
      selectedAreas: selectedAreas.length > 0 ? selectedAreas : null,
      startTime,
      endTime,
      customInstructions,
      budgetCap,
      travelMonth,
      includeStay,
      preSelectedStay
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/40 w-full animate-fade-in-up max-h-[80vh] overflow-y-auto no-scrollbar">
      <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3 sticky top-0 bg-white/5 py-2 z-10">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 flex-shrink-0"><MapPin className="w-5 h-5" /></div>
        Plan Your Journey
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Where to?</label>
          <div className="relative">
            {selectedAreas.length > 0 ? (
              <div className="w-full pl-11 pr-10 py-3.5 border-2 border-blue-500 bg-blue-50 text-blue-800 rounded-2xl flex items-center justify-between font-bold shadow-sm">
                <span className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-blue-600" />{selectedAreas.length} Region{selectedAreas.length > 1 ? 's' : ''} Selected</span>
                <button type="button" onClick={onClearSelection} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-red-500 transition-all"><X className="w-5 h-5" /></button>
              </div>
            ) : (
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City name..." className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 bg-white rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm" required={selectedAreas.length === 0} />
            )}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{selectedAreas.length > 0 ? <Layers className="w-5 h-5 text-blue-600" /> : <Search className="w-5 h-5" />}</div>
          </div>
        </div>

        {/* Stay Location Section */}
        <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border-2 border-blue-100 shadow-sm group cursor-pointer" onClick={() => setIncludeStay(!includeStay)}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${includeStay ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200'}`}>
                    {includeStay && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                    <p className="text-xs font-black text-slate-700 flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-blue-500" /> Include Hotel / Stay Location</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">Stay location costs are ignored in budget.</p>
                </div>
            </div>

            {includeStay && (
                <div className="animate-fade-in-down space-y-3">
                    {preSelectedStay ? (
                        <div className="flex items-center justify-between p-3 bg-white border-2 border-blue-500 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Home className="w-4 h-4" /></div>
                                <div className="min-w-0"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Your Stay</p><p className="text-xs font-black text-slate-800 line-clamp-1">{preSelectedStay.name}</p></div>
                            </div>
                            <button type="button" onClick={() => setPreSelectedStay(null)} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input 
                                type="text" 
                                value={hotelQuery} 
                                onChange={(e) => setHotelQuery(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleHotelSearch())}
                                placeholder="Search for your hotel..." 
                                className="w-full pl-10 pr-12 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <button 
                                type="button"
                                onClick={handleHotelSearch}
                                disabled={isSearchingHotels}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase rounded-lg hover:bg-black disabled:opacity-50"
                            >
                                {isSearchingHotels ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Find'}
                            </button>

                            {hotelResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar animate-fade-in-down">
                                    {hotelResults.map((res, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => selectHotel(res)}
                                            className="p-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                                        >
                                            <p className="text-xs font-black text-slate-800 mb-0.5 line-clamp-1">{res.display_name.split(',')[0]}</p>
                                            <p className="text-[9px] font-bold text-slate-400 line-clamp-1">{res.display_name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Days</label>
            <div className="relative"><input type="number" min="1" max="14" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 1)} className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 bg-white rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700 shadow-sm" /><Calendar className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" /></div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Currency</label>
            <div className="flex bg-slate-100/50 p-1 rounded-2xl border-2 border-slate-100 shadow-sm">
              <button type="button" onClick={() => setCurrency('USD')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${currency === 'USD' ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><DollarSign className="w-3.5 h-3.5" /> USD</button>
              <button type="button" onClick={() => setCurrency('INR')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${currency === 'INR' ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><Coins className="w-3.5 h-3.5" /> INR</button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Interests</label>
          <div className="relative"><input type="text" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Food, Nature, Architecture..." className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 bg-white rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm" /><Heart className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" /></div>
        </div>
        <div className="pt-1">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 flex items-center gap-2 transition-colors ml-1 active:scale-95">{showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Advanced Options</button>
            {showAdvanced && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4 animate-fade-in-down shadow-inner">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label><div className="relative"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:border-blue-400 outline-none shadow-sm" /><Clock className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /></div></div>
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End Time</label><div className="relative"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:border-blue-400 outline-none shadow-sm" /><Clock className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Budget Cap</label><div className="relative"><input type="number" value={budgetCap || ''} onChange={(e) => setBudgetCap(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Total amount..." className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:border-blue-400 outline-none shadow-sm" /><Wallet className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /></div></div>
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Month</label><div className="relative"><select value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)} className="w-full pl-9 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:border-blue-400 outline-none shadow-sm appearance-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select><CloudSun className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /></div></div>
                    </div>
                    <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Specific Instructions</label><div className="relative"><textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="E.g. Traveling with my partner..." rows={2} className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-[11px] focus:border-blue-400 outline-none resize-none shadow-sm" /><MessageSquareQuote className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-3" /></div></div>
                </div>
            )}
        </div>
        <div className="pt-2 sticky bottom-0 bg-white/5 py-2">
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]">
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Crafting Trip...</> : `Generate Journey`}
            </button>
        </div>
      </form>
    </div>
  );
};

export default TripInput;