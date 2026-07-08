(async () => {
  const db = window.supabaseClient;
  const { data, error } = await db.from("instalacion").select("*").single();

  if (error && error.code === "PGRST116") {
    window.location.href = "/crear-jefe.html";
    return;
  }

  if (data.first_run === true) {
    window.location.href = "/crear-jefe.html";
    return;
  }
})();
