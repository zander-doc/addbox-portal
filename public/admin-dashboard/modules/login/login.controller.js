import { getLoginFormValues, getRegisterFormValues, showError, showLoginError, showRegisterError, showRegisterSuccess, setLoading } from "./login.ui.js";
import { login, register, logout } from "./login.service.js";
import { setSession } from "../../services/sessionService.js";
import { handleError } from "../../services/error-handler.js";
import { showToast } from "../../services/toastService.js";

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoginError("");

    const { email, password } = getLoginFormValues();
    const btn = loginForm.querySelector("button");
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      setLoading(btn, true);
    }

    try {
      const response = await login(email, password);

      if (response.error) {
        showLoginError("Error: " + response.error);
        showToast("Credenciales incorrectas", "error");
        return;
      }

      if (!response.user) {
        showLoginError("Error: no se pudo obtener el usuario.");
        return;
      }

      const user = response.user;

      // Guardar identidad en sessionStorage
      sessionStorage.setItem("rol", user.rol || "usuario");
      sessionStorage.setItem("nombre", user.nombre || user.email.split('@')[0]);
      sessionStorage.setItem("email", user.email);
      sessionStorage.setItem("id", user.id);

      // Guardar sesión via sessionService (ya lo hace login.service.js)
      setSession(user, response.token);

      showLoginError("");
      const msgEl = document.getElementById("login-message");
      if (msgEl) {
        msgEl.textContent = "✅ Acceso concedido. Redirigiendo...";
        msgEl.className = "login-message success";
      }
      showToast("Bienvenido", "success");

      window.location.href = "/admin-dashboard/modules/dashboard/dashboard.html";
    } catch (err) {
      console.error("Error en login:", err);
      showLoginError("Error inesperado: " + err.message);
    } finally {
      if (btn) setLoading(btn, false);
    }
  });
}

// El formulario de registro se mantiene (si existe en la página)
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showRegisterError("");
    showRegisterSuccess("");

    const { email, password, passwordConfirm } = getRegisterFormValues();
    const nombre = document.getElementById("registerName")?.value || email.split('@')[0];
    const btn = registerForm.querySelector("button");
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      setLoading(btn, true);
    }

    if (password !== passwordConfirm) {
      showRegisterError("Las contraseñas no coinciden.");
      if (btn) setLoading(btn, false);
      return;
    }

    try {
      const response = await register(email, password, nombre);

      if (response.error) {
        showRegisterError("Error en registro: " + response.error);
        return;
      }

      showRegisterSuccess("Cuenta creada con éxito. Ahora puedes iniciar sesión.");
      return;
    } catch (err) {
      showRegisterError("Error inesperado: " + err.message);
    } finally {
      if (btn) setLoading(btn, false);
    }
  });
}

document.querySelectorAll(".toggle-password").forEach((icon) => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    if (!target) return;
    target.type = target.type === "password" ? "text" : "password";
  });
});

const forgotLink = document.getElementById("forgotPasswordLink");
if (forgotLink) {
    forgotLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        if (!email) {
            handleError("login", new Error("Por favor ingresa tu correo para recuperar la contraseña."));
            return;
        }
        
        // Recuperación de contraseña via Clerk
        if (window.Clerk) {
          try {
            await window.Clerk.client.signIn.create({
              strategy: "reset_password_email",
              identifier: email
            });
            showToast("Se ha enviado un enlace de recuperación a tu correo.", "success");
          } catch (error) {
            handleError("login", error);
          }
        } else {
          handleError("login", new Error("Clerk no está disponible para recuperación de contraseña."));
        }
    });
}