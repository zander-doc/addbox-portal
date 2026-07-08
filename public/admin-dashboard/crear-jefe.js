import { supabase } from "./services/supabase-client.js";
import { handleError } from "./services/error-handler.js";

const nombreInput = document.getElementById("nombre");
const correoInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");
const masterKeyInput = document.getElementById("master-key-input");
const btnCrear = document.getElementById("btn-crear");
const statusMsg = document.getElementById("status-msg");

function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = "status-msg " + type;
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

btnCrear.addEventListener("click", async () => {
  // Limpiar estado previo
  statusMsg.className = "status-msg";
  statusMsg.style.display = "none";

  const nombre = nombreInput.value.trim();
  const correo = correoInput.value.trim();
  const password = passwordInput.value.trim();
  const masterKey = masterKeyInput.value.trim();

  // Validar campos
  if (!nombre || !correo || !password || !masterKey) {
    showStatus("Completa todos los campos.", "error");
    return;
  }

  if (password.length < 6) {
    showStatus("La contraseña debe tener al menos 6 caracteres.", "error");
    return;
  }

  // Deshabilitar botón mientras procesa
  btnCrear.disabled = true;
  btnCrear.textContent = "Creando cuenta...";

  try {
    // 1. Verificar master key contra la tabla instalacion
    const { data: instData, error: instError } = await supabase
      .from("instalacion")
      .select("master_key_hash, first_run")
      .eq("id", 1)
      .single();

    if (instError || !instData) {
      showStatus("Error al verificar instalación. Contacta al desarrollador.", "error");
      handleError("crear-jefe", instError || new Error("No se encontró registro de instalación"));
      return;
    }

    if (!instData.master_key_hash) {
      showStatus("No se ha generado una master key aún. Ve a la página de setup primero.", "error");
      return;
    }

    // 2. Comparar hash de la master key ingresada
    const hashIngresado = await hashText(masterKey);

    if (hashIngresado !== instData.master_key_hash) {
      showStatus("Master key incorrecta. Verifica la clave que te entregó el desarrollador.", "error");
      return;
    }

    // 3. Crear usuario en Supabase Auth
    const { user, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: password
    });

    if (authError) {
      showStatus("Error al crear cuenta: " + authError.message, "error");
      handleError("crear-jefe", authError);
      return;
    }

    if (!user) {
      showStatus("Error: no se pudo crear el usuario en autenticación.", "error");
      return;
    }

    // 4. Insertar perfil en tabla usuarios
    const { error: insertError } = await supabase.from("usuarios").insert({
      id: user.id,
      nombre: nombre,
      email: correo,
      rol: "jefe",
      estado: "activo",
      creado_en: new Date().toISOString(),
      ip_registro: null
    });

    if (insertError) {
      showStatus("Error al guardar perfil: " + insertError.message, "error");
      handleError("crear-jefe", insertError);
      return;
    }

    // 5. Marcar instalación como completada
    await supabase.from("instalacion").update({
      first_run: false
    }).eq("id", 1);

    // 6. Éxito
    showStatus("✅ Cuenta del jefe creada correctamente. Redirigiendo al login...", "success");

    setTimeout(() => {
      window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    }, 2000);

  } catch (err) {
    showStatus("Error inesperado: " + err.message, "error");
    handleError("crear-jefe", err);
  } finally {
    btnCrear.disabled = false;
    btnCrear.textContent = "Crear cuenta del jefe";
  }
});
