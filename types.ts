export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TripBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface Activity {
  name: string;
  description: string;
  location: Coordinates;
  time: string; // e.g., "10:00 AM"
  type: 'food' | 'landmark' | 'activity' | 'relax' | 'stay';
  price?: string;
  items?: string[];
  groundingLinks?: GroundingLink[];
  travelDistance?: string; // Road distance estimate from AI
  travelTime?: string;     // Travel duration estimate from AI
}

export interface DayPlan {
  dayNumber: number;
  theme: string;
  activities: Activity[];
}

export interface TripPlan {
  id: string;
  destination: string;
  summary: string;
  itinerary: DayPlan[];
  centerCoordinates: Coordinates; 
  currency: 'USD' | 'INR';
  totalEstimatedCost: number;
  weatherAdvisory: string;
  createdAt?: number;
  stayLocation?: Activity; // Optional Base Camp
  postcardUrl?: string;    // New: Generated AI Postcard
}

export interface TripRequest {
  destination: string;
  days: number;
  interests: string;
  selectedAreas?: TripBounds[] | null;
  currency: 'USD' | 'INR';
  startTime?: string;
  endTime?: string;
  customInstructions?: string;
  budgetCap?: number;
  travelMonth?: string;
  includeStay?: boolean;
  preSelectedStay?: Activity | null; // New: Hotel selected in the form
}