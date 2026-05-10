// src/lib/api.ts

const API_URL = "https://civicsight-backend-sozy.onrender.com"; 

export const CivicAPI = {
  // 1. Hit the POST /reports/ endpoint
  reportIssue: async (imageBase64: string, lat: number, lng: number) => {
    try {
      // Changed from /triage to /reports/
      const response = await fetch(`${API_URL}/reports/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageBase64, lat, lng }),
      });
      
      if (!response.ok) {
        const errorDetails = await response.text();
        console.error(`BACKEND REJECTED (Status ${response.status}):`, errorDetails);
        throw new Error("Failed to submit report");
      }
      
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // 2. Hit the GET /reports/ endpoint for the Admin Dashboard
  getTickets: async () => {
    try {
      // Changed from /tickets to /reports/
      const response = await fetch(`${API_URL}/reports/`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return [];
    }
  },

  // 3. Hit the PATCH /reports/{report_id}/status endpoint for drag-and-drop
  updateTicketStatus: async (ticketId: string, newStatus: string) => {
    try {
      // Changed from /tickets/${ticketId} to /reports/${ticketId}/status
      const response = await fetch(`${API_URL}/reports/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
};