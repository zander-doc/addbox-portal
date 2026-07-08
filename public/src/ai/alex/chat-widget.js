// Alex de ADDBOX — Widget de chat v2.1
// Streaming SSE + Feedback + Auto-rol + Indicador de escritura + Atajos

// URL dinámica: usa producción si existe, sino localhost
const ALEX_API = window.ALEX_API_URL || "http://localhost:3100/api";

// Estado
let isOpen = false;
let isLoading = false;

// ─────────────────────────────────────────
// Inicialización (esperar DOM)
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Abrir panel
  document.getElementById("alexButton").onclick = () => {
    const panel = document.getElementById("alexPanel");
    const fab = document.getElementById("alexButton");
    panel.classList.add("open");
    isOpen = true;

    // Vibración del FAB
    fab.classList.add("vibrate");
    setTimeout(() => fab.classList.remove("vibrate"), 300);

    document.getElementById("alexInput").focus();

    // Mensaje de bienvenida + sugerencias (solo la primera vez)
    const messages = document.getElementById("alexMessages");
    if (messages.children.length === 0) {
      showWelcome();
      showSuggestions();
    }
  };

  // Cerrar panel
  document.getElementById("alexClose").onclick = () => {
    document.getElementById("alexPanel").classList.remove("open");
    isOpen = false;
  };

  // Enviar con botón
  document.getElementById("alexSend").onclick = sendToAlex;

  // Enviar con Enter
  document.getElementById("alexInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendToAlex();
    }
  });

  // Atajos rápidos
  document.querySelectorAll(".alex-shortcut").forEach(btn => {
    btn.onclick = () => {
      document.getElementById("alexInput").value = btn.dataset.msg;
      sendToAlex();
    };
  });

  // Detectar rol del usuario desde la sesión (si existe)
  detectUserRole();
});

// ─────────────────────────────────────────
// Detectar rol automáticamente
// ─────────────────────────────────────────
function detectUserRole() {
  // Intentar obtener del localStorage o sesión de Supabase
  try {
    const session = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}");
    const user = session?.currentSession?.user;
    if (user) {
      window.userId = user.id;
      // El rol puede estar en user_metadata
      window.userRole = user.user_metadata?.role || window.userRole || "default";
    }
  } catch (e) {
    // Mantener los valores por defecto
  }
}

// ─────────────────────────────────────────
// Mensaje de bienvenida
// ─────────────────────────────────────────
function showWelcome() {
  const msg = `Hola, soy Alex IA 🤖\nTu copiloto inteligente para gestionar inventario, movimientos y análisis en ADDBOX.\n\n¿En qué puedo ayudarte hoy?`;
  appendMessage("alex", msg);
}

// ─────────────────────────────────────────
// Enviar mensaje
// ─────────────────────────────────────────
async function sendToAlex() {
  const input = document.getElementById("alexInput");
  const messages = document.getElementById("alexMessages");
  const text = input.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  input.value = "";
  input.disabled = true;
  document.getElementById("alexSend").disabled = true;

  // Mostrar mensaje del usuario
  appendMessage("user", text);

  // Remover sugerencias si existen
  const suggestions = document.querySelector(".alex-suggestions");
  if (suggestions) suggestions.remove();

  // Mostrar indicador de escritura
  const typingEl = showTypingIndicator();

  // Crear burbuja de Alex (vacía, para streaming)
  const alexBubble = appendMessage("alex", "");
  const msgId = Date.now().toString();
  alexBubble.dataset.msgId = msgId;
  alexBubble.style.display = "none"; // ocultar hasta que llegue contenido

  try {
    // Cambiar estado a analizando
    setAlexState("analyzing");

    // Intentar streaming primero
    const response = await fetch(`${ALEX_API}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        user: {
          id: window.userId || "anon",
          role: window.userRole || "default"
        }
      })
    });

    // Quitar indicador de escritura
    removeTypingIndicator(typingEl);
    alexBubble.style.display = "";

    if (!response.ok || !response.body) {
      // Fallback a chat normal (sin streaming)
      const fallback = await fetch(`${ALEX_API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          user: { id: window.userId || "anon", role: window.userRole || "default" }
        })
      });
      const data = await fallback.json();
      alexBubble.querySelector(".alex-msg-text").textContent = data.reply || data.error || "Sin respuesta.";
    } else {
      // Leer stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.chunk) {
                alexBubble.querySelector(".alex-msg-text").textContent += payload.chunk;
                messages.scrollTop = messages.scrollHeight;
              }
              if (payload.error) {
                alexBubble.querySelector(".alex-msg-text").textContent += `\n⚠️ ${payload.error}`;
              }
            } catch (e) {}
          }
        }
      }
    }

    // Agregar botones de feedback
    addFeedbackButtons(alexBubble, msgId);

    // Glow en la respuesta + estado disponible
    alexBubble.classList.add("glow");
    setAlexState("available");

  } catch (err) {
    removeTypingIndicator(typingEl);
    alexBubble.style.display = "";
    alexBubble.querySelector(".alex-msg-text").textContent = "⚠️ Hubo un problema procesando tu solicitud.\nEstoy revisando la conexión con OpenAI.";
    setAlexState("error");
  }

  isLoading = false;
  input.disabled = false;
  document.getElementById("alexSend").disabled = false;
  input.focus();
  messages.scrollTop = messages.scrollHeight;
}

// ─────────────────────────────────────────
// Indicador de escritura
// ─────────────────────────────────────────
function showTypingIndicator() {
  const messages = document.getElementById("alexMessages");
  const div = document.createElement("div");
  div.className = "alex-typing";
  div.innerHTML = `<div class="alex-typing-avatar"></div><div class="alex-typing-content"><span class="alex-typing-dot"></span><span class="alex-typing-dot"></span><span class="alex-typing-dot"></span><div class="alex-typing-label">Alex IA está analizando…</div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ─────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────
function appendMessage(type, text) {
  const messages = document.getElementById("alexMessages");
  const div = document.createElement("div");
  div.className = `alex-msg-wrapper ${type}`;

  if (type === "user") {
    div.innerHTML = `<div class="alex-msg-bubble alex-msg-user">${escapeHtml(text)}</div>`;
  } else {
    div.innerHTML = `<div class="alex-msg-row"><div class="alex-avatar-mini"><div class="alex-avatar-icon"></div></div><div class="alex-msg-bubble alex-msg-bot"><span class="alex-msg-text">${escapeHtml(text)}</span></div></div>`;
  }

  // Animación fade-in
  div.style.opacity = "0";
  div.style.transform = type === "user" ? "translateX(10px)" : "translateX(-10px)";
  messages.appendChild(div);
  requestAnimationFrame(() => {
    div.style.transition = "opacity 0.3s, transform 0.3s";
    div.style.opacity = "1";
    div.style.transform = "translateX(0)";
  });

  messages.scrollTop = messages.scrollHeight;
  return div;
}

function addFeedbackButtons(bubble, msgId) {
  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "alex-feedback";
  feedbackDiv.innerHTML = `
    <button class="alex-fb-btn" data-rating="positive" title="Buena respuesta">👍</button>
    <button class="alex-fb-btn" data-rating="negative" title="Mala respuesta">👎</button>
  `;

  feedbackDiv.querySelectorAll(".alex-fb-btn").forEach(btn => {
    btn.onclick = async () => {
      const rating = btn.dataset.rating;
      feedbackDiv.innerHTML = `<span class="alex-fb-thanks">Gracias por tu feedback</span>`;
      try {
        await fetch(`${ALEX_API}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msgId, userId: window.userId || "anon", rating })
        });
      } catch (e) {}
    };
  });

  bubble.querySelector(".alex-msg-bubble").appendChild(feedbackDiv);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ─────────────────────────────────────────
// Sugerencias inteligentes
// ─────────────────────────────────────────
function showSuggestions() {
  const messages = document.getElementById("alexMessages");
  const container = document.createElement("div");
  container.className = "alex-suggestions";
  container.innerHTML = `
    <div class="alex-suggestion-card" data-msg="resumen inventario">
      <span class="alex-suggestion-icon">📊</span> Ver resumen del inventario
    </div>
    <div class="alex-suggestion-card" data-msg="productos críticos">
      <span class="alex-suggestion-icon">⚠️</span> Productos críticos
    </div>
    <div class="alex-suggestion-card" data-msg="últimos movimientos">
      <span class="alex-suggestion-icon">🔄</span> Últimos movimientos
    </div>
  `;

  container.querySelectorAll(".alex-suggestion-card").forEach(card => {
    card.onclick = () => {
      document.getElementById("alexInput").value = card.dataset.msg;
      container.remove();
      sendToAlex();
    };
  });

  messages.appendChild(container);
}

// ─────────────────────────────────────────
// Estado dinámico de Alex
// ─────────────────────────────────────────
function setAlexState(state) {
  const panel = document.getElementById("alexPanel");
  const states = ["state-available", "state-analyzing", "state-processing", "state-waiting", "state-error"];
  states.forEach(s => panel.classList.remove(s));
  panel.classList.add(`state-${state}`);
}

