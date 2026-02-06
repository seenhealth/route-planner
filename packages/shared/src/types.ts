export interface Passenger {
  name: string;
  address: string;
  destAddress: string;
  time: string;
  purpose: string;
  phone: string;
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
