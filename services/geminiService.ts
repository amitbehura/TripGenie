import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TripRequest, TripPlan, Activity, GroundingLink } from "../types";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API Key not found in environment variables");
  }
  return key;
};

const coordinatesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lat: { type: Type.NUMBER, description: "Latitude of the location" },
    lng: { type: Type.NUMBER, description: "Longitude of the location" },
  },
  required: ["lat", "lng"],
};

const activitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    location: coordinatesSchema,
    time: { type: Type.STRING, description: "Scheduled time, e.g. '10:30 AM'" },
    type: { type: Type.STRING, enum: ["food", "landmark", "activity", "relax", "stay"] },
    price: { type: Type.STRING },
    items: { type: Type.ARRAY, items: { type: Type.STRING } },
    travelDistance: { type: Type.STRING, description: "Estimated ROAD distance from previous stop." },
    travelTime: { type: Type.STRING, description: "Estimated travel duration from previous stop." },
  },
  required: ["name", "description", "location", "time", "type", "price", "items"],
};

const dayPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    dayNumber: { type: Type.INTEGER },
    theme: { type: Type.STRING },
    activities: { type: Type.ARRAY, items: activitySchema },
  },
  required: ["dayNumber", "theme", "activities"],
};

const tripPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    destination: { type: Type.STRING },
    summary: { type: Type.STRING },
    weatherAdvisory: { type: Type.STRING },
    totalEstimatedCost: { type: Type.NUMBER },
    itinerary: { type: Type.ARRAY, items: dayPlanSchema },
    centerCoordinates: coordinatesSchema,
    stayLocation: { ...activitySchema, nullable: true },
  },
  required: ["destination", "summary", "itinerary", "centerCoordinates", "weatherAdvisory", "totalEstimatedCost"],
};

export const generateTripPlan = async (request: TripRequest): Promise<TripPlan> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  let locationPrompt = request.destination;
  if (request.selectedAreas && request.selectedAreas.length > 0) {
    const areasDescription = request.selectedAreas.map((area, index) => 
      `Region ${index + 1}: [N:${area.north.toFixed(4)}, S:${area.south.toFixed(4)}, E:${area.east.toFixed(4)}, W:${area.west.toFixed(4)}]`
    ).join(', ');
    locationPrompt = `these specific map coordinates: ${areasDescription}`;
  }

  const stayContext = request.preSelectedStay 
    ? `The user is staying at "${request.preSelectedStay.name}" at coordinates [${request.preSelectedStay.location.lat}, ${request.preSelectedStay.location.lng}]. Start and end every day there.` 
    : request.includeStay 
      ? "Pick a central HOTEL/STAY location. Every day MUST start and end there." 
      : "";

  const prompt = `
    Task: Detailed road-aware Trip Plan for ${locationPrompt}.
    Duration: ${request.days} days. Interests: ${request.interests || "Sightseeing"}.
    Month: ${request.travelMonth || "Now"}. Currency: ${request.currency}.
    Budget: ${request.budgetCap ? request.budgetCap : "No limit"}.
    ${stayContext}

    Constraints:
    1. For each activity, estimate ACTUAL ROAD DISTANCE and TRAVEL TIME from the previous stop. 
    2. Do NOT use straight-line aerial distance.
    3. Ensure logical sequencing to minimize travel time.
    4. Search for "${request.destination} top spots".
    5. CRITICAL: The "totalEstimatedCost" must EXCLUDE any accommodation/hotel prices. Assume the user has already paid for the stay. Only include food, entry fees, and activities.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tripPlanSchema,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }, 
        temperature: 0.7,
      },
    });

    const data = JSON.parse(response.text!) as TripPlan;
    data.id = crypto.randomUUID();
    data.currency = request.currency;
    
    // Override if user pre-selected stay
    if (request.preSelectedStay) {
      data.stayLocation = request.preSelectedStay;
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const globalLinks: GroundingLink[] = chunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

    data.itinerary.forEach(day => {
      day.activities.forEach(act => {
        act.groundingLinks = globalLinks.slice(0, 2);
      });
    });

    return data;
  } catch (error) {
    console.error("Trip planning failed", error);
    throw error;
  }
};

export const generateTripPoster = async (plan: TripPlan): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const landmarks = plan.itinerary.flatMap(d => d.activities.filter(a => a.type === 'landmark').map(a => a.name)).slice(0, 4).join(', ');
  const prompt = `A cinematic, high-quality travel postcard for ${plan.destination}. Featuring landmarks like ${landmarks}. Style: artistic vintage travel poster with vibrant colors, elegant typography showing "${plan.destination.toUpperCase()}", and a sunset atmosphere. Highly detailed digital art.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data received from model");
  } catch (error) {
    console.error("Postcard generation failed", error);
    throw error;
  }
};

export const recalculateLogistics = async (activities: Activity[], destination: string, stayLocation?: Activity, startTime: string = "09:00 AM"): Promise<Activity[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const simplifiedActivities = activities.map(a => ({ name: a.name, location: a.location }));
  const simplifiedStay = stayLocation ? { name: stayLocation.name, location: stayLocation.location } : null;
  
  const prompt = `
    Update logistics for these activities in ${destination}:
    ${JSON.stringify(simplifiedActivities)}
    
    The day starts at ${startTime}.
    ${simplifiedStay ? `IMPORTANT: The day starts and ends at this HOTEL: ${JSON.stringify(simplifiedStay)}. Calculate the first travel leg from the hotel and the last travel leg back to the hotel.` : ""}
    
    Return the full Activity objects in order with updated 'time', 'travelDistance', and 'travelTime'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: activitySchema
      }
    },
  });

  const updatedLogistics = JSON.parse(response.text!) as Activity[];
  
  return activities.map((original, i) => ({
    ...original,
    time: updatedLogistics[i]?.time || original.time,
    travelDistance: updatedLogistics[i]?.travelDistance || "",
    travelTime: updatedLogistics[i]?.travelTime || ""
  }));
};

export const generateReplacementActivity = async (
  currentActivity: Activity, 
  destination: string, 
  theme: string,
  currency: 'USD' | 'INR',
  excludedPlaces: string[] = []
): Promise<Activity> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Alternative to "${currentActivity.name}" in ${destination}. Exclude: ${excludedPlaces.join(',')}.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: activitySchema,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return JSON.parse(response.text!) as Activity;
};