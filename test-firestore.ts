import { Firestore } from "@google-cloud/firestore";
import fs from "fs";
import path from "path";

async function run() {
  const log: string[] = [];
  const addLog = (msg: string) => {
    console.log(msg);
    log.push(msg);
  };

  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  addLog(`firebaseConfig: ${JSON.stringify(firebaseConfig)}`);

  // Try 1: Configured Project with default database
  try {
    addLog("\n--- Try 1: Configured project, geconfigureerde database ---");
    const db1 = new Firestore({
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId
    });
    addLog(`Initialized Firestore for project: ${firebaseConfig.projectId}, databaseId: ${firebaseConfig.firestoreDatabaseId}`);
    const collections = await db1.listCollections();
    addLog(`Collections found: ${collections.map(c => c.id).join(", ")}`);
  } catch (err: any) {
    addLog(`Failed: ${err?.message || err}`);
  }

  // Try 2: Native project, default database
  try {
    addLog("\n--- Try 2: Native project (no projectId), default database ---");
    const db2 = new Firestore();
    addLog(`Initialized Firestore with default project (from credentials)`);
    const collections = await db2.listCollections();
    addLog(`Collections found: ${collections.map(c => c.id).join(", ")}`);
  } catch (err: any) {
    addLog(`Failed: ${err?.message || err}`);
  }

  // Try 3: Configured Project, search for databases if possible or print env
  addLog(`\nProcess env keys: ${JSON.stringify(Object.keys(process.env).filter(k => k.includes("GOOGLE") || k.includes("FIREBASE") || k.includes("PROJECT")))}`);
  addLog(`process.env.GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);

  fs.writeFileSync("./data/probe_result.log", log.join("\n"), "utf-8");
}

run();
