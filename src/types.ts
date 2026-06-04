export interface RecordRow {
  id: string;
  // New standardized fields
  vuller: string;              // "vuller" (inputterName)
  Date: string;                // "Date" (DD-MM-YYYY)
  Year: number;                // "Year"
  Month: number;               // "Month"
  Week: number;                // "Week"
  Hour: string;                // "Hour" (HH:mm)
  Producttype: string;         // "Producttype" (e.g. "aardbeien groot (bakjes)")
  Product: string;             // "Product" (Aardbei, Tomaat, Confituur)
  Eenheden: number;            // "Eenheden"
  "Gewicht(kg)": number;       // "Gewicht(kg)"
  "Prijs (/kg)": number;       // "Prijs (/kg)"
  Omzet: number;               // "Omzet"
  Aardbeiras: string;          // "Aardbeiras"
  temperature: number | null;  // "temperature" (Max Temp)
  comment?: string;            // Comment text
  Opmerking?: string;          // Standardized Comment for CSV/reports

  // Legacy fields for backward compatibility/UI support
  inputterName: string;
  inputDate: string;
  inputTime: string;
  productType: string;
  productQuantity: number;
  timestamp: number;
  userEmail: string;
  unitPrice?: number;
  totalPrice?: number;
  predictedTemperature?: number | null;
}

export interface ProductInput {
  id: string;
  dbName: string;
  displayName: string;
  quantityBakjes: number;
  quantityKisten: number;
  option1Label?: string;
  option2Label: string;
  icon: string; // Emoji or Lucide name
  color: string; // Tailwind bg color class
  textColor: string; // Tailwind text class
  accentColor: string; // hex or Tailwind color
  step: number;
  max: number;
  comment?: string; // Added comment field
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  provider: "google" | "email";
  passwordHash?: string;
}
