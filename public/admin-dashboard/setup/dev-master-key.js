// 🔄 Reemplazado por supabase-client.js
// 🔄 Reemplazado por install-guard.js
/*
const supabaseUrl = "https://billwldqxupcavzurljo.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGx3bGRxeHVwY2F2enVybGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDAzODIsImV4cCI6MjA5MTgxNjM4Mn0.4jsINbwwL9RMjKMdnQu-nYM7qBLb9KIXhEsuXQrEGO8";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
*/

import { supabase } from "../services/supabase-client.js";
import { handleError } from "../services/error-handler.js";


const btnGenerar = document.getElementById("btn-generar");
const keyBox = document.getElementById("key-box");
const keyPre = document.getElementById("master-key");
const btnDescargar = document.getElementById("btn-descargar");

let masterKeyGlobal = null;

function generarMasterKey() {
  const random = crypto.getRandomValues(new Uint32Array(4));
  return `ADDBOX-OWNER-${random[0].toString(16)}-${random[1].toString(16)}-${random[2].toString(16)}-${random[3].toString(16)}`;
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

btnGenerar.addEventListener("click", async () => {
  masterKeyGlobal = generarMasterKey();
  keyPre.textContent = masterKeyGlobal;
  keyBox.classList.remove("hidden");
  
  const hash = await hashText(masterKeyGlobal);
  
  const { error } = await supabase.from("instalacion").update({
    first_run: false,
    master_key_hash: hash,
    updated_at: new Date().toISOString()
  }).eq("id", 1);
  
  if (error) {
    // 🔄 Reemplazado por error-handler.js
    handleError("dev-master-key", error);
    console.error(error);
  } else {
    // 🔄 Reemplazado por error-handler.js
    handleError("dev-master-key", new Error("Master key generada y registrada en Supabase. Guárdala bien."));
  }
});

btnDescargar.addEventListener("click", () => {
  if (!masterKeyGlobal) return;
  
  const blob = new Blob([masterKeyGlobal], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "addbox-owner.key";
  a.click();
  URL.revokeObjectURL(url);
});