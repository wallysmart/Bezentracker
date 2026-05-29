import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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

function saveLocalAdmins(admins: string[]): void {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), "utf-8");
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
        const tMin = data.daily.temperature_2m_min[idx];
        if (tMax !== undefined && tMin !== undefined) {
          return Math.round(((tMax + tMin) / 2) * 10) / 10;
        }
      }
    }
  } catch (err) {
    console.warn("Fout ophalen temperatuur van Open-Meteo:", err);
  }
  return null;
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf-8");
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

    // Combine and sort with original May 29 entries at the top
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
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // GET all records
  app.get("/api/records", (req, res) => {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const records: RecordRow[] = JSON.parse(data);
      // Sort: newest first
      records.sort((a, b) => b.timestamp - a.timestamp);
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
      let users: AppUser[] = [];
      try {
        users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      } catch (e) {}

      const foundUser = users.find(u => u.email.toLowerCase().trim() === emailNorm);
      if (!foundUser || foundUser.status !== "approved") {
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

      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      const records: RecordRow[] = JSON.parse(fileData);

      // fetch predicted temperature
      const activeDate = inputDate || new Date().toLocaleDateString("nl-NL");
      let temp: number | null = null;
      try {
        temp = await fetchPredictedTemperature(activeDate);
      } catch (err) {
        console.warn("Fout bij ophalen temperatuur in POST:", err);
      }

      // Load prices configuration
      let priceConfig: Record<string, number> = { "aardbeien groot": 4.5, "aardbeien klein": 3.0, "kerstomaten": 2.5 };
      try {
        if (fs.existsSync(PRICES_FILE)) {
          priceConfig = JSON.parse(fs.readFileSync(PRICES_FILE, "utf-8"));
        }
      } catch (err) {
        console.error("Fout laden prijzen:", err);
      }

      // Load correspondences configuration
      let correspondenceConfig: Record<string, number> = {
        "kist_aardbeien_to_bakjes": 10.0,
        "doos_kerstomaten_to_bakjes": 10.0,
        "bakje_aardbeien_to_kg": 0.5,
        "bakje_kerstomaten_to_kg": 0.5
      };
      try {
        if (fs.existsSync(CORRESPONDENCES_FILE)) {
          correspondenceConfig = JSON.parse(fs.readFileSync(CORRESPONDENCES_FILE, "utf-8"));
        }
      } catch (err) {
        console.error("Fout laden correspondenties:", err);
      }

      const timestamp = Date.now();
      const newRows: RecordRow[] = [];

      items.forEach((item: { productType: string; productQuantity: number }) => {
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

        newRows.push({
          id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          inputterName: inputterName.trim(),
          inputDate: activeDate,
          inputTime: inputTime || new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
          productType: item.productType,
          productQuantity: Number(item.productQuantity) || 0,
          timestamp,
          userEmail: emailNorm,
          unitPrice: calculatedUnitPrice,
          totalPrice,
          predictedTemperature: temp
        });
      });

      records.push(...newRows);

      fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), "utf-8");

      res.status(201).json({ success: true, added: newRows });
    } catch (error: any) {
      console.error("Error writing to database:", error);
      res.status(500).json({ error: error.message || "Fout bij het opslaan van gegevens" });
    }
  });

  // DELETE a record (for management and fixing errors)
  app.delete("/api/records/:id", (req, res) => {
    try {
      const { id } = req.params;
      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      let records: RecordRow[] = JSON.parse(fileData);
      
      const beforeLength = records.length;
      records = records.filter(r => String(r.id).trim() !== String(id).trim());
      
      if (records.length === beforeLength) {
        return res.status(404).json({ error: "Record niet gevonden" });
      }

      fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), "utf-8");
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ error: "Fout bij het verwijderen van record" });
    }
  });

  // GET prices
  app.get("/api/admin/prices", (req, res) => {
    try {
      const data = fs.readFileSync(PRICES_FILE, "utf-8");
      res.json(JSON.parse(data));
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
      fs.writeFileSync(PRICES_FILE, JSON.stringify(prices, null, 2), "utf-8");
      res.json({ success: true, prices });
    } catch (e: any) {
      res.status(500).json({ error: "Fout bij opslaan van prijszetting" });
    }
  });

  // GET correspondences
  app.get("/api/correspondences", (req, res) => {
    try {
      const data = fs.readFileSync(CORRESPONDENCES_FILE, "utf-8");
      res.json(JSON.parse(data));
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
      fs.writeFileSync(CORRESPONDENCES_FILE, JSON.stringify(correspondences, null, 2), "utf-8");
      res.json({ success: true, correspondences });
    } catch (e: any) {
      res.status(500).json({ error: "Fout bij opslaan van volume-correspondenties" });
    }
  });

  // GET download as CSV formatted specifically for Dutch Excel
  app.get("/api/export", (req, res) => {
    try {
      const fileData = fs.readFileSync(DB_FILE, "utf-8");
      const records: RecordRow[] = JSON.parse(fileData);
      
      // Sort: newest first
      records.sort((a, b) => b.timestamp - a.timestamp);

      // Excel-friendly CSV with BOM for UTF-8 and Dutch semicolon separators (Excel in Europe uses semicolon for CSV if decimal point is comma)
      // We will define 'sep=;' at the top of the file so Excel understands the separator immediately!
      let csvContent = "sep=;\r\n";
      csvContent += "Invoerder;Datum;Tijd;Producttype;Aantal\r\n";

      records.forEach((r) => {
        // Escape semicolons and double quotes in inputterName
        const escapedName = `"${r.inputterName.replace(/"/g, '""')}"`;
        const escapedProductType = `"${r.productType.replace(/"/g, '""')}"`;
        csvContent += `${escapedName};${r.inputDate};${r.inputTime};${escapedProductType};${r.productQuantity}\r\n`;
      });

      // Send with UTF-8 BOM
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

      // Read admins
      const admins = getLocalAdmins();
      const isAdmin = admins.includes(emailNorm);

      // Read current registry
      let users: AppUser[] = [];
      try {
        const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
        users = JSON.parse(fileContent);
      } catch (err) {
        console.error("Fout bij openen van users.json:", err);
      }

      let existingUserIdx = users.findIndex(u => u.email.toLowerCase().trim() === emailNorm);
      let userStatus: "pending" | "approved" | "rejected" = "pending";

      if (isAdmin) {
        userStatus = "approved"; // Admin is instantly approved
      }

      if (existingUserIdx === -1) {
        // First-time login
        const newUser: AppUser = {
          uid: uid || "",
          email: emailNorm,
          name: displayName,
          status: userStatus,
          createdAt: Date.now(),
          provider: provider || "google"
        };
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        
        console.log(`[APPROVAL REQUEST] Nieuwe gebruiker heeft voor het eerst ingelogd: ${displayName} (${emailNorm}). Admin goedkeuring is vereist.`);
      } else {
        // User already registered
        const existingUser = users[existingUserIdx];
        
        // If they became an admin in the meantime, update their status to approved
        if (isAdmin) {
          existingUser.status = "approved";
        }
        
        // Check current status
        userStatus = existingUser.status;

        // Keep fields updated
        if (uid && !existingUser.uid) existingUser.uid = uid;
        if (displayName && existingUser.name !== displayName) existingUser.name = displayName;
        if (provider) existingUser.provider = provider;

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
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

      // Read admins
      const admins = getLocalAdmins();
      const isAdmin = admins.includes(emailNorm);

      let users: AppUser[] = [];
      try {
        const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
        users = JSON.parse(fileContent);
      } catch (err) {}

      const existingUser = users.find(u => u.email.toLowerCase().trim() === emailNorm);
      if (existingUser) {
        return res.status(400).json({ error: "Dit e-mailadres is al in gebruik." });
      }

      // Hash password
      const crypto = await import("crypto");
      const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

      const userStatus = isAdmin ? "approved" : "pending";

      const newUser: AppUser = {
        uid: "local_" + Math.random().toString(36).substring(2, 15),
        email: emailNorm,
        name: displayName,
        status: userStatus,
        createdAt: Date.now(),
        provider: "email",
        passwordHash
      };

      users.push(newUser);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");

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

      let users: AppUser[] = [];
      try {
        const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
        users = JSON.parse(fileContent);
      } catch (err) {}

      const foundUser = users.find(u => u.email.toLowerCase().trim() === emailNorm);
      if (!foundUser) {
        return res.status(400).json({ error: "E-mailadres of wachtwoord is onjuist." });
      }

      const crypto = await import("crypto");
      const passwordHashInput = crypto.createHash("sha256").update(password).digest("hex");

      if (foundUser.passwordHash !== passwordHashInput) {
        return res.status(400).json({ error: "E-mailadres of wachtwoord is onjuist." });
      }

      // Check current admin status
      const admins = getLocalAdmins();
      const isAdmin = admins.includes(emailNorm);

      let userStatus = foundUser.status;
      if (isAdmin) {
        userStatus = "approved";
        if (foundUser.status !== "approved") {
          foundUser.status = "approved";
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        }
      }

      res.json({
        success: true,
        user: {
          email: foundUser.email,
          name: foundUser.name,
          status: userStatus,
          isAdmin
        }
      });
    } catch (error: any) {
      console.error("Fout bij inloggen e-mailgebruiker:", error);
      res.status(500).json({ error: error.message || "Fout bij inloggen" });
    }
  });

  // Helper middleware/check for admin routes
  const verifyIsAdmin = async (adminEmail: string): Promise<boolean> => {
    const norm = adminEmail.toLowerCase().trim();
    const admins = getLocalAdmins();
    return admins.includes(norm);
  };

  // GET admins list
  app.get("/api/admin/admins", async (req, res) => {
    try {
      const adminEmail = String(req.query.adminEmail || "").toLowerCase().trim();
      const isAuthorized = await verifyIsAdmin(adminEmail);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Toegang geweigerd. U bent geen beheerder." });
      }

      const admins = getLocalAdmins();
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
      const admins = getLocalAdmins();

      if (!admins.includes(targetNorm)) {
        admins.push(targetNorm);
        saveLocalAdmins(admins);

        // Also make sure their status is approved in the user list
        let users: AppUser[] = [];
        try {
          users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
          const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === targetNorm);
          if (uIdx !== -1) {
            users[uIdx].status = "approved";
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
          }
        } catch (e) {}
      }

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

      let admins = getLocalAdmins();
      admins = admins.filter(a => a.toLowerCase().trim() !== targetNorm);
      saveLocalAdmins(admins);

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

      const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
      const users: AppUser[] = JSON.parse(fileContent);
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
      const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
      const users: AppUser[] = JSON.parse(fileContent);

      const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === targetNorm);
      if (uIdx !== -1) {
        users[uIdx].status = "approved";
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return res.json({ success: true });
      }

      res.status(404).json({ error: "Gebruiker niet gevonden in het register." });
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
      const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
      const users: AppUser[] = JSON.parse(fileContent);

      const uIdx = users.findIndex(u => u.email.toLowerCase().trim() === targetNorm);
      if (uIdx !== -1) {
        users[uIdx].status = "rejected";
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return res.json({ success: true });
      }

      res.status(404).json({ error: "Gebruiker niet gevonden." });
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
      const fileContent = fs.readFileSync(USERS_FILE, "utf-8");
      let users: AppUser[] = JSON.parse(fileContent);

      const beforeLen = users.length;
      users = users.filter(u => u.email.toLowerCase().trim() !== targetNorm);

      if (users.length < beforeLen) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
        return res.json({ success: true });
      }

      res.status(404).json({ error: "Gebruiker niet gevonden." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
