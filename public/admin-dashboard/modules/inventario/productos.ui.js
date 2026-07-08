export function renderProductosTabla(productos) {
  const tbody = document.querySelector("#productos-tbody");
  tbody.innerHTML = "";

  productos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.nombre}</td>
      <td>${p.descripcion ?? ""}</td>
      <td>${p.precio ?? 0}</td>
      <td>${p.stock ?? 0}</td>
      <td>
        <button class="btn-editar" data-id="${p.id}">Editar</button>
        <button class="btn-eliminar" data-id="${p.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
