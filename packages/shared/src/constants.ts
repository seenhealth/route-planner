export const HUB = {
  name: "Seen Health PACE Center",
  address: "1839 W Valley Blvd, Alhambra, CA 91803",
  lat: 34.0823,
  lng: -118.1622,
} as const;

export const MAX_STOPS = 10;

export const TRIP_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
  '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#000000',
] as const;

export const CLUSTERS: Record<string, string[]> = {
  'Monterey Park': ['91754', '91755'],
  'San Gabriel': ['91775', '91776'],
  'Arcadia/San Marino': ['91006', '91007', '91108'],
  'Rosemead': ['91770'],
  'Alhambra': ['91801', '91803'],
  'Pasadena': ['91101', '91103', '91105'],
  'Temple City': ['91780'],
  'El Monte': ['91731', '91732', '91733'],
  'DTLA': ['90014', '90015', '90032', '90033'],
};

export const ADJACENCY: Record<string, string[]> = {
  'Alhambra': ['Monterey Park', 'San Gabriel', 'Pasadena'],
  'Monterey Park': ['Alhambra', 'Rosemead', 'El Monte'],
  'San Gabriel': ['Alhambra', 'Rosemead', 'Temple City', 'Arcadia/San Marino'],
  'Rosemead': ['Monterey Park', 'San Gabriel', 'Temple City', 'El Monte'],
  'Temple City': ['San Gabriel', 'Rosemead', 'Arcadia/San Marino'],
  'Arcadia/San Marino': ['San Gabriel', 'Temple City', 'Pasadena'],
  'Pasadena': ['Alhambra', 'Arcadia/San Marino'],
  'El Monte': ['Monterey Park', 'Rosemead'],
  'DTLA': ['Alhambra'],
};

export const TIME_WINDOWS = {
  morning: { label: "Morning", start: "06:00", end: "10:00" },
  midday: { label: "Midday", start: "10:00", end: "14:00" },
  afternoon: { label: "Afternoon", start: "14:00", end: "18:00" },
} as const;
