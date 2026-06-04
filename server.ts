import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Firestore } from "@google-cloud/firestore";

// Read Firebase configuration from root
const APPLET_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(APPLET_CONFIG_PATH, "utf-8"));

// Initialize Firestore with Admin/GCP privileges via Application Default Credentials
let db = new Firestore({
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId
});

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const PRICES_FILE = path.join(DATA_DIR, "prices.json");
const CORRESPONDENCES_FILE = path.join(DATA_DIR, "correspondences.json");

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
}

class MockFirestoreCollection {
  private file: string;
  private isSettings: boolean;
  private filterFn: ((item: any) => boolean) | null = null;
  private sortField: string | null = null;
  private sortDirection: "asc" | "desc" = "asc";

  constructor(name: string) {
    this.isSettings = name === "settings";
    this.file = path.join(process.cwd(), "data", `local_${name}.json`);
    
    let needsSeeding = false;
    if (!fs.existsSync(this.file)) {
      needsSeeding = true;
    } else {
      try {
        const stats = fs.statSync(this.file);
        if (stats.size <= 5) {
          needsSeeding = true;
        }
      } catch {
        needsSeeding = true;
      }
    }

    if (needsSeeding) {
      if (name === "admins") {
        let localAdminsList = ["wouter.torfss@gmail.com"];
        try {
          const ADMINS_FILE = path.join(process.cwd(), "data", "admins.json");
          if (fs.existsSync(ADMINS_FILE)) {
            localAdminsList = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
          }
        } catch {}
        const adminObjects = localAdminsList.map(email => ({ email: email.toLowerCase().trim() }));
        fs.writeFileSync(this.file, JSON.stringify(adminObjects, null, 2), "utf-8");
      } else if (name === "records") {
        let localRecordsList = [];
        try {
          const DB_FILE = path.join(process.cwd(), "data", "database.json");
          if (fs.existsSync(DB_FILE)) {
            localRecordsList = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
          }
        } catch {}
        fs.writeFileSync(this.file, JSON.stringify(localRecordsList, null, 2), "utf-8");
      } else if (name === "users") {
        let localUsersList = [];
        try {
          const USERS_FILE = path.join(process.cwd(), "data", "users.json");
          if (fs.existsSync(USERS_FILE)) {
            localUsersList = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
          }
        } catch {}
        fs.writeFileSync(this.file, JSON.stringify(localUsersList, null, 2), "utf-8");
      } else if (name === "settings") {
        const localSettings: any = {};
        try {
          const PRICES_DATA_FILE = path.join(process.cwd(), "data", "prices.json");
          if (fs.existsSync(PRICES_DATA_FILE)) {
            localSettings.prices = JSON.parse(fs.readFileSync(PRICES_DATA_FILE, "utf-8"));
          } else {
            localSettings.prices = { "aardbeien groot": 5.0, "aardbeien klein": 3.5, "kerstomaten": 2.5 };
          }
          const CORRESPONDENCES_DATA_FILE = path.join(process.cwd(), "data", "correspondences.json");
          if (fs.existsSync(CORRESPONDENCES_DATA_FILE)) {
            localSettings.correspondences = JSON.parse(fs.readFileSync(CORRESPONDENCES_DATA_FILE, "utf-8"));
          } else {
            localSettings.correspondences = {
              "kist_aardbeien_to_bakjes": 10.0,
              "doos_kerstomaten_to_bakjes": 8.0,
              "bakje_aardbeien_to_kg": 0.5,
              "bakje_kerstomaten_to_kg": 0.25
            };
          }
        } catch {}
        fs.writeFileSync(this.file, JSON.stringify(localSettings, null, 2), "utf-8");
      } else {
        fs.writeFileSync(this.file, this.isSettings ? "{}" : "[]", "utf-8");
      }
    }
  }

  private read(): any {
    try {
      if (fs.existsSync(this.file)) {
        return JSON.parse(fs.readFileSync(this.file, "utf-8"));
      }
    } catch {}
    return this.isSettings ? {} : [];
  }

  private write(data: any) {
    try {
      fs.writeFileSync(this.file, JSON.stringify(data, null, 2), "utf-8");
    } catch {}
  }

  doc(id: string) {
    const idStr = String(id).trim();
    return {
      ref: this,
      delete: async () => {
        if (this.isSettings) {
          const dict = this.read();
          delete dict[idStr];
          this.write(dict);
        } else {
          const arr = this.read();
          const filtered = arr.filter((x: any) => String(x.id || x.uid || x.email || "").toLowerCase().trim() !== idStr.toLowerCase());
          this.write(filtered);
        }
        return { success: true };
      },
      update: async (fields: any) => {
        if (this.isSettings) {
          const dict = this.read();
          dict[idStr] = { ...(dict[idStr] || {}), ...fields };
          this.write(dict);
        } else {
          const arr = this.read();
          let found = false;
          const updated = arr.map((item: any) => {
            const key = String(item.id || item.uid || item.email || "").toLowerCase().trim();
            if (key === idStr.toLowerCase()) {
              found = true;
              return { ...item, ...fields };
            }
            return item;
          });
          if (!found) {
            updated.push({ id: idStr, ...fields });
          }
          this.write(updated);
        }
        return { success: true };
      },
      set: async (docData: any) => {
        if (this.isSettings) {
          const dict = this.read();
          dict[idStr] = docData;
          this.write(dict);
        } else {
          const arr = this.read();
          const filtered = arr.filter((x: any) => String(x.id || x.uid || x.email || "").toLowerCase().trim() !== idStr.toLowerCase());
          filtered.push(docData);
          this.write(filtered);
        }
        return { success: true };
      },
      get: async () => {
        if (this.isSettings) {
          const dict = this.read();
          const data = dict[idStr] || null;
          return {
            exists: !!data,
            id: idStr,
            data: () => data,
            ref: { update: async (f: any) => this.doc(idStr).update(f), delete: async () => this.doc(idStr).delete() }
          };
        } else {
          const arr = this.read();
          const data = arr.find((x: any) => String(x.id || x.uid || x.email || "").toLowerCase().trim() === idStr.toLowerCase()) || null;
          return {
            exists: !!data,
            id: idStr,
            data: () => data,
            ref: { update: async (f: any) => this.doc(idStr).update(f), delete: async () => this.doc(idStr).delete() }
          };
        }
      }
    };
  }

  where(field: string, op: string, val: any) {
    const valStr = String(val).toLowerCase().trim();
    this.filterFn = (item: any) => {
      const itemVal = item[field];
      if (itemVal === undefined) return false;
      const itemValStr = String(itemVal).toLowerCase().trim();
      if (op === "==") return itemValStr === valStr;
      return false;
    };
    return this;
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    this.sortField = field;
    this.sortDirection = direction;
    return this;
  }

  async get() {
    let arr = this.isSettings ? Object.values(this.read()) : this.read();
    if (this.filterFn) {
      arr = arr.filter(this.filterFn);
    }
    if (this.sortField) {
      const field = this.sortField;
      const dir = this.sortDirection === "asc" ? 1 : -1;
      arr.sort((a: any, b: any) => {
        if (a[field] < b[field]) return -1 * dir;
        if (a[field] > b[field]) return 1 * dir;
        return 0;
      });
    }

    const docs = arr.map((item: any) => {
      const itemKey = String(item.id || item.uid || item.email || "");
      return {
        id: itemKey,
        ref: this.doc(itemKey),
        data: () => item
      };
    });

    return {
      empty: docs.length === 0,
      docs,
      forEach: (cb: (item: any) => void) => docs.forEach(cb)
    };
  }
}

class MockFirestore {
  collection(name: string) {
    return new MockFirestoreCollection(name);
  }
}

// Test connection
async function testConnection() {
  const logPath = path.join(process.cwd(), "data", "firestore_connection.log");
  try {
    const envKeys = Object.keys(process.env).filter(k => k.includes("GOOGLE") || k.includes("FIREBASE") || k.includes("CREDENTIALS") || k.includes("SA") || k.includes("KEY"));
    fs.writeFileSync(path.join(process.cwd(), "data", "env_keys.log"), `Env keys of interest: ${JSON.stringify(envKeys)}`, "utf-8");
    
    // Fetch Service Account email from metadata server
    let saEmail = "unknown";
    try {
      const saRes = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email", {
        headers: { "Metadata-Flavor": "Google" },
        signal: AbortSignal.timeout(2000)
      });
      if (saRes.ok) {
        saEmail = await saRes.text();
      }
    } catch (saErr: any) {
      saEmail = "error: " + (saErr?.message || saErr);
    }
    fs.writeFileSync(path.join(process.cwd(), "data", "service_account.log"), `SA Email: ${saEmail}`, "utf-8");

    fs.writeFileSync(logPath, `STARTING test at ${new Date().toISOString()}`, "utf-8");
    console.log(`Connecting to Firestore with databaseId: ${firebaseConfig.firestoreDatabaseId}...`);
    await db.collection("test").doc("connection").get();
    console.log("Firestore-verbinding succesvol getest op geconfigureerde database.");
    fs.writeFileSync(logPath, `SUCCESS at ${new Date().toISOString()} on geconfigureerde database`, "utf-8");
  } catch (error: any) {
    console.warn(`Firestore geconfigureerde database (${firebaseConfig.firestoreDatabaseId}) mislukt met error:`, error?.message || error);
    
    // Auto fallback to (default) on permissions issue
    if (error?.message?.includes("PERMISSION_DENIED") || error?.message?.includes("insufficient permissions")) {
      console.log("Proberen verbinding te maken met '(default)' database...");
      try {
        const defaultDb = new Firestore({
          projectId: firebaseConfig.projectId,
          databaseId: "(default)"
        });
        await defaultDb.collection("test").doc("connection").get();
        console.log("Firestore-verbinding succesvol getest op '(default)' database! Schakelen naar '(default)'.");
        db = defaultDb;
        fs.writeFileSync(logPath, `SUCCESS at ${new Date().toISOString()} fallback to (default) database`, "utf-8");
        return;
      } catch (err2: any) {
        console.error("Firestore '(default)' database verbinding ook mislukt:", err2?.message || err2);
      }
    }
    
    console.warn("Zowel geconfigureerde als '(default)' Firestore-databases zijn niet toegankelijk of toegestaan. Overschakelen naar lokale JSON-database in stand-alone modus.");
    db = new MockFirestore() as any;
    const errorMsg = `SUCCESS (LOCAL FALLBACK) at ${new Date().toISOString()}: ${error?.message || error}\nStack: ${error?.stack}`;
    fs.writeFileSync(logPath, errorMsg, "utf-8");
  }
}
testConnection();
if (!fs.existsSync(ADMINS_FILE)) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(["wouter.torfss@gmail.com"], null, 2), "utf-8");
}
if (!fs.existsSync(PRICES_FILE)) {
  fs.writeFileSync(PRICES_FILE, JSON.stringify({
    "aardbeien groot": 4.5,
    "aardbeien klein": 3.0,
    "kerstomaten": 2.5
  }, null, 2), "utf-8");
}
if (!fs.existsSync(CORRESPONDENCES_FILE)) {
  fs.writeFileSync(CORRESPONDENCES_FILE, JSON.stringify({
    "kist_aardbeien_to_bakjes": 10.0,
    "doos_kerstomaten_to_bakjes": 10.0,
    "bakje_aardbeien_to_kg": 0.5,
    "bakje_kerstomaten_to_kg": 0.5
  }, null, 2), "utf-8");
}

function getLocalAdmins(): string[] {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      return JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Fout bij lezen admins bestand:", err);
  }
  return ["wouter.torfss@gmail.com"];
}

// Weather Forecast helper using free Open-Meteo API
async function fetchPredictedTemperature(dutchDate: string): Promise<number | null> {
  try {
    const parts = dutchDate.split("-");
    if (parts.length !== 3) return null;
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    const targetDateStr = `${year}-${month}-${day}`;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=51.0&longitude=4.5&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Brussels`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data && data.daily && data.daily.time) {
      const idx = data.daily.time.indexOf(targetDateStr);
      if (idx !== -1) {
        const tMax = data.daily.temperature_2m_max[idx];
        if (tMax !== undefined) {
          return tMax; // Expected maximum daily temperature
        }
      }
    }
  } catch (err) {
    console.warn("Fout ophalen temperatuur van Open-Meteo:", err);
  }
  return null;
}

// Automatic database seeding for 3-month demo data
try {
  const fileContent = fs.readFileSync(DB_FILE, "utf-8");
  const existingRecords = JSON.parse(fileContent);
  if (existingRecords.length <= 3) {
    console.log("Empty or small database detected. Populating 3 months of randomized demo data...");
    
    const AUTHORS = [
      { name: "Wouter Torfs", email: "wouter.torfss@gmail.com" },
      { name: "Annelies V.", email: "annelies.v@bezentracker.be" },
      { name: "Jan de Backer", email: "jan.debacker@gmail.com" },
      { name: "Sofie Maes", email: "sofie.maes@bezentracker.be" },
      { name: "Bart Peeters", email: "bart@bezentracker.be" }
    ];

    const PRODUCTS = [
      { name: "aardbeien groot", unit: "bakjes", prob: 0.45 },
      { name: "aardbeien klein", unit: "bakjes", prob: 0.35 },
      { name: "kerstomaten", unit: "bekers", prob: 0.20 }
    ];

    const seededRecords: any[] = [];

    // Range: March 1, 2026 to May 28, 2026 (~90 days to May 29, 2026)
    const startDate = new Date(2026, 2, 1); // index 2 is March
    const endDate = new Date(2026, 4, 28); // index 4 is May
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // Time-based seasonal multiplier for spring weather warming trend
      const month = currentDate.getMonth();
      let seasonalMult = 1.0;
      if (month === 2) seasonalMult = 0.75; // Colder March
      else if (month === 3) seasonalMult = 1.00; // Mild April
      else if (month === 4) seasonalMult = 1.35; // Warmer May

      // 1. Determine number of submissions (invoerbeurten)
      // Weekday average: 2, Weekend average: 4
      let numSubmissions = 2;
      if (isWeekend) {
        numSubmissions = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
      } else {
        numSubmissions = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      }

      // 2. Determine target daily product total sold (in equivalent kisten)
      // Weekdays: average 2 kisten
      // Weekends: average 5x as much = 10 kisten (with more sales in warmer weekends)
      let dailyTargetKisten = isWeekend ? 10 : 2;
      
      const drift = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
      dailyTargetKisten = dailyTargetKisten * drift * seasonalMult;

      const dailyTargetKg = dailyTargetKisten * 5.0;

      // Distribute Target Kg across products
      const dailyProductShares: Record<string, number> = {};
      PRODUCTS.forEach(p => {
        const shareMult = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        dailyProductShares[p.name] = p.prob * shareMult;
      });

      // Normalize shares
      const totalShares = Object.values(dailyProductShares).reduce((a, b) => a + b, 0);
      PRODUCTS.forEach(p => {
        dailyProductShares[p.name] = (dailyProductShares[p.name] / totalShares) * dailyTargetKg;
      });

      // Split into submissions shares
      const submissionShares = Array(numSubmissions).fill(0).map(() => 0.5 + Math.random() * 1.0);
      const totalSubShares = submissionShares.reduce((a, b) => a + b, 0);
      submissionShares.forEach((val, idx) => {
        submissionShares[idx] = val / totalSubShares;
      });

      // Construct submissions
      for (let sIdx = 0; sIdx < numSubmissions; sIdx++) {
        const shareOfToday = submissionShares[sIdx];
        const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
        
        const dateCopy = new Date(currentDate);
        let hour = 8;
        if (sIdx === 0) hour = 8 + Math.floor(Math.random() * 3);
        else if (sIdx === 1) hour = 12 + Math.floor(Math.random() * 3);
        else if (sIdx === 2) hour = 15 + Math.floor(Math.random() * 2);
        else hour = 17 + Math.floor(Math.random() * 3);

        const minute = Math.floor(Math.random() * 60);
        dateCopy.setHours(hour, minute, 0, 0);

        const checkTimestamp = dateCopy.getTime();
        const DutchDateStr = `${dateCopy.getDate()}-${dateCopy.getMonth() + 1}-${dateCopy.getFullYear()}`;
        const DutchTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        PRODUCTS.forEach(p => {
          const productKgForSub = dailyProductShares[p.name] * shareOfToday;
          let subKisten = 0;
          let subBakjes = 0;

          if (productKgForSub >= 5.0) {
            subKisten = Math.floor(productKgForSub / 5.0);
            const remainderKg = productKgForSub % 5.0;
            subBakjes = Math.round(remainderKg / 0.5);
          } else {
            subBakjes = Math.round(productKgForSub / 0.5);
          }

          if (subBakjes > 0) {
            seededRecords.push({
              id: `${checkTimestamp}-b-${Math.random().toString(36).substr(2, 6)}`,
              inputterName: author.name,
              inputDate: DutchDateStr,
              inputTime: DutchTimeStr,
              productType: `${p.name} (${p.unit})`,
              productQuantity: subBakjes,
              timestamp: checkTimestamp,
              userEmail: author.email
            });
          }

          if (subKisten > 0) {
            seededRecords.push({
              id: `${checkTimestamp}-k-${Math.random().toString(36).substr(2, 6)}`,
              inputterName: author.name,
              inputDate: DutchDateStr,
              inputTime: DutchTimeStr,
              productType: `${p.name} (kisten)`,
              productQuantity: subKisten,
              timestamp: checkTimestamp,
              userEmail: author.email
            });
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Combine and sort with original entries at the top
    const combined = [...existingRecords, ...seededRecords];
    combined.sort((a, b) => b.timestamp - a.timestamp);

    fs.writeFileSync(DB_FILE, JSON.stringify(combined, null, 2), "utf-8");
    console.log(`Successfully auto-seeded ${seededRecords.length} records!`);
  }
} catch (err) {
  console.error("Failed to seed database on boot:", err);
}

interface AppUser {
  uid: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  provider: "google" | "email";
  passwordHash?: string;
}

interface RecordRow {
  id: string;
  inputterName: string;
  inputDate: string; // DD-MM-YYYY
  inputTime: string; // HH:mm
  productType: string;
  productQuantity: number;
  timestamp: number;
  userEmail: string;
  unitPrice?: number;
  totalPrice?: number;
  predictedTemperature?: number | null;
  comment?: string;
  Opmerking?: string;
}

async function startServer() {
  // Perform Firestore migration/seed on boot if admins collection is empty
  try {
    const adminCheck = await db.collection("admins").get();
    if (adminCheck.empty) {
      console.log("Firestore-database is nog leeg. Migratie vanaf JSON bestanden starten...");

      // 1. Migrate admins
      let localAdmins: string[] = ["wouter.torfss@gmail.com"];
      if (fs.existsSync(ADMINS_FILE)) {
        try {
          localAdmins = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
        } catch (e) {
          console.error("Fout bij laden lokale admins:", e);
        }
      }
      for (const email of localAdmins) {
        const emailNorm = email.toLowerCase().trim();
        await db.collection("admins").doc(emailNorm).set({ email: emailNorm });
      }

      // 2. Migrate prices setting
      let localPrices = {
        "aardbeien groot": 4.5,
        "aardbeien klein": 3.0,
        "kerstomaten": 2.5
      };
      if (fs.existsSync(PRICES_FILE)) {
        try {
          localPrices = JSON.parse(fs.readFileSync(PRICES_FILE, "utf-8"));
        } catch (e) {
          console.error("Fout bij laden lokale prijzen:", e);
        }
      }
      await db.collection("settings").doc("prices").set(localPrices);

      // 3. Migrate correspondences setting
      let localCorrespondences = {
        "kist_aardbeien_to_bakjes": 10.0,
        "doos_kerstomaten_to_bakjes": 10.0,
        "bakje_aardbeien_to_kg": 0.5,
        "bakje_kerstomaten_to_kg": 0.5
      };
      if (fs.existsSync(CORRESPONDENCES_FILE)) {
        try {
          localCorrespondences = JSON.parse(fs.readFileSync(CORRESPONDENCES_FILE, "utf-8"));
        } catch (e) {
          console.error("Fout bij laden lokale correspondences:", e);
        }
      }
      await db.collection("settings").doc("correspondences").set(localCorrespondences);

      // 4. Migrate registered users
      let localUsers: AppUser[] = [];
      if (fs.existsSync(USERS_FILE)) {
        try {
          localUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        } catch (e) {
          console.error("Fout bij laden lokale gebruikers:", e);
        }
      }
      for (const u of localUsers) {
        const userUid = u.uid || `local_${Math.random().toString(36).substring(2, 12)}`;
        await db.collection("users").doc(userUid).set({
          ...u,
          uid: userUid
        });
      }

      // 5. Migrate inventory sales/refill logs (top 300 recent ones to avoid large cold startup cost)
      let localRecords: RecordRow[] = [];
      if (fs.existsSync(DB_FILE)) {
        try {
          localRecords = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        } catch (e) {
          console.error("Fout bij laden lokale overzichten:", e);
        }
      }

      // Sort newest first before taking slice
      localRecords.sort((a, b) => b.timestamp - a.timestamp);
      const migrateBatchSlice = localRecords.slice(0, 300);

      console.log(`Bezig met overzetten van ${migrateBatchSlice.length} historische records naar Firestore...`);
      for (const r of migrateBatchSlice) {
        await db.collection("records").doc(r.id).set(r);
      }

      console.log("Database migratie naar Firestore succesvol afgerond!");
    } else {
      console.log("Firestore database is reeds geïnitialiseerd. Overslaan migratie opstart.");
    }
  } catch (err) {
    console.error("Kritieke fout bij database synchronisatie opstart:", err);
  }

  const app = express();
  app.use(express.json());

  // Helper function to verify admin email
  const verifyIsAdmin = async (adminEmail: string | undefined): Promise<boolean> => {
    if (!adminEmail) return false;
    try {
      const norm = adminEmail.toLowerCase().trim();
      const docSnap = await db.collection("admins").doc(norm).get();
      return docSnap.exists;
    } catch (e) {
      console.error("Fout bij controleren admin_status:", e);
      return false;
    }
  };

  // Google Drive Service Account token retriever (from GCP instance metadata)
  const getServiceAccountToken = async (): Promise<string | null> => {
    try {
      const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/drive", {
        headers: { "Metadata-Flavor": "Google" }
      });
      if (res.ok) {
        const data: any = await res.json();
        return data.access_token || null;
      }
      console.error("Metadataserver gaf fout terug:", res.status, await res.text());
    } catch (error) {
      console.error("Fout bij ophalen serviceaccounttoken:", error);
    }
    return null;
  };

  // Combined function to format Dutch date strings
  const getDutchDateStr = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    return formatter.format(date).replace(/\//g, "-");
  };

  // Heavy duty Google Drive backup function (handles SA fallback seamlessly)
  const performDriveBackup = async (providedToken?: string): Promise<{ success: boolean; filename: string; fileId?: string; source: string; usedSA: boolean }> => {
    // 1. Fetch all records from Firestore ordered by timestamp
    const snapshot = await db.collection("records").orderBy("timestamp", "desc").get();
    const records: RecordRow[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as RecordRow);
    });

    if (records.length === 0) {
      throw new Error("Geen verkoopgegevens gevonden om te exporteren.");
    }

    // Generate CSV format (match the Excel semicolon separator with BOM)
    let csvContent = "sep=;\r\n";
    csvContent += "Invoerder;Datum;Tijd;Producttype;Aantal;Max Temp;Prijs per stuk;Totaalinvoer\r\n";

    records.forEach((r) => {
      const escapedName = `"${r.inputterName ? r.inputterName.replace(/"/g, '""') : ""}"`;
      const escapedProductType = `"${r.productType ? r.productType.replace(/"/g, '""') : ""}"`;
      const tempVal = r.predictedTemperature !== undefined && r.predictedTemperature !== null ? `${r.predictedTemperature}` : "";
      const uPrice = r.unitPrice !== undefined && r.unitPrice !== null ? `${Number(r.unitPrice).toFixed(2).replace(/\./g, ",")}` : "";
      const tPrice = r.totalPrice !== undefined && r.totalPrice !== null ? `${Number(r.totalPrice).toFixed(2).replace(/\./g, ",")}` : "";
      
      csvContent += `${escapedName};${r.inputDate};${r.inputTime};${escapedProductType};${r.productQuantity};${tempVal};${uPrice};${tPrice}\r\n`;
    });

    // Calculate current date in Europe/Amsterdam timezone
    const amsterdamTime = new Date();
    const amsterdamDateStr = amsterdamTime.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" });
    const amsterdamDate = new Date(amsterdamDateStr);
    const year = amsterdamDate.getFullYear();
    const month = String(amsterdamDate.getMonth() + 1).padStart(2, "0");
    const day = String(amsterdamDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}_${month}_${day}`; // YYYY_MM_DD
    const filename = `verkoopautomaat_geschiedenis_${formattedDate}.csv`;

    let token = providedToken || null;
    let usedSA = false;

    if (!token) {
      token = await getServiceAccountToken();
      if (!token) {
        throw new Error("Geen Google OAuth-token opgegeven en ophalen van serviceaccounttoken is mislukt.");
      }
      usedSA = true;
    }

    // Construct Google Drive upload multipart form
    const boundary = "314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let folderId = "1_TfhAFAu8zlM-pSocb9n2k0mHLuR52p0";
    try {
      const gsnap = await db.collection("settings").doc("gdrive").get();
      if (gsnap.exists) {
        const gdata = gsnap.data();
        if (gdata && gdata.folderId) {
          folderId = gdata.folderId.trim();
        }
      }
    } catch (e) {
      console.warn("Kon Google Drive configuratie niet ophalen, standaard ID wordt gebruikt:", e);
    }

    const metadata = {
      name: filename,
      mimeType: "text/csv",
      parents: [folderId]
    };

    // Convert CSV content to buffer to handle UTF-8 properly (including BOM)
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const csvBuffer = Buffer.concat([bom, Buffer.from(csvContent, "utf-8")]);

    // Construct binary multipart payload
    const part1 = Buffer.from(
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/csv; charset=UTF-8\r\n\r\n"
    );
    const part2 = Buffer.from(closeDelimiter);
    const multipartBuffer = Buffer.concat([part1, csvBuffer, part2]);

    const driveRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBuffer
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      throw new Error(`Google Drive API-fout: ${errorText} (HTTP status: ${driveRes.status})`);
    }

    const resJson: any = await driveRes.json();
    const fileId = resJson.id;

    return {
      success: true,
      filename,
      fileId,
      source: usedSA ? "service account" : "personal admin token",
      usedSA
    };
  };

  // Run automatically if there are new records added yesterday
  const runDailyBackupIfNewRecords = async () => {
    try {
      const amsterdamTimeStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" });
      const amsterdamDate = new Date(amsterdamTimeStr);
      
      const hour = amsterdamDate.getHours();
      if (hour !== 0) {
        return; // Only run during the midnight hour (00:00 - 00:59)
      }

      // Compute yesterday's date string
      amsterdamDate.setDate(amsterdamDate.getDate() - 1);
      const yesterdayDateStr = getDutchDateStr(amsterdamDate);

      // Check if we already backed up yesterday
      let alreadyBackedUp = false;
      try {
        const statusSnap = await db.collection("settings").doc("backup_status").get();
        if (statusSnap.exists) {
          const data = statusSnap.data();
          if (data && data.lastBackupYesterdayDate === yesterdayDateStr) {
            alreadyBackedUp = true;
          }
        }
      } catch (e) {
        console.warn("Could not read backup_status from Firestore, checking local file...", e);
      }

      const localLastBackupPath = path.join(process.cwd(), "data", "last_backup.json");
      if (fs.existsSync(localLastBackupPath)) {
        try {
          const localData = JSON.parse(fs.readFileSync(localLastBackupPath, "utf-8"));
          if (localData && localData.lastBackupYesterdayDate === yesterdayDateStr) {
            alreadyBackedUp = true;
          }
        } catch (e) {
          console.warn("Error reading local backup status:", e);
        }
      }

      if (alreadyBackedUp) {
        return; // Already backed up, ignore
      }

      // Check if there are records with inputDate === yesterdayDateStr
      const snapshot = await db.collection("records").where("inputDate", "==", yesterdayDateStr).get();
      const hasNewRecords = !snapshot.empty;

      if (!hasNewRecords) {
        console.log(`Geen nieuwe records gevonden voor ${yesterdayDateStr}, overslaan van dagelijkse Drive back-up.`);
        return;
      }

      console.log(`Nieuwe records gevonden voor ${yesterdayDateStr}! Uitvoeren van dagelijkse automatische Google Drive back-up...`);
      const result = await performDriveBackup();
      console.log(`Automatische Google Drive back-up voltooid: ${result.filename} (ID: ${result.fileId})`);

      const statusData = {
        lastBackupYesterdayDate: yesterdayDateStr,
        lastBackupTime: new Date().toISOString(),
        filename: result.filename,
        fileId: result.fileId,
        source: result.source
      };

      try {
        await db.collection("settings").doc("backup_status").set(statusData);
      } catch (e) {
        console.error("Fout bij opslaan backup_status in Firestore:", e);
      }
      
      fs.writeFileSync(localLastBackupPath, JSON.stringify(statusData, null, 2), "utf-8");

    } catch (error: any) {
      console.error("Fout in dagelijkse automatische back-up:", error?.message || error);
    }
  };

  const startDailyBackupSchedule = () => {
    console.log("Dagelijkse Google Drive back-up schedulering geactiveerd.");
    // Run initial check after 30 seconds
    setTimeout(() => {
      runDailyBackupIfNewRecords();
    }, 30000);

    // Check hourly or every 15 minutes. 15 minutes is highly precise.
    setInterval(() => {
      runDailyBackupIfNewRecords();
    }, 15 * 60 * 1000); 
  };

  // GET all records
  app.get("/api/records", async (req, res) => {
    try {
      const snapshot = await db.collection("records").orderBy("timestamp", "desc").get();
      const records: RecordRow[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as RecordRow);
      });
      res.json(records);
    } catch (error) {
      console.error("Error reading database:", error);
      res.status(500).json({ error: "Fout bij het lezen van de database" });
    }
  });

  // POST new records (adds rows of quantities)
  app.post("/api/records", async (req, res) => {
    try {
      const { inputterName, items, inputDate, inputTime, userEmail } = req.body;

      if (!userEmail) {
        return res.status(403).json({ error: "E-mailadres is verplicht om gegevens te versturen." });
      }

      const emailNorm = String(userEmail).toLowerCase().trim();

      // Check user approval status in Firestore
      const uSnap = await db.collection("users").where("email", "==", emailNorm).get();
      if (uSnap.empty) {
        return res.status(403).json({ 
          error: "Toegang geweigerd. Uw account is nog niet geregistreerd." 
        });
      }

      let approved = false;
      uSnap.forEach((ds) => {
        const u = ds.data() as AppUser;
        if (u.status === "approved") {
          approved = true;
        }
      });

      if (!approved) {
        return res.status(403).json({ 
          error: "Toegang geweigerd. Uw account is nog niet goedgekeurd door de beheerder." 
        });
      }

      if (!inputterName || typeof inputterName !== "string" || inputterName.trim() === "") {
        return res.status(400).json({ error: "Naam van de vuller is verplicht" });
      }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Ongeldige invoergegevens" });
      }

      // fetch predicted temperature
      const activeDate = inputDate || new Date().toLocaleDateString("nl-NL");
      let temp: number | null = null;
      try {
        temp = await fetchPredictedTemperature(activeDate);
      } catch (err) {
        console.warn("Fout bij ophalen temperatuur in POST:", err);
      }

      // Load prices configuration from Firestore
      let priceConfig: Record<string, number> = { "aardbeien groot": 4.5, "aardbeien klein": 3.0, "kerstomaten": 2.5 };
      try {
        const pricesSnap = await db.collection("settings").doc("prices").get();
        if (pricesSnap.exists) {
          priceConfig = pricesSnap.data() as Record<string, number>;
        }
      } catch (err) {
        console.error("Fout laden prijzen in Firestore:", err);
      }

      // Load correspondences configuration from Firestore
      let correspondenceConfig: Record<string, number> = {
        "kist_aardbeien_to_bakjes": 10.0,
        "doos_kerstomaten_to_bakjes": 10.0,
        "bakje_aardbeien_to_kg": 0.5,
        "bakje_kerstomaten_to_kg": 0.5
      };
      try {
        const correspondencesSnap = await db.collection("settings").doc("correspondences").get();
        if (correspondencesSnap.exists) {
          correspondenceConfig = correspondencesSnap.data() as Record<string, number>;
        }
      } catch (err) {
        console.error("Fout laden correspondences in Firestore:", err);
      }

      const timestamp = Date.now();
      const newRows: RecordRow[] = [];

      for (const item of items) {
        const typeLower = (item.productType || "").toLowerCase();
        let baseProduct = "aardbeien groot";
        if (typeLower.startsWith("aardbeien klein")) {
          baseProduct = "aardbeien klein";
        } else if (typeLower.startsWith("kerstomaten") || typeLower.startsWith("kers tomaten")) {
          baseProduct = "kerstomaten";
        }

        const basePrice = priceConfig[baseProduct] !== undefined ? priceConfig[baseProduct] : 4.5;
        const isCrate = typeLower.includes("(kisten)") || typeLower.includes("kisten");

        let unitMultiplier = 1.0;
        if (isCrate) {
          if (baseProduct === "kerstomaten") {
            unitMultiplier = Number(correspondenceConfig["doos_kerstomaten_to_bakjes"]) || 10.0;
          } else {
            unitMultiplier = Number(correspondenceConfig["kist_aardbeien_to_bakjes"]) || 10.0;
          }
        }

        const calculatedUnitPrice = basePrice * unitMultiplier;
        const totalPrice = Math.round((Number(item.productQuantity) || 0) * calculatedUnitPrice * 100) / 100;

        const recordId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        const recData: RecordRow = {
          id: recordId,
          inputterName: inputterName.trim(),
          inputDate: activeDate,
          inputTime: inputTime || new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
          productType: item.productType,
          productQuantity: Number(item.productQuantity) || 0,
          timestamp,
          userEmail: emailNorm,
          unitPrice: calculatedUnitPrice,
          totalPrice,
          predictedTemperature: temp,
          comment: item.comment || "",
          Opmerking: item.comment || "",
        };

        await db.collection("records").doc(recordId).set(recData);
        newRows.push(recData);
      }

      res.status(201).json({ success: true, added: newRows });
    } catch (error: any) {
      console.error("Error writing to database:", error);
      res.status(500).json({ error: error.message || "Fout bij het opslaan van gegevens" });
    }
  });

  // DELETE a record (for management and fixing errors)
  app.delete("/api/records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const docRef = db.collection("records").doc(String(id).trim());
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Record niet gevonden" });
      }
      await docRef.delete();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ error: "Fout bij het verwijderen van record" });
    }
  });

  // DELETE all records (for clearing database)
  app.post("/api/admin/clear-all", async (req, res) => {
    try {
      const snapshot = await db.collection("records").get();
      const batch = db.batch();
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing all records:", error);
      res.status(500).json({ error: "Fout bij het leegmaken van de database" });
    }
  });

  // GET prices
  app.get("/api/admin/prices", async (req, res) => {
    try {
      const docSnap = await db.collection("settings").doc("prices").get();
      if (docSnap.exists) {
        res.json(docSnap.data());
      } else {
        res.json({
          "aardbeien groot": 4.5,
          "aardbeien klein": 3.0,
          "kerstomaten": 2.5
        });
      }
    } catch (e) {
      res.status(500).json({ error: "Fout bij ophalen van prijszetting" });
    }
  });

  // POST prices
  app.post("/api/admin/prices", async (req, res) => {
    try {
      const { adminEmail, prices } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }
      await db.collection("settings").doc("prices").set(prices);
      res.json({ success: true, prices });
    } catch (e: any) {
      res.status(500).json({ error: "Fout bij opslaan van prijszetting" });
    }
  });

  // GET correspondences
  app.get("/api/correspondences", async (req, res) => {
    try {
      const docSnap = await db.collection("settings").doc("correspondences").get();
      if (docSnap.exists) {
        res.json(docSnap.data());
      } else {
        res.json({
          "kist_aardbeien_to_bakjes": 10.0,
          "doos_kerstomaten_to_bakjes": 10.0,
          "bakje_aardbeien_to_kg": 0.5,
          "bakje_kerstomaten_to_kg": 0.5
        });
      }
    } catch (e) {
      res.status(500).json({ error: "Fout bij ophalen van volume-correspondenties" });
    }
  });

  // POST correspondences
  app.post("/api/admin/correspondences", async (req, res) => {
    try {
      const { adminEmail, correspondences } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }
      await db.collection("settings").doc("correspondences").set(correspondences);
      res.json({ success: true, correspondences });
    } catch (e: any) {
      res.status(500).json({ error: "Fout bij opslaan van volume-correspondenties" });
    }
  });

  // GET Google Drive configuration
  app.get("/api/admin/gdrive-folder", async (req, res) => {
    try {
      const docSnap = await db.collection("settings").doc("gdrive").get();
      if (docSnap.exists) {
        res.json(docSnap.data());
      } else {
        res.json({ folderId: "1_TfhAFAu8zlM-pSocb9n2k0mHLuR52p0" });
      }
    } catch (e) {
      res.status(500).json({ error: "Fout bij ophalen van Google Drive configuratie" });
    }
  });

  // POST Google Drive configuration
  app.post("/api/admin/gdrive-folder", async (req, res) => {
    try {
      const { adminEmail, folderId } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }
      if (!folderId || typeof folderId !== "string") {
        return res.status(400).json({ error: "Ongeldige map ID" });
      }
      await db.collection("settings").doc("gdrive").set({ folderId: folderId.trim() });
      res.json({ success: true, folderId: folderId.trim() });
    } catch (e: any) {
      res.status(500).json({ error: "Fout bij opslaan van Google Drive configuratie" });
    }
  });

  // GET local database records (for raw backend simulated data migration)
  app.get("/api/admin/local-records-raw", async (req, res) => {
    try {
      const DB_FILE = path.join(DATA_DIR, "database.json");
      if (fs.existsSync(DB_FILE)) {
        const localRecords = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        return res.json(localRecords);
      }
      return res.json([]);
    } catch (e) {
      res.status(500).json({ error: "Fout bij ophalen van lokale database" });
    }
  });

  // GET download as CSV
  app.get("/api/export", async (req, res) => {
    try {
      const snapshot = await db.collection("records").orderBy("timestamp", "desc").get();
      const records: RecordRow[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as RecordRow);
      });

      let csvContent = "sep=;\r\n";
      csvContent += "Invoerder;Datum;Tijd;Producttype;Aantal;Max Temp;Prijs per stuk;Totaalinvoer\r\n";

      records.forEach((r) => {
        const escapedName = `"${r.inputterName ? r.inputterName.replace(/"/g, '""') : ""}"`;
        const escapedProductType = `"${r.productType ? r.productType.replace(/"/g, '""') : ""}"`;
        const tempVal = r.predictedTemperature !== undefined && r.predictedTemperature !== null ? `${r.predictedTemperature}` : "";
        const uPrice = r.unitPrice !== undefined && r.unitPrice !== null ? `${Number(r.unitPrice).toFixed(2).replace(/\./g, ",")}` : "";
        const tPrice = r.totalPrice !== undefined && r.totalPrice !== null ? `${Number(r.totalPrice).toFixed(2).replace(/\./g, ",")}` : "";
        
        csvContent += `${escapedName};${r.inputDate};${r.inputTime};${escapedProductType};${r.productQuantity};${tempVal};${uPrice};${tPrice}\r\n`;
      });

      const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
      const csvBuffer = Buffer.concat([bom, Buffer.from(csvContent, "utf-8")]);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=verkoopautomaat_geschiedenis.csv");
      res.send(csvBuffer);
    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).send("Fout bij het exporteren van de database");
    }
  });

  // GET user registration status on load / auth state changes
  app.post("/api/auth/sync", async (req, res) => {
    try {
      const { email, name, uid, provider } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mailadres is verplicht." });
      }

      const emailNorm = String(email).toLowerCase().trim();
      const displayName = String(name || "Gebruiker").trim();

      const isAdmin = await verifyIsAdmin(emailNorm);
      let userStatus: "pending" | "approved" | "rejected" = "pending";

      if (isAdmin) {
        userStatus = "approved"; // Admin is instantly approved
      }

      const uSnap = await db.collection("users").where("email", "==", emailNorm).get();
      let existingUserDoc: AppUser | null = null;
      let existingUserRef: any = null;

      uSnap.forEach((ds) => {
        existingUserDoc = ds.data() as AppUser;
        existingUserRef = ds.ref;
      });

      const userUid = uid || existingUserDoc?.uid || "local_" + Math.random().toString(36).substring(2, 12);

      if (!existingUserDoc) {
        // First-time login
        const newUser: AppUser = {
          uid: userUid,
          email: emailNorm,
          name: displayName,
          status: userStatus,
          createdAt: Date.now(),
          provider: provider || "google"
        };
        await db.collection("users").doc(userUid).set(newUser);
        
        console.log(`[APPROVAL REQUEST] Nieuwe gebruiker heeft voor het eerst ingelogd: ${displayName} (${emailNorm}). Admin goedkeuring is vereist.`);
      } else {
        const currentStatus = (existingUserDoc as AppUser).status;
        if (isAdmin) {
          userStatus = "approved";
        } else {
          userStatus = currentStatus;
        }

        const updatedFields: Partial<AppUser> = {
          status: userStatus,
          provider: provider || (existingUserDoc as AppUser).provider,
          name: displayName
        };
        if (uid) {
          updatedFields.uid = uid;
        }
        await existingUserRef.update(updatedFields);
      }

      res.json({
        success: true,
        email: emailNorm,
        name: displayName,
        status: userStatus,
        isAdmin
      });
    } catch (error: any) {
      console.error("Fout bij auth sync:", error);
      res.status(500).json({ error: error.message || "Fout bij autorisatiecontrole" });
    }
  });

  // POST custom E-mail and password register
  app.post("/api/auth/email/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "E-mail, wachtwoord en naam zijn verplicht." });
      }

      const emailNorm = String(email).toLowerCase().trim();
      const displayName = String(name).trim();

      if (password.length < 6) {
        return res.status(400).json({ error: "Wachtwoord moet minstens 6 tekens bevatten." });
      }

      const uSnap = await db.collection("users").where("email", "==", emailNorm).get();
      if (!uSnap.empty) {
        return res.status(400).json({ error: "Dit e-mailadres is al in gebruik." });
      }

      const isAdmin = await verifyIsAdmin(emailNorm);
      const userStatus = isAdmin ? "approved" : "pending";

      // Hash password
      const crypto = await import("crypto");
      const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

      const userUid = "local_" + Math.random().toString(36).substring(2, 15);
      const newUser: AppUser = {
        uid: userUid,
        email: emailNorm,
        name: displayName,
        status: userStatus,
        createdAt: Date.now(),
        provider: "email",
        passwordHash
      };

      await db.collection("users").doc(userUid).set(newUser);
      console.log(`[APPROVAL REQUEST] Nieuwe e-mailgebruiker geregistreerd: ${displayName} (${emailNorm}). status: ${userStatus}`);

      res.json({
        success: true,
        user: {
          email: emailNorm,
          name: displayName,
          status: userStatus,
          isAdmin
        }
      });
    } catch (error: any) {
      console.error("Fout bij registreren e-mailgebruiker:", error);
      res.status(500).json({ error: error.message || "Fout bij registreren" });
    }
  });

  // POST custom E-mail and password login
  app.post("/api/auth/email/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mailadres en wachtwoord zijn verplicht." });
      }

      const emailNorm = String(email).toLowerCase().trim();

      const uSnap = await db.collection("users").where("email", "==", emailNorm).get();
      if (uSnap.empty) {
        return res.status(400).json({ error: "E-mailadres of wachtwoord is onjuist." });
      }

      let foundUser: AppUser | null = null;
      let foundUserRef: any = null;
      uSnap.forEach((ds) => {
        foundUser = ds.data() as AppUser;
        foundUserRef = ds.ref;
      });

      if (!foundUser) {
        return res.status(400).json({ error: "E-mailadres of wachtwoord is onjuist." });
      }

      const crypto = await import("crypto");
      const passwordHashInput = crypto.createHash("sha256").update(password).digest("hex");

      if ((foundUser as AppUser).passwordHash !== passwordHashInput) {
        return res.status(400).json({ error: "E-mailadres of wachtwoord is onjuist." });
      }

      const isAdmin = await verifyIsAdmin(emailNorm);
      let userStatus = (foundUser as AppUser).status;

      if (isAdmin) {
        userStatus = "approved";
        if ((foundUser as AppUser).status !== "approved") {
          await foundUserRef.update({ status: "approved" });
        }
      }

      res.json({
        success: true,
        user: {
          email: (foundUser as AppUser).email,
          name: (foundUser as AppUser).name,
          status: userStatus,
          isAdmin
        }
      });
    } catch (error: any) {
      console.error("Fout bij inloggen e-mailgebruiker:", error);
      res.status(500).json({ error: error.message || "Fout bij inloggen" });
    }
  });

  // GET admins list
  app.get("/api/admin/admins", async (req, res) => {
    try {
      const adminEmail = String(req.query.adminEmail || "").toLowerCase().trim();
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd. U bent geen beheerder." });
      }

      const snapshot = await db.collection("admins").get();
      const admins: string[] = [];
      snapshot.forEach(ds => {
        admins.push(ds.id);
      });
      res.json({ success: true, admins });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST add new admin
  app.post("/api/admin/admins/add", async (req, res) => {
    try {
      const { adminEmail, newAdminEmail } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd. U bent geen beheerder." });
      }

      if (!newAdminEmail || !newAdminEmail.includes("@")) {
        return res.status(400).json({ error: "Ongeldig e-mailadres voor de nieuwe beheerder." });
      }

      const targetNorm = String(newAdminEmail).toLowerCase().trim();
      await db.collection("admins").doc(targetNorm).set({ email: targetNorm });

      // Also make sure their status is approved in the user list
      const uSnap = await db.collection("users").where("email", "==", targetNorm).get();
      for (const ds of uSnap.docs) {
        await ds.ref.update({ status: "approved" });
      }

      // return all admins
      const snapshot = await db.collection("admins").get();
      const admins: string[] = [];
      snapshot.forEach(ds => {
        admins.push(ds.id);
      });
      res.json({ success: true, admins });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST remove admin
  app.post("/api/admin/admins/delete", async (req, res) => {
    try {
      const { adminEmail, targetAdminEmail } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }

      const targetNorm = String(targetAdminEmail).toLowerCase().trim();
      if (targetNorm === "wouter.torfss@gmail.com") {
        return res.status(400).json({ error: "De hoofdbeheerder kan niet worden verwijderd." });
      }

      await db.collection("admins").doc(targetNorm).delete();

      // return all admins
      const snapshot = await db.collection("admins").get();
      const admins: string[] = [];
      snapshot.forEach(ds => {
        admins.push(ds.id);
      });
      res.json({ success: true, admins });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET user registry
  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminEmail = String(req.query.adminEmail || "").toLowerCase().trim();
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd. U bent geen beheerder." });
      }

      const snapshot = await db.collection("users").get();
      const users: AppUser[] = [];
      snapshot.forEach(ds => {
        users.push(ds.data() as AppUser);
      });
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST approve user status
  app.post("/api/admin/users/approve", async (req, res) => {
    try {
      const { adminEmail, targetEmail } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }

      const targetNorm = String(targetEmail).toLowerCase().trim();
      const uSnap = await db.collection("users").where("email", "==", targetNorm).get();
      if (uSnap.empty) {
        return res.status(404).json({ error: "Gebruiker niet gevonden in het register." });
      }
      for (const ds of uSnap.docs) {
        await ds.ref.update({ status: "approved" });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST reject user status
  app.post("/api/admin/users/reject", async (req, res) => {
    try {
      const { adminEmail, targetEmail } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }

      const targetNorm = String(targetEmail).toLowerCase().trim();
      const uSnap = await db.collection("users").where("email", "==", targetNorm).get();
      if (uSnap.empty) {
        return res.status(404).json({ error: "Gebruiker niet gevonden." });
      }
      for (const ds of uSnap.docs) {
        await ds.ref.update({ status: "rejected" });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST delete user entirely
  app.post("/api/admin/users/delete", async (req, res) => {
    try {
      const { adminEmail, targetEmail } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd." });
      }

      const targetNorm = String(targetEmail).toLowerCase().trim();
      const uSnap = await db.collection("users").where("email", "==", targetNorm).get();
      if (uSnap.empty) {
        return res.status(404).json({ error: "Gebruiker niet gevonden." });
      }
      for (const ds of uSnap.docs) {
        await ds.ref.delete();
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST manual Google Drive Backup trigger
  app.post("/api/admin/gdrive-backup", async (req, res) => {
    try {
      const { adminEmail, oauthToken } = req.body;
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd. U bent geen beheerder." });
      }

      console.log(`Handmatige Google Drive back-up getriggerd door ${adminEmail}...`);
      const result = await performDriveBackup(oauthToken);
      
      res.json({
        success: true,
        message: "Back-up succesvol weggeschreven naar Google Drive!",
        filename: result.filename,
        fileId: result.fileId,
        source: result.source
      });
    } catch (err: any) {
      console.error("Fout bij handmatige back-up naar Google Drive:", err?.message || err);
      res.status(500).json({ error: err.message || "Fout bij handmatige back-up naar Google Drive" });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Activeer dagelijkse automatische Google Drive backups op de achtergrond
  startDailyBackupSchedule();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
