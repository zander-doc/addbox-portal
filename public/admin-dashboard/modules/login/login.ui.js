export function getLoginFormValues() {
  return {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };
}

export function getRegisterFormValues() {
  return {
    email: document.getElementById("registerEmail").value,
    password: document.getElementById("registerPassword").value,
    passwordConfirm: document.getElementById("registerPasswordConfirm").value
  };
}

export function showError(message) {
  console.error("🔥 ERROR:", message);
}

export function showLoginError(message) {
  const errorElement = document.getElementById("loginError");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

export function showRegisterError(message) {
  const errorElement = document.getElementById("registerError");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

export function showRegisterSuccess(message) {
  const successElement = document.getElementById("registerSuccess");
  if (successElement) {
    successElement.textContent = message;
  }
}

export function setLoading(btn, isLoading) {
  if (btn) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "Cargando..." : btn.dataset.originalText;
  }
}

export function clearForm(form) {
  if (form) {
    form.reset();
  }
}
