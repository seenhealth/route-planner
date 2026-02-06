export interface Passenger {
  name: string;
  address: string;
  destAddress: string;
  time: string;
  purpose: string;
  phone: string;
  notes: string;
  assistiveDevice: string;
  lat: number;
  lng: number;
  destLat: number;
  destLng: number;
}

export interface TripDirections {
  overviewPolyline: string;
  waypointOrder: number[];
  legs: {
    distance: string;
    duration: string;
    startAddress: string;
    endAddress: string;
  }[];
}

export interface Trip {
  id: string;
  type: "pickup" | "dropoff";
  area: string;
  color: string;
  passengerCount: number;
  passengers: Passenger[];
  directions: TripDirections | null;
}

export interface RouteData {
  generated: string;
  totalPassengers: number;
  hub: { name: string; address: string; lat: number; lng: number };
  pickupTrips: Trip[];
  dropoffTrips: Trip[];
}

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
}

export interface VehicleConfig {
  vehicles: Vehicle[];
}

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: "van-1", name: "Van 1", capacity: 6 },
  { id: "van-2", name: "Van 2", capacity: 6 },
  { id: "van-3", name: "Van 3", capacity: 6 },
  { id: "van-4", name: "Van 4", capacity: 6 },
  { id: "sedan-1", name: "Sedan 1", capacity: 3 },
  { id: "sedan-2", name: "Sedan 2", capacity: 3 },
  { id: "sedan-3", name: "Sedan 3", capacity: 3 },
  { id: "sedan-4", name: "Sedan 4", capacity: 3 },
  { id: "minivan-1", name: "Minivan 1", capacity: 5 },
];

export interface ManifestRow {
  jobDate: string;
  idNumber: string;
  custName: string;
  phone: string;
  bookingPurpose: string;
  puAddr: string;
  puUnit: string;
  pickupCity: string;
  puState: string;
  pickZip: string;
  doAddr: string;
  doUnit: string;
  dropCity: string;
  doState: string;
  dropZip: string;
  assistiveDevice: string;
  nTotalWheelChairs: number;
  nTotalPassengers: number;
  schPU: string;
  aptTime: string;
  notes: string;
  jobID: string;
}
