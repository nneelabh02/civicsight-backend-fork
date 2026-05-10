"use client";
import { useEffect, useState } from "react";
import { CivicAPI } from "@/lib/api";

// Matching the Python backend Pydantic models
interface Ticket {
  id: string;
  image_url: string;
  citizen_description: string | null;
  lat: number;
  lng: number;
  status: string;
  ai_category?: string;
  ai_priority?: string;
}

const COLUMNS = [
  { id: "submitted", title: "New AI Reports" },
  { id: "assigned", title: "Dispatched" },
  { id: "resolved", title: "Resolved" }
];

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch the live data from the lobotomized GET /reports/ route
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await CivicAPI.getTickets();
        setTickets(data);
      } catch (error) {
        console.error("Failed to load tickets", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    
    // Optimistically update the UI instantly
    setTickets((prev) => 
      prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
    );

    // Fire the PATCH request to the backend in the background
    try {
      await CivicAPI.updateTicketStatus(ticketId, newStatus);
      console.log(`Ticket ${ticketId} officially moved to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update status in DB", error);
      // If it fails, you would ideally revert the UI here
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center text-2xl font-bold">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <h1 className="text-4xl font-bold mb-8 tracking-tight">CivicSight Command Center</h1>
      
      <div className="flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div 
            key={col.id}
            className="flex-1 min-w-[350px] bg-gray-900 rounded-2xl p-4 border border-gray-800 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-gray-200">{col.title}</h2>
              <span className="bg-gray-800 text-gray-400 text-sm px-3 py-1 rounded-full">
                {tickets.filter(t => t.status === col.id).length}
              </span>
            </div>

            <div className="flex flex-col gap-4 flex-grow">
              {tickets.filter(t => t.status === col.id).map(ticket => (
                <div 
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id)}
                  className="bg-black rounded-xl border border-gray-800 overflow-hidden cursor-grab active:cursor-grabbing hover:border-gray-600 transition-colors shadow-lg"
                >
                  {/* THE CRITICAL FIX: Standard HTML img tag using image_url */}
                  <img 
                    src={ticket.image_url} 
                    alt="Citizen Report" 
                    className="w-full h-48 object-cover bg-gray-900"
                  />
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-500 font-mono">{ticket.id.substring(0, 8)}</span>
                      {ticket.ai_priority && (
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider
                          ${ticket.ai_priority === 'high' ? 'bg-red-900/50 text-red-400' : 
                            ticket.ai_priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 
                            'bg-green-900/50 text-green-400'}`}
                        >
                          {ticket.ai_priority}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg text-gray-100 capitalize mb-1">
                      {ticket.ai_category || "Unclassified Issue"}
                    </h3>
                    
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {ticket.citizen_description || `Reported at coordinates: ${ticket.lat.toFixed(4)}, ${ticket.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              ))}
              
              {tickets.filter(t => t.status === col.id).length === 0 && (
                <div className="flex-grow flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl m-2">
                  Drop tickets here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}