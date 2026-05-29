import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "onedrive_config.json");
const TOKEN_FILE = path.join(DATA_DIR, "onedrive_token.json");

// Default App configuration using a standard multitenant app registration if they want,
// or they can provide their own customized Client ID/Secret.
export interface OneDriveConfig {
  clientId: string;
  clientSecret: string;
}

export interface OneDriveToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp ms
  userEmail?: string;
  userName?: string;
}

export function getOneDriveConfig(): OneDriveConfig | null {
  // 1. Prefer secure server environment variables set by the developer
  if (process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
    return {
      clientId: process.env.ONEDRIVE_CLIENT_ID.trim(),
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET.trim()
    };
  }

  // 2. Fallback to storage configuration file if any
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading OneDrive config:", error);
  }
  return null;
}

export function saveOneDriveConfig(config: OneDriveConfig): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getOneDriveToken(): OneDriveToken | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading OneDrive token:", error);
  }
  return null;
}

export function saveOneDriveToken(token: OneDriveToken): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), "utf-8");
}

export function deleteOneDriveToken(): void {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
  } catch (error) {
    console.error("Error deleting OneDrive token:", error);
  }
}

// Refresh dynamic Access Token if it has expired (or is close to expiring in 5 minutes)
export async function refreshAccessTokenIfNeeded(): Promise<string> {
  const token = getOneDriveToken();
  if (!token) {
    throw new Error("OneDrive is niet gekoppeld. Gelieve in te loggen via het beheerderspaneel.");
  }

  const now = Date.now();
  // If accessToken is token valid and has more than 2 minutes left, use it
  if (token.accessToken && token.expiresAt > now + 120 * 1000) {
    return token.accessToken;
  }

  const config = getOneDriveConfig();
  if (!config || !config.clientId || !config.clientSecret) {
    throw new Error("OneDrive Client ID en Client Secret zijn niet geconfigureerd.");
  }

  console.log("OneDrive access token verlopen of bijna verlopen. Vernieuwen...");

  const params = new URLSearchParams();
  params.append("client_id", config.clientId);
  params.append("client_secret", config.clientSecret);
  params.append("refresh_token", token.refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Fout bij vernieuwen van OneDrive token:", errText);
    throw new Error(`OneDrive-machtiging verlopen. Koppel uw account opnieuw.`);
  }

  const data = await res.json();
  const updatedToken: OneDriveToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || token.refreshToken, // Default to old one if not rotated
    expiresAt: Date.now() + data.expires_in * 1000,
    userEmail: token.userEmail,
    userName: token.userName,
  };

  saveOneDriveToken(updatedToken);
  return updatedToken.accessToken;
}

export interface ExcelRow {
  naam: string;
  datum: string;
  uur: string;
  product: string;
  aantal: number;
}

// Append new rows to OneDrive Excel File 'bezentracker.xlsx' in the root folder
export async function appendRowsToOneDriveExcel(rows: ExcelRow[]): Promise<void> {
  const accessToken = await refreshAccessTokenIfNeeded();
  
  const fileName = "bezentracker.xlsx";
  const fileUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}`;
  
  // 1. Check if file exists and download it
  let fileBuffer: Buffer | null = null;
  let fileItemId: string | null = null;

  try {
    const metaRes = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      fileItemId = meta.id;

      // Download content
      const contentRes = await fetch(`${fileUrl}:/content`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (contentRes.ok) {
        const arrayBuffer = await contentRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
    }
  } catch (err) {
    console.log("File is nog niet aangemaakt, we gaan een nieuwe aanmaken.");
  }

  let wb: xlsx.WorkBook;
  let wsName = "Sheet1";
  let wsData: any[][] = [];

  if (fileBuffer) {
    // 2. Load existing workbook using xlsx
    wb = xlsx.read(fileBuffer, { type: "buffer" });
    wsName = wb.SheetNames[0] || "Sheet1";
    const ws = wb.Sheets[wsName];
    wsData = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    
    // Ensure that headers exist in case sheet exists but is empty
    if (wsData.length === 0) {
      wsData.push(["naam", "datum", "uur", "product", "aantal"]);
    }
  } else {
    // Create new empty workbook
    wb = xlsx.utils.book_new();
    wsData = [["naam", "datum", "uur", "product", "aantal"]];
  }

  // 3. Append our rows
  rows.forEach((r) => {
    wsData.push([r.naam, r.datum, r.uur, r.product, r.aantal]);
  });

  // Calculate grid range properly with sheet utility
  const newWs = xlsx.utils.aoa_to_sheet(wsData);
  wb.Sheets[wsName] = newWs;
  if (!wb.SheetNames.includes(wsName)) {
    wb.SheetNames.push(wsName);
  }

  // Write Excel file back to a Buffer
  const outBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

  // 4. Upload updated file content back to OneDrive
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: outBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Kon de Excel-sheet niet opslaan naar OneDrive: ${errText}`);
  }
  
  console.log(`Succesvol ${rows.length} rijen toegevoegd aan OneDrive Excel-bestand.`);
}

// Fetch admins list from OneDrive Excel file (bezentracker_admins.xlsx)
// Falls back to empty list if not connected. Pre-populates with default admin if file not found.
export async function getAdminsFromOneDrive(): Promise<string[]> {
  const token = getOneDriveToken();
  if (!token) {
    return ["wouter.torfss@gmail.com"];
  }

  try {
    const accessToken = await refreshAccessTokenIfNeeded();
    const fileName = "bezentracker_admins.xlsx";
    const fileUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}`;

    let fileBuffer: Buffer | null = null;
    const metaRes = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (metaRes.ok) {
      const contentRes = await fetch(`${fileUrl}:/content`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (contentRes.ok) {
        const arrayBuffer = await contentRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
    }

    if (fileBuffer) {
      const wb = xlsx.read(fileBuffer, { type: "buffer" });
      const wsName = wb.SheetNames[0] || "Sheet1";
      const ws = wb.Sheets[wsName];
      const wsData = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const emails: string[] = [];
      // Row 0 is header "email" (or similar), we search in column 0
      for (let i = 1; i < wsData.length; i++) {
        const row = wsData[i];
        if (row && row[0]) {
          const email = String(row[0]).toLowerCase().trim();
          if (email && !emails.includes(email)) {
            emails.push(email);
          }
        }
      }
      if (!emails.includes("wouter.torfss@gmail.com")) {
        emails.push("wouter.torfss@gmail.com"); // Always guarantee fallback
      }
      return emails;
    } else {
      // File not found, create it with default administrator
      const defaultAdmins = ["wouter.torfss@gmail.com"];
      await saveAdminsToOneDrive(defaultAdmins);
      return defaultAdmins;
    }
  } catch (error) {
    console.error("Error reading admins from OneDrive, falling back to local defaults:", error);
    return ["wouter.torfss@gmail.com"];
  }
}

// Save admins list to OneDrive Excel file (bezentracker_admins.xlsx)
export async function saveAdminsToOneDrive(admins: string[]): Promise<void> {
  const token = getOneDriveToken();
  if (!token) return;

  try {
    const accessToken = await refreshAccessTokenIfNeeded();
    const fileName = "bezentracker_admins.xlsx";

    // Build worksheets
    const wb = xlsx.utils.book_new();
    const wsData = [["email"]];
    admins.forEach((email) => {
      wsData.push([email.toLowerCase().trim()]);
    });

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, "Admins");

    const outBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: outBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to save admins to OneDrive: ${errText}`);
    }
    console.log("Successfully synchronized admin list to OneDrive bezentracker_admins.xlsx");
  } catch (error) {
    console.error("Error saving admins to OneDrive:", error);
  }
}
