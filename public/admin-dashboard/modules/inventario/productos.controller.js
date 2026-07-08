import { obtenerProductos, crearProducto, actualizarProducto, eliminarProducto } from "./productos.service.js";
import { renderProductosTabla } from "./productos.ui.js";
import { audit } from "../../services/auditService.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await cargarProductos();
  configurarEventos();
}

async function cargarProductos() {
  const productos = await obtenerProductos();
  renderProductosTabla(productos);
}

function configurarEventos() {
  document.querySelector("#form-crear-producto")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    const nuevo = await crearProducto(payload);
    await audit("productos", "crear", `Producto ${nuevo.id} creado`);
    await cargarProductos();
  });

  document.querySelector("#productos-tbody")?.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("btn-eliminar")) {
      await eliminarProducto(id);
      await audit("productos", "eliminar", `Producto ${id} eliminado`);
      await cargarProductos();
    }

    if (e.target.classList.contains("btn-editar")) {
      // Aquí solo marcamos el evento; la edición real depende de tu modal
      await audit("productos", "editar", `Intento de edición del producto ${id}`);
    }
  });
}
