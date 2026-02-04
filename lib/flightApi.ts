
export const flightApi = {
    // Get list of airlines
    getAirlines: async (limit: number = 50) => {
      try {
        const response = await fetch(
          `https://ebony-bruce-production.up.railway.app/api/v1/bookings/flights/airlines?limit=${limit}`
        );
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching airlines:', error);
        return { success: false, data: [] };
      }
    },
  
    // Get airport/city suggestions
    getPlaceSuggestions: async (query: string) => {
      try {
        const response = await fetch(
          `https://ebony-bruce-production.up.railway.app/api/v1/bookings/flights/places/suggestions?query=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching place suggestions:', error);
        return { success: false, data: [] };
      }
    },
  
    // Search flights (two-step process)
    searchFlights: async (searchRequest: any) => {
      try {
        // Step 1: Create offer request
        const offerRequestResponse = await fetch(
          'https://ebony-bruce-production.up.railway.app/api/v1/bookings/search/flights',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchRequest)
          }
        );
  
        if (!offerRequestResponse.ok) {
          throw new Error(`Offer request failed: ${offerRequestResponse.status}`);
        }
  
        const offerRequestResult = await offerRequestResponse.json();
        
        if (!offerRequestResult.success || !offerRequestResult.data?.offer_request_id) {
          throw new Error('Failed to create offer request');
        }
  
        const offerRequestId = offerRequestResult.data.offer_request_id;
  
        // Step 2: Fetch offers
        const offersResponse = await fetch(
          `https://ebony-bruce-production.up.railway.app/api/v1/bookings/offers?offer_request_id=${offerRequestId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );
  
        if (!offersResponse.ok) {
          throw new Error(`Fetch offers failed: ${offersResponse.status}`);
        }
  
        const offersResult = await offersResponse.json();
        
        return {
          success: offersResult.success,
          data: offersResult.data,
          offerRequestId,
          message: offersResult.message
        };
      } catch (error) {
        console.error('Flight search error:', error);
        throw error;
      }
    }
  };