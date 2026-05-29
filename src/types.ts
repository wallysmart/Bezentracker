export interface RecordRow {
  id: string;
  inputterName: string;
  inputDate: string; // DD-MM-YYYY
  inputTime: string; // HH:mm
  productType: string; // aardbeien groot, aardbeien klein, kerstomaten
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
  icon: string; // Emoji or Lucide name
  color: string; // Tailwind bg color class
  textColor: string; // Tailwind text class
  accentColor: string; // hex or Tailwind color
  step: number;
  max: number;
}
