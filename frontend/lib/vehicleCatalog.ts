/**
 * Curated lists for booking — common makes/models in India (expand as needed).
 * "Other" allows completion when a vehicle is not listed; staff can confirm at intake.
 */

export type VehicleCatalogEntry = { make: string; models: string[] };

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  {
    make: "Maruti Suzuki",
    models: [
      "Alto",
      "Alto K10",
      "Wagon R",
      "Swift",
      "Dzire",
      "Baleno",
      "Celerio",
      "Ignis",
      "S-Presso",
      "Brezza",
      "Ertiga",
      "XL6",
      "Fronx",
      "Jimny",
      "Grand Vitara",
      "Ciaz",
      "Invicto",
      "Eeco",
      "Super Carry",
    ],
  },
  {
    make: "Hyundai",
    models: [
      "Santro",
      "Grand i10 Nios",
      "i20",
      "i20 N Line",
      "Aura",
      "Verna",
      "Exter",
      "Venue",
      "Venue N Line",
      "Creta",
      "Alcazar",
      "Tucson",
      "Ioniq 5",
      "Ioniq 6",
    ],
  },
  {
    make: "Tata",
    models: [
      "Tiago",
      "Tigor",
      "Altroz",
      "Punch",
      "Nexon",
      "Harrier",
      "Safari",
      "Curvv",
      "Curvv EV",
      "Punch EV",
      "Nexon EV",
      "Tiago EV",
    ],
  },
  {
    make: "Mahindra",
    models: [
      "Bolero",
      "Bolero Neo",
      "XUV300",
      "Thar",
      "Scorpio",
      "Scorpio N",
      "XUV700",
      "Marazzo",
      "Bolero Pik-Up",
      "XUV400 EV",
      "BE 6e",
      "XEV 9e",
    ],
  },
  {
    make: "Toyota",
    models: [
      "Glanza",
      "Urban Cruiser Taisor",
      "Innova Crysta",
      "Innova Hycross",
      "Fortuner",
      "Camry",
      "Vellfire",
      "Hilux",
      "Rumion",
      "Hyryder",
    ],
  },
  {
    make: "Honda",
    models: ["Amaze", "City", "Elevate", "Civic"],
  },
  {
    make: "Kia",
    models: ["Sonet", "Seltos", "Carens", "EV6", "EV9"],
  },
  {
    make: "MG",
    models: ["Comet EV", "Astor", "Hector", "Hector Plus", "ZS EV", "Gloster", "Whale"],
  },
  {
    make: "Volkswagen",
    models: ["Polo", "Virtus", "Taigun", "Tiguan"],
  },
  {
    make: "Skoda",
    models: ["Slavia", "Kushaq", "Kodiaq", "Superb", "Octavia"],
  },
  {
    make: "Nissan",
    models: ["Magnite", "Kicks", "X-Trail"],
  },
  {
    make: "Renault",
    models: ["Kwid", "Triber", "Kiger", "Duster"],
  },
  {
    make: "Citroën",
    models: ["C3", "C3 Aircross", "C5 Aircross"],
  },
  {
    make: "Jeep",
    models: ["Compass", "Meridian", "Wrangler"],
  },
  {
    make: "BMW",
    models: ["2 Series", "3 Series", "5 Series", "X1", "X3", "X5", "X7", "iX", "i4", "i7"],
  },
  {
    make: "Mercedes-Benz",
    models: ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "EQB", "EQS SUV"],
  },
  {
    make: "Audi",
    models: ["A3", "A4", "A6", "Q2", "Q3", "Q5", "Q7", "e-tron", "e-tron GT"],
  },
  {
    make: "Volvo",
    models: ["XC40", "XC60", "XC90", "C40 Recharge", "S90"],
  },
  {
    make: "Lexus",
    models: ["NX", "RX", "ES", "LS"],
  },
  {
    make: "Force",
    models: ["Gurkha", "Traveller", "Citiline"],
  },
  {
    make: "Isuzu",
    models: ["D-Max", "MU-X"],
  },
  {
    make: "BYD",
    models: ["Atto 3", "Seal", "e6"],
  },
  {
    make: "Other",
    models: ["Other — confirm at workshop"],
  },
];

/** Descending model years (newest first). */
export const VEHICLE_YEARS: number[] = (() => {
  const end = new Date().getFullYear() + 1;
  const start = 1990;
  const out: number[] = [];
  for (let y = end; y >= start; y--) out.push(y);
  return out;
})();

/** Makes in catalog order; "Other" remains last for quick access to common brands first. */
export const VEHICLE_MAKE_OPTIONS: string[] = VEHICLE_CATALOG.map((e) => e.make);

export function modelsForMake(make: string): string[] {
  const entry = VEHICLE_CATALOG.find((e) => e.make === make);
  if (!entry) return [];
  return [...entry.models].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}
