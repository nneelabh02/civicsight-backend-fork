"use client";

import { useState, useEffect } from "react";
import { Camera, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { CivicAPI } from "../lib/api"; // <-- THE API LAYER IS IMPORTED HERE

// --- HELPER: Converts the image to a string the Python backend can read ---
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null); // NEW STATE
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file)); // Fast local preview
      const b64 = await convertToBase64(file); // Heavy string for the API
      setBase64Image(b64);
      getLocation();
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("Browser blocked location. Using fallback coordinates.");
          // Fallback coordinates so the demo NEVER breaks
          setLocation({ lat: 21.2514, lng: 81.6296 });
        }
      );
    } else {
      setLocation({ lat: 21.2514, lng: 81.6296 });
    }
  };

  // --- THE REAL API WIRING ---
  const submitReport = async () => {
    if (!base64Image || !location) {
      alert("Please ensure location and image are captured.");
      return;
    }

    setIsTriaging(true);
    
    try {
      // We shoot the data to your friend's Python server
      const result = await CivicAPI.reportIssue(base64Image, location.lat, location.lng);
      
      // The AI responds, and we render the slick success UI
      setReportSuccess({
        id: result.id,
        category: result.category,
        severity: result.severity,
        description: result.description
      });
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to reach the AI Command Center. Is the Python backend running?");
    } finally {
      setIsTriaging(false);
    }
  };

  if (!mounted) return null; 

  if (reportSuccess) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 font-sans">
        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
          
          <div className="bg-emerald-500/20 text-emerald-400 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50">
            <CheckCircle className="w-10 h-10" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Report Logged</h2>
          <p className="text-slate-300 mb-8 text-sm">AI has routed your issue to the municipal command center.</p>
          
          <div className="bg-black/20 text-left p-5 rounded-2xl mb-8 text-sm border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
              <span className="text-slate-400">Ticket ID</span>
              <span className="font-mono font-bold text-white tracking-wider">{reportSuccess.id}</span>
            </div>
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
              <span className="text-slate-400">Category</span>
              <span className="font-medium text-white">{reportSuccess.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Severity</span>
              <span className="bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-red-500/30">
                {reportSuccess.severity}
              </span>
            </div>
          </div>

          <button 
            onClick={() => { setReportSuccess(null); setImage(null); setBase64Image(null); setLocation(null); }}
            className="w-full bg-white text-slate-900 font-bold py-4 px-4 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
          >
            Report Another Issue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] p-6 selection:bg-blue-500/30">
      <div className="w-full max-w-md flex flex-col gap-8 relative">
        
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-2">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>
            Live Triage
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">CivicSight</h1>
          <p className="text-slate-500 font-medium">Capture. AI Triage. Resolve.</p>
        </div>

        <div className="group relative bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 aspect-[4/3] flex items-center justify-center overflow-hidden transition-all hover:shadow-2xl hover:border-blue-100">
          {image ? (
            <img src={image} alt="Captured" className="object-cover w-full h-full rounded-[1.5rem]" />
          ) : (
            <div className="text-slate-400 flex flex-col items-center gap-3 transition-transform group-hover:scale-105 group-hover:text-blue-500">
              <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
                <Camera className="w-10 h-10 stroke-[1.5]" />
              </div>
              <span className="font-medium">Tap to capture issue</span>
            </div>
          )}
          {!image && (
             <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          )}
        </div>

        <div className="flex justify-center h-8">
          {location && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
              <MapPin className="w-3.5 h-3.5" /> GPS Locked
            </div>
          )}
        </div>

        <button 
          disabled={!image || isTriaging}
          onClick={submitReport}
          className={`relative overflow-hidden w-full font-bold py-5 px-4 rounded-2xl text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)]
            ${!image ? "bg-slate-100 text-slate-400 shadow-none" : "bg-slate-900 text-white hover:bg-black active:scale-[0.98] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"}
          `}
        >
          {isTriaging ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 text-slate-400" />
              <span className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">Running AI Vision...</span>
            </>
          ) : image ? "Submit to AI Engine" : "Waiting for photo"}
        </button>

      </div>
    </main>
  );
}