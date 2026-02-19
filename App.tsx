import React, { useState, useCallback, useRef, useEffect } from 'react';
import TripInput from './components/TripInput';
import TripMap from './components/TripMap';
import HomeMap from './components/HomeMap';
import ItineraryList from './components/ItineraryList';
import { generateTripPlan, generateReplacementActivity, recalculateLogistics } from './services/geminiService';
import { TripRequest, TripPlan, TripBounds, Activity } from './types';
import { Plane, Sparkles, ArrowLeft, GripVertical, History, X, Trash2, Calendar, MapPin } from 'lucide-react';

const LOADING_MESSAGES = [
  "Scouring the map for hidden gems...",
  "Checking local opening hours...",
  "Calculating the best routes for you...",
  "Fact-checking locations with Google Search...",
  "Staying within your budget...",
  "Consulting the seasonal weather...",
  "Almost there! Polishing your itinerary..."
];

const App: React.FC = () => {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [areaSelections, setAreaSelections] = useState<TripBounds[]>([]);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [savedPlans, setSavedPlans] = useState<TripPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshingLogistics, setIsRefreshingLogistics] = useState(false);
  
  const [itineraryWidth, setItineraryWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = localStorage.getItem('tripgenie_saved_plans');
    if (data) {
      try {
        setSavedPlans(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse saved plans", e);
      }
    }
  }, []);

  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsResizing(true);
    if (e.cancelable) e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    let clientX: number;
    if (e instanceof MouseEvent) clientX = e.clientX;
    else clientX = e.touches[0].clientX;
    const containerLeft = containerRef.current.getBoundingClientRect().left;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const newWidth = clientX - containerLeft;
    if (newWidth > 320 && newWidth < containerWidth * 0.75) setItineraryWidth(newWidth);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('touchmove', resize, { passive: false });
      window.addEventListener('touchend', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const handlePlanTrip = async (request: TripRequest) => {
    setLoading(true);
    setLoadingMsgIndex(0);
    setError(null);
    setPlan(null);
    try {
      const result = await generateTripPlan(request);
      setPlan(result);
      setSelectedDayIndex(0);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try a different area.");
    } finally {
      setLoading(false);
    }
  };

  const handleReorderActivities = async (dayIndex: number, newActivities: Activity[]) => {
    if (!plan) return;
    const updatedPlan = { ...plan };
    updatedPlan.itinerary[dayIndex].activities = newActivities;
    setPlan(updatedPlan);
    setIsRefreshingLogistics(true);
    try {
      const day = updatedPlan.itinerary[dayIndex];
      const syncedActivities = await recalculateLogistics(day.activities, plan.destination, plan.stayLocation);
      const finalPlan = { ...updatedPlan };
      finalPlan.itinerary[dayIndex].activities = syncedActivities;
      setPlan(finalPlan);
    } catch (err) {
      console.error("Automatic logistics sync failed", err);
    } finally {
      setIsRefreshingLogistics(false);
    }
  };

  const handleEditActivity = (dayIndex: number, activityIndex: number, updatedActivity: Activity) => {
    if (!plan) return;
    const newPlan = { ...plan };
    if (activityIndex === -1) { // Special case for stayLocation
      newPlan.stayLocation = updatedActivity;
    } else {
      newPlan.itinerary[dayIndex].activities[activityIndex] = updatedActivity;
    }
    setPlan(newPlan);
  };

  const handleReplaceActivity = async (dayIndex: number, activityIndex: number, currentActivity: Activity) => {
    if (!plan) return;
    const excludedPlaces = plan.itinerary.flatMap(day => day.activities.map(act => act.name));
    try {
      const day = plan.itinerary[dayIndex];
      const newActivity = await generateReplacementActivity(currentActivity, plan.destination, day.theme, plan.currency, excludedPlaces);
      const newPlan = { ...plan };
      newPlan.itinerary[dayIndex].activities[activityIndex] = newActivity;
      setPlan(newPlan);
      return newActivity;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleSavePlan = (planToSave: TripPlan) => {
    const timestampedPlan = { ...planToSave, createdAt: Date.now() };
    const newSaved = [timestampedPlan, ...savedPlans.filter(p => p.id !== planToSave.id)];
    setSavedPlans(newSaved);
    localStorage.setItem('tripgenie_saved_plans', JSON.stringify(newSaved));
  };

  const handleDeleteSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSaved = savedPlans.filter(p => p.id !== id);
    setSavedPlans(newSaved);
    localStorage.setItem('tripgenie_saved_plans', JSON.stringify(newSaved));
  };

  const loadSavedPlan = (saved: TripPlan) => {
    setPlan(saved);
    setSelectedDayIndex(0);
    setShowHistory(false);
  };

  const resetApp = () => {
    setPlan(null);
    setAreaSelections([]);
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden" ref={containerRef}>
      {!plan && <HomeMap onAreasSelect={setAreaSelections} selectedAreas={areaSelections} />}

      <header className={`border-b sticky top-0 z-[100] transition-all duration-500 h-16 flex-none ${plan ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/80 backdrop-blur-xl border-transparent'}`}>
        <div className="max-w-full mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={resetApp}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
              <Plane className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-700">
              TripGenie
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-[11px] font-black uppercase tracking-widest text-slate-500 relative"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Plans</span>
              {savedPlans.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">{savedPlans.length}</span>}
            </button>
            {plan && (
              <button onClick={resetApp} className="hidden sm:flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-[11px] font-black uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4" /> New Plan
              </button>
            )}
            <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> AI Grounded
            </span>
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full z-10 relative flex flex-col overflow-hidden ${!plan ? 'pointer-events-none' : ''}`}>
        {!plan && !loading && areaSelections.length > 0 && (
          <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none overflow-y-auto py-10">
             <div className="pointer-events-auto w-full max-w-md px-4 my-auto">
                <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-[2.5rem] shadow-2xl border border-white/20">
                  <TripInput onPlanTrip={handlePlanTrip} isLoading={loading} selectedAreas={areaSelections} onClearSelection={() => setAreaSelections([])} />
                </div>
                {error && <div className="mt-4 p-4 bg-red-50/95 border-2 border-red-100 text-red-600 rounded-2xl text-xs font-black shadow-xl animate-shake">{error}</div>}
             </div>
          </div>
        )}
        {loading && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-xl z-[200] pointer-events-auto animate-fade-in">
             <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-sm mx-4 border border-slate-100">
                <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-blue rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <Plane className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-800 text-center leading-tight">Crafting Your Dream Trip</h3>
                <div className="h-10 mt-4 flex items-center justify-center"><p className="text-slate-400 font-bold text-center text-xs tracking-wide animate-fade-in-up transition-all duration-500">{LOADING_MESSAGES[loadingMsgIndex]}</p></div>
             </div>
           </div>
        )}
        {plan && (
          <div className={`flex flex-row h-full animate-fade-in pointer-events-auto ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
            <div className="flex-none bg-white border-r border-slate-200 shadow-xl z-[40] overflow-hidden" style={{ width: `${itineraryWidth}px` }}>
              <ItineraryList 
                plan={plan} 
                selectedDayIndex={selectedDayIndex} 
                onDaySelect={setSelectedDayIndex} 
                onReplaceActivity={handleReplaceActivity}
                onSavePlan={handleSavePlan}
                isAlreadySaved={savedPlans.some(p => p.id === plan.id)}
                onReorderActivities={handleReorderActivities}
                isRefreshingLogistics={isRefreshingLogistics}
                onEditActivity={handleEditActivity}
              />
            </div>
            <div className={`w-1 flex-none cursor-col-resize flex flex-col items-center justify-center transition-colors z-[30] group relative ${isResizing ? 'bg-blue-600' : 'bg-slate-100 hover:bg-blue-400'}`} onMouseDown={startResizing} onTouchStart={startResizing}>
              <div className={`absolute left-1/2 -translate-x-1/2 p-0.5 bg-white rounded-full shadow-lg border border-slate-200 transition-transform z-[30] ${isResizing ? 'scale-125' : 'group-hover:scale-110'}`}><GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" /></div>
            </div>
            <div className="flex-1 relative min-w-0 bg-slate-100 overflow-hidden z-[20]"><TripMap plan={plan} selectedDay={selectedDayIndex} /></div>
          </div>
        )}
      </main>
      {showHistory && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowHistory(false)}></div>
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
               <div><h2 className="text-xl font-black text-slate-800">Saved Journeys</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Newest to oldest</p></div>
               <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {savedPlans.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4"><Plane className="w-12 h-12 opacity-20" /><p className="font-bold text-sm">No saved trips yet. Start planning!</p></div>
              ) : (
                savedPlans.map((saved) => (
                  <div key={saved.id} onClick={() => loadSavedPlan(saved)} className="group bg-white border border-slate-100 hover:border-blue-500 hover:shadow-xl p-5 rounded-3xl transition-all cursor-pointer relative">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><MapPin className="w-4 h-4" /></div><h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">{saved.destination}</h3></div>
                        <div className="flex flex-wrap gap-3 mt-3">
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider"><Calendar className="w-3.5 h-3.5" /> {saved.itinerary.length} Days</div>
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" /> {saved.itinerary[0]?.theme || 'Trip'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2"><span className="text-[9px] font-black text-slate-300 uppercase">Saved {new Date(saved.createdAt || 0).toLocaleDateString()}</span><button onClick={(e) => handleDeleteSaved(e, saved.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 bg-slate-50/50 border-t text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stored locally on your device</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;