import React, { useRef, useEffect, useState } from 'react';
import { TripPlan, Activity, Coordinates } from '../types';
import { 
  Clock, Map, MapPin, Coffee, Camera, Footprints, Armchair, 
  RefreshCw, X, Globe, ImageIcon, CloudSun, Wallet, Download, Loader2, Plane, Bookmark, Check, Navigation, Car, GripVertical, Sparkles, Home, Pencil, Save, Search, Share2, Sparkle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateTripPoster } from '../services/geminiService';

interface ItineraryListProps {
  plan: TripPlan;
  selectedDayIndex: number;
  onDaySelect: (index: number) => void;
  onReplaceActivity: (dayIndex: number, activityIndex: number, currentActivity: Activity) => Promise<Activity | undefined>;
  onSavePlan: (plan: TripPlan) => void;
  isAlreadySaved: boolean;
  onReorderActivities?: (dayIndex: number, newActivities: Activity[]) => void;
  isRefreshingLogistics?: boolean;
  onEditActivity?: (dayIndex: number, activityIndex: number, updatedActivity: Activity) => void;
}

const ActivityIcon = ({ type, size = "w-4 h-4" }: { type: string, size?: string }) => {
  switch (type) {
    case 'food': return <Coffee className={`${size} text-orange-500`} />;
    case 'landmark': return <Camera className={`${size} text-purple-600`} />;
    case 'relax': return <Armchair className={`${size} text-green-500`} />;
    case 'stay': return <Home className={`${size} text-blue-600`} />;
    default: return <Footprints className={`${size} text-blue-600`} />;
  }
};

const ItineraryList: React.FC<ItineraryListProps> = ({ 
  plan, 
  selectedDayIndex, 
  onDaySelect, 
  onReplaceActivity, 
  onSavePlan, 
  isAlreadySaved,
  onReorderActivities,
  isRefreshingLogistics,
  onEditActivity
}) => {
  const currentDay = plan.itinerary[selectedDayIndex];
  const listContainerRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  
  const [selectedActivity, setSelectedActivity] = useState<{ activity: Activity, index: number } | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Postcard state
  const [isGeneratingPostcard, setIsGeneratingPostcard] = useState(false);
  const [postcardUrl, setPostcardUrl] = useState<string | null>(plan.postcardUrl || null);
  const [showPostcardModal, setShowPostcardModal] = useState(false);

  // Drag & Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (listContainerRef.current) listContainerRef.current.scrollTop = 0;
  }, [selectedDayIndex]);

  const handleSave = () => {
    onSavePlan({ ...plan, postcardUrl: postcardUrl || undefined });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleGeneratePostcard = async () => {
    if (postcardUrl) {
      setShowPostcardModal(true);
      return;
    }
    setIsGeneratingPostcard(true);
    try {
      const url = await generateTripPoster(plan);
      setPostcardUrl(url);
      setShowPostcardModal(true);
    } catch (e) {
      console.error(e);
      alert("Failed to generate AI postcard. Please try again.");
    } finally {
      setIsGeneratingPostcard(false);
    }
  };

  const handleReplace = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedActivity) return;
    setIsReplacing(true);
    try {
        await onReplaceActivity(selectedDayIndex, selectedActivity.index, selectedActivity.activity);
        setSelectedActivity(null);
    } finally {
        setIsReplacing(false);
    }
  };

  const startEditing = () => {
    if (!selectedActivity) return;
    setEditName(selectedActivity.activity.name);
    setEditDesc(selectedActivity.activity.description);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedActivity || !onEditActivity) return;
    const updated = { ...selectedActivity.activity, name: editName, description: editDesc };
    onEditActivity(selectedDayIndex, selectedActivity.index, updated);
    setSelectedActivity({ ...selectedActivity, activity: updated });
    setIsEditing(false);
  };

  const handleExportPdf = async () => {
    if (!pdfTemplateRef.current) return;
    setIsGeneratingPdf(true);
    try {
      pdfTemplateRef.current.style.display = 'block';
      const canvas = await html2canvas(pdfTemplateRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TripGenie-${plan.destination.replace(/\s+/g, '-')}.pdf`);
      pdfTemplateRef.current.style.display = 'none';
    } finally { setIsGeneratingPdf(false); }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDropTargetIndex(index);
  };

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }
    const newActivities = [...currentDay.activities];
    const item = newActivities.splice(draggedIndex, 1)[0];
    newActivities.splice(targetIndex, 0, item);
    if (onReorderActivities) onReorderActivities(selectedDayIndex, newActivities);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div className="flex flex-col bg-white h-full w-full overflow-hidden relative">
      <div className="flex-none p-4 border-b border-slate-100 bg-white shadow-sm z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Your Plan</h2>
            <div className="flex items-center gap-2">
                {isRefreshingLogistics && <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /><span className="text-[10px] font-black uppercase">Syncing...</span></div>}
                <button onClick={handleSave} className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 font-black rounded-lg uppercase border transition-all ${justSaved || isAlreadySaved ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>{justSaved || isAlreadySaved ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}{justSaved ? 'Saved!' : isAlreadySaved ? 'Saved' : 'Save'}</button>
                <button onClick={handleExportPdf} disabled={isGeneratingPdf} className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-indigo-50 text-indigo-600 font-black rounded-lg uppercase border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50">{isGeneratingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}PDF</button>
            </div>
          </div>
          <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
            {plan.itinerary.map((day, index) => (
              <button key={day.dayNumber} onClick={() => onDaySelect(index)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedDayIndex === index ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>Day {day.dayNumber}</button>
            ))}
          </div>
        </div>
      </div>

      <div ref={listContainerRef} className="flex-1 overflow-y-auto bg-slate-50/30 p-4 no-scrollbar">
        <div className="flex flex-col gap-5 max-w-2xl mx-auto pb-10">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0"><Wallet className="w-4 h-4" /></div><div className="flex-1 min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Cost</p><p className="text-sm font-black text-slate-800 break-words">{plan.currency === 'USD' ? '$' : '₹'}{plan.totalEstimatedCost}</p></div></div>
             <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0"><CloudSun className="w-4 h-4" /></div><div className="flex-1 min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Season</p><p className="text-xs font-bold text-slate-800 leading-tight mt-0.5 break-words">{plan.weatherAdvisory || 'Mild weather'}</p></div></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg flex-shrink-0"><Map className="w-6 h-6" /></div><div><h3 className="text-lg font-black text-slate-800 leading-tight">{currentDay.theme}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Day {currentDay.dayNumber} Overview</p></div></div>
             <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6">{plan.summary}</p>
             
             <button 
                onClick={handleGeneratePostcard}
                disabled={isGeneratingPostcard}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 group"
             >
                {isGeneratingPostcard ? <Loader2 className="w-4 h-4 animate-spin" /> : postcardUrl ? <ImageIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingPostcard ? "Painting Your Postcard..." : postcardUrl ? "View Trip Postcard" : "Generate AI Trip Postcard"}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>
          </div>

          <div className="flex flex-col gap-0 relative">
            {isRefreshingLogistics && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[50] rounded-3xl flex items-center justify-center"><div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce"><Sparkles className="w-5 h-5" /><span className="text-sm font-black">AI Updating Schedule...</span></div></div>
            )}

            {/* Optional Stay Location - START */}
            {plan.stayLocation && (
              <div onClick={() => setSelectedActivity({ activity: plan.stayLocation!, index: -1 })} className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 shadow-sm mb-4 cursor-pointer group/stay transition-all hover:bg-blue-100/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover/stay:rotate-12 transition-transform"><Home className="w-5 h-5" /></div>
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Base Camp / Start</p>
                       <h4 className="text-base font-black text-slate-800">{plan.stayLocation.name}</h4>
                    </div>
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg group-hover/stay:bg-blue-600 group-hover/stay:text-white transition-colors">
                        <Navigation className="w-3.5 h-3.5" />
                    </div>
                 </div>
              </div>
            )}

            {currentDay.activities.map((activity, index) => (
              <React.Fragment key={`${index}-${activity.name}`}>
                {index === 0 && plan.stayLocation && (
                   <div className="flex items-center gap-3 ml-12 my-2 h-10 relative"><div className="absolute top-0 bottom-0 left-[-21px] w-0.5 border-l-2 border-dashed border-blue-200"></div></div>
                )}
                {index > 0 && (activity.travelDistance || activity.travelTime) && (
                  <div className="flex items-center gap-3 ml-12 my-2 h-12 relative"><div className="absolute top-0 bottom-0 left-[-21px] w-0.5 border-l-2 border-dashed border-slate-200"></div><div className="bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm animate-fade-in"><Car className="w-3 h-3 text-blue-500" /><span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{activity.travelDistance} • {activity.travelTime}</span></div></div>
                )}
                {index > 0 && (!activity.travelDistance && !activity.travelTime) && (
                  <div className="flex items-center gap-3 ml-12 my-2 h-8 relative"><div className="absolute top-0 bottom-0 left-[-21px] w-0.5 border-l-2 border-dashed border-slate-200"></div></div>
                )}
                <div draggable onDragStart={(e) => onDragStart(e, index)} onDragOver={(e) => onDragOver(e, index)} onDrop={(e) => onDrop(e, index)} onClick={() => setSelectedActivity({ activity, index })} className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all cursor-pointer group/card relative z-10 mb-4 last:mb-0 ${draggedIndex === index ? 'opacity-30 scale-95 border-blue-500' : dropTargetIndex === index ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100 hover:shadow-md hover:border-blue-300'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-none flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-lg text-slate-400 group-hover/card:bg-blue-600 group-hover/card:text-white transition-colors">{index + 1}</div><div className="p-1 hover:bg-slate-200 rounded-md cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"><GripVertical className="w-4 h-4" /></div></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2"><div className="flex items-center gap-2"><span className="p-1.5 rounded-lg bg-slate-50 text-slate-600 group-hover/card:bg-blue-50 group-hover/card:text-blue-600 transition-colors"><ActivityIcon type={activity.type} /></span><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3" /><span className={isRefreshingLogistics ? 'animate-pulse text-blue-400' : ''}>{activity.time}</span></span></div>{activity.price && <div className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black rounded-full border border-green-100 flex-shrink-0">{plan.currency === 'USD' ? '$' : '₹'}{activity.price}</div>}</div>
                      <h4 className="text-lg font-black text-slate-800 mb-2 leading-tight">{activity.name}</h4>
                      <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">{activity.description}</p>
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50">{activity.items?.map((item, i) => <span key={i} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100">{item}</span>)}</div>
                    </div>
                    {activity.groundingLinks && activity.groundingLinks.length > 0 && <div className="flex-none pt-1"><Globe className="w-4 h-4 text-blue-200 group-hover/card:text-blue-500 transition-colors" /></div>}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Optional Stay Location - END */}
            {plan.stayLocation && (
              <>
                 <div className="flex items-center gap-3 ml-12 my-2 h-10 relative"><div className="absolute top-0 bottom-0 left-[-21px] w-0.5 border-l-2 border-dashed border-blue-200"></div></div>
                 <div onClick={() => setSelectedActivity({ activity: plan.stayLocation!, index: -1 })} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 shadow-sm cursor-pointer group/stay transition-all hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 group-hover/stay:bg-blue-600 group-hover/stay:text-white transition-all"><Home className="w-5 h-5" /></div>
                        <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Camp / Return</p>
                        <h4 className="text-base font-black text-slate-800">{plan.stayLocation.name}</h4>
                        </div>
                        <div className="p-1.5 bg-slate-200 text-slate-400 rounded-lg group-hover/stay:bg-blue-600 group-hover/stay:text-white transition-colors">
                            <Navigation className="w-3.5 h-3.5" />
                        </div>
                    </div>
                 </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => { setSelectedActivity(null); setIsEditing(false); }}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-[10000] animate-fade-in-up flex flex-col max-h-[85vh]">
                <div className="h-40 sm:h-44 w-full bg-slate-200 relative group/img overflow-hidden flex-none">
                    <img src={`https://image.pollinations.ai/prompt/${encodeURIComponent('Sharp travel photo of ' + selectedActivity.activity.name + ' in ' + plan.destination)}?width=800&height=400&nologo=true`} alt={selectedActivity.activity.name} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" />
                    <button onClick={() => { setSelectedActivity(null); setIsEditing(false); }} className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md border border-white/20 transition-all z-20"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 sm:p-7 overflow-y-auto no-scrollbar flex-1">
                    <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full text-xl sm:text-2xl font-black text-slate-800 border-b-2 border-blue-500 outline-none pb-1 bg-slate-50 rounded px-2" placeholder="Activity Title" />
                            ) : (
                              <div className="flex items-center gap-3">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{selectedActivity.activity.name}</h2>
                                <button onClick={startEditing} className="p-1.5 bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1.5 font-bold uppercase tracking-widest"><MapPin className="w-3 h-3 text-blue-500" />{plan.destination}</p>
                        </div>
                        {!isEditing && (
                          <div className="text-right flex-shrink-0 flex flex-col items-end">
                              <div className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{selectedActivity.activity.time}</div>
                              {selectedActivity.activity.price && <div className="text-xs text-green-600 font-black mt-1.5">{plan.currency === 'USD' ? '$' : '₹'}{selectedActivity.activity.price}</div>}
                          </div>
                        )}
                    </div>

                    {isEditing ? (
                      <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full h-32 p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-600 text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none" placeholder="Add some personal notes or descriptions..." />
                    ) : (
                      <>
                        {selectedActivity.activity.travelDistance && <div className="flex items-center gap-2 mb-4 text-[11px] font-black text-slate-400 uppercase"><Navigation className="w-3 h-3 text-blue-500" /> {selectedActivity.activity.travelDistance} from previous</div>}
                        <p className="text-slate-600 mb-6 text-xs sm:text-sm leading-relaxed font-medium">{selectedActivity.activity.description}</p>
                      </>
                    )}
                </div>
                <div className="p-5 border-t border-slate-100 grid grid-cols-2 gap-3 bg-white flex-none">
                    {isEditing ? (
                      <>
                        <button onClick={() => setIsEditing(false)} className="bg-slate-100 text-slate-600 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-200">Cancel</button>
                        <button onClick={saveEdit} className="bg-blue-600 text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"><Save className="w-4 h-4" /> Save Changes</button>
                      </>
                    ) : (
                      <>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedActivity.activity.name + ' ' + plan.destination)}`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95"><MapPin className="w-4 h-4" /> Navigation</a>
                        <button onClick={handleReplace} disabled={isReplacing} className="bg-slate-50 border border-slate-200 text-slate-700 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-100 disabled:opacity-50 active:scale-95">{isReplacing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Swap Spot</button>
                      </>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Postcard Modal */}
      {showPostcardModal && postcardUrl && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setShowPostcardModal(false)}></div>
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 animate-fade-in-up flex flex-col">
                <div className="p-8 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Sparkle className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                            AI Trip Postcard
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Grounded artistic interpretation</p>
                    </div>
                    <button onClick={() => setShowPostcardModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="p-8 bg-slate-50 flex-1 flex flex-col items-center justify-center overflow-y-auto min-h-0">
                    <div className="relative group max-w-full">
                        <img 
                            src={postcardUrl} 
                            alt="AI Postcard" 
                            className="w-full h-auto rounded-3xl shadow-2xl border-4 border-white transform transition-transform duration-500 group-hover:scale-[1.01]" 
                        />
                        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/10"></div>
                    </div>
                    <p className="mt-8 text-slate-400 text-xs font-bold text-center max-w-lg leading-relaxed italic opacity-80">
                        "This postcard was generated by Gemini based on your specific itinerary, destination landmarks, and seasonal atmosphere."
                    </p>
                </div>
                <div className="p-8 border-t flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a 
                        href={postcardUrl} 
                        download={`TripGenie-Postcard-${plan.destination}.png`}
                        className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Download Postcard
                    </a>
                    <button 
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Postcard from ${plan.destination}`,
                                    text: `Check out my AI-planned trip to ${plan.destination}!`,
                                    url: window.location.href
                                });
                            }
                        }}
                        className="w-full sm:w-auto px-10 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <Share2 className="w-4 h-4" /> Share Trip
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PDF Generation Template (Hidden) */}
      <div ref={pdfTemplateRef} style={{ position: 'fixed', left: '-9999px', width: '210mm', backgroundColor: 'white', display: 'none' }} className="p-10 font-sans">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-6 mb-8">
            <div className="flex items-center gap-3"><div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Plane className="w-7 h-7" /></div><div><h1 className="text-3xl font-black text-slate-800">TripGenie</h1><p className="text-blue-600 font-bold text-sm tracking-widest uppercase">{plan.destination}</p></div></div>
            <div className="text-right"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Estimated Total</p><p className="text-2xl font-black text-slate-800">{plan.currency === 'USD' ? '$' : '₹'}{plan.totalEstimatedCost}</p></div>
        </div>
        {plan.itinerary.map(day => (
            <div key={day.dayNumber} className="mb-10 last:mb-0">
                <div className="flex items-center gap-4 mb-6 border-l-8 border-blue-600 pl-4"><h2 className="text-2xl font-black text-slate-800">Day {day.dayNumber}</h2><span className="text-slate-400 font-black tracking-widest uppercase text-xs">— {day.theme}</span></div>
                <div className="space-y-4">
                    {day.activities.map((act, i) => (
                        <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-2xl bg-white shadow-sm"><div className="flex-none w-16 text-center"><p className="text-[10px] font-black text-blue-600">{act.time}</p><div className="mt-2 w-10 h-10 mx-auto rounded-lg bg-slate-50 flex items-center justify-center"><ActivityIcon type={act.type} /></div></div><div className="flex-1"><div className="flex justify-between items-start mb-1"><h3 className="font-black text-slate-800">{act.name}</h3>{act.price && <span className="text-[10px] font-black text-green-600 px-2 py-0.5 bg-green-50 rounded-full">{plan.currency === 'USD' ? '$' : '₹'}{act.price}</span>}</div><p className="text-xs text-slate-500 leading-relaxed font-medium">{act.description}</p></div></div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryList;