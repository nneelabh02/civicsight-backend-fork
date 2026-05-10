"use client";

import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, closestCorners, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock, CheckCircle2, LayoutDashboard, Search, Bell } from "lucide-react";

// Mock Data
const INITIAL_TICKETS = [
  { id: "TKT-1042", category: "Severe Pothole", severity: "High", description: "Massive crater in middle lane causing traffic backup.", lat: 21.2514, lng: 81.6296, status: "reported", image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80" },
  { id: "TKT-0891", category: "Fallen Tree", severity: "High", description: "Oak tree blocking sidewalk and street.", lat: 21.2498, lng: 81.6310, status: "in-progress", image: "https://images.unsplash.com/photo-1590523267591-6ce1e9124409?auto=format&fit=crop&w=400&q=80" },
  { id: "TKT-0755", category: "Streetlight Out", severity: "Low", description: "Corner streetlight flickering.", lat: 21.2550, lng: 81.6210, status: "resolved", image: "https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=400&q=80" }
];

const COLUMNS = [
  { id: "reported", title: "New AI Reports", icon: AlertTriangle, color: "text-rose-500", border: "border-t-rose-500" },
  { id: "in-progress", title: "Dispatched", icon: Clock, color: "text-amber-500", border: "border-t-amber-500" },
  { id: "resolved", title: "Resolved", icon: CheckCircle2, color: "text-emerald-500", border: "border-t-emerald-500" }
];

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  // Wait for browser mount to prevent dnd-kit ID hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    setTickets((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: over.id as string } : t)));
  };

  // If not mounted on the client yet, return a blank screen (or loading spinner)
  if (!mounted) return <div className="min-h-screen bg-[#0A0A0B]"></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Premium Dark Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">CivicSight<span className="text-slate-500 font-normal ml-2">City Command</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm text-slate-400 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <Search className="w-4 h-4" />
            <input type="text" placeholder="Search Ticket ID..." className="bg-transparent border-none outline-none w-48 text-white placeholder:text-slate-500" />
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer transition-colors" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-[#0A0A0B]"></span></span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 border border-white/20"></div>
        </div>
      </header>

      {/* Kanban Board Area */}
      <main className="p-8 overflow-x-auto h-[calc(100vh-73px)]">
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 min-w-max h-full items-start">
            
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-[400px] flex flex-col h-full">
                {/* Column Header (Linear Style) */}
                <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-white/5`}>
                  <col.icon className={`w-4 h-4 ${col.color}`} />
                  <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">{col.title}</h2>
                  <span className="ml-auto bg-white/5 px-2 py-0.5 rounded text-xs font-mono text-slate-400">
                    {tickets.filter(t => t.status === col.id).length}
                  </span>
                </div>

                <DropZone id={col.id}>
                  {tickets.filter(t => t.status === col.id).map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </DropZone>
              </div>
            ))}

          </div>
        </DndContext>
      </main>
    </div>
  );
}

// --- DRAG AND DROP COMPONENTS ---

function DropZone({ id, children }: { id: string, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 flex flex-col gap-3 rounded-xl min-h-[200px] p-1 transition-colors duration-300 ${isOver ? "bg-white/5 ring-1 ring-white/10" : ""}`}>
      {children}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: ticket.id });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  const isHigh = ticket.severity === 'High';

  return (
    <div 
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`group bg-[#121214] border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-[#18181B] transition-all shadow-lg relative overflow-hidden`}
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 w-full h-1 ${isHigh ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}></div>
      
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{ticket.id}</span>
        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider border
          ${isHigh ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
        `}>
          {ticket.severity}
        </span>
      </div>

      <div className="flex gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <img src={ticket.image} alt="Issue" className="w-full h-full rounded-lg object-cover border border-white/10" />
          <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10"></div>
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="font-semibold text-slate-200 leading-tight mb-1">{ticket.category}</h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{ticket.description}</p>
        </div>
      </div>
    </div>
  );
}