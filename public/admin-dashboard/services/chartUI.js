/* ============================================================
   CHART UI SERVICE — ADDBOX
   Renderizado de gráficas ApexCharts (donut, line, bar)
   Módulo compartido importado por Productos e Inventario
============================================================ */

// Instancias de gráficas por container ID para cleanup
const chartInstances = {};

// Paleta de colores predefinida (mínimo 5)
const COLOR_PALETTE = [
  "#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0",
  "#546E7A", "#26a69a", "#D10CE8", "#2E93fA", "#66DA26"
];

/* ============================
   UTILIDADES INTERNAS
============================ */

/**
 * Hash determinista de un string para asignar color consistente.
 * Mismo label → mismo índice de paleta siempre.
 */
export function hashLabelToColorIndex(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    const char = label.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % COLOR_PALETTE.length;
}

/**
 * Trunca un label a 20 caracteres + "…" si excede.
 */
export function truncateLabel(label) {
  if (label.length > 20) {
    return label.substring(0, 20) + "…";
  }
  return label;
}

/**
 * Formatea un número como moneda es-MX: "$1,234.56"
 */
export function formatCurrency(value) {
  return "$" + value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Verifica si ApexCharts está disponible globalmente.
 */
function isApexChartsAvailable() {
  return typeof ApexCharts !== "undefined";
}

/**
 * Valida que el dataset sea un array no vacío.
 */
function isValidDataset(dataset) {
  return Array.isArray(dataset) && dataset.length > 0;
}

/**
 * Destruye la instancia previa de un chart en un container.
 */
function destroyPreviousInstance(containerId) {
  if (chartInstances[containerId]) {
    chartInstances[containerId].destroy();
    chartInstances[containerId] = null;
  }
}

/**
 * Muestra un mensaje de fallback dentro de un container.
 */
function showFallbackMessage(container, message) {
  container.innerHTML = `<p style="text-align:center;color:#888;padding:40px 0;">${message}</p>`;
}

/* ============================
   RENDER: TOP 5 PRODUCTOS (DONUT)
============================ */

/**
 * Renderiza un donut chart con los top 5 productos por stock.
 * @param {Array<{label: string, value: number}>|null|undefined} dataset
 */
export function renderGraficaTop5Productos(dataset) {
  const container = document.querySelector("#chart-top5-productos");
  if (!container) return;

  // Verificar ApexCharts disponible
  if (!isApexChartsAvailable()) {
    showFallbackMessage(container, "La gráfica no pudo ser cargada");
    return;
  }

  // Validar dataset
  if (!isValidDataset(dataset)) {
    destroyPreviousInstance("chart-top5-productos");
    showFallbackMessage(container, "No hay datos");
    return;
  }

  // Destruir instancia previa
  destroyPreviousInstance("chart-top5-productos");
  container.innerHTML = "";

  // Preparar datos
  const labels = dataset.map(item => truncateLabel(item.label));
  const series = dataset.map(item => item.value);
  const colors = dataset.map(item => COLOR_PALETTE[hashLabelToColorIndex(item.label)]);

  // Opciones del donut chart
  const options = {
    chart: {
      type: "donut",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    series: series,
    labels: labels,
    colors: colors,
    legend: {
      position: "bottom"
    }
  };

  // Renderizar
  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances["chart-top5-productos"] = chart;
}

/* ============================
   RENDER: TENDENCIA MOVIMIENTOS (LINE)
============================ */

/**
 * Renderiza un line chart con la tendencia de movimientos (30 días).
 * @param {Array<{label: string, value: number}>|null|undefined} dataset
 */
export function renderGraficaTendenciaMovimientos(dataset) {
  const container = document.querySelector("#chart-tendencia-movimientos");
  if (!container) return;

  // Verificar ApexCharts disponible
  if (!isApexChartsAvailable()) {
    showFallbackMessage(container, "La gráfica no pudo ser cargada");
    return;
  }

  // Validar dataset
  if (!isValidDataset(dataset)) {
    destroyPreviousInstance("chart-tendencia-movimientos");
    showFallbackMessage(container, "No hay datos");
    return;
  }

  // Destruir instancia previa
  destroyPreviousInstance("chart-tendencia-movimientos");
  container.innerHTML = "";

  // Preparar datos
  const categories = dataset.map(item => item.label);
  const seriesData = dataset.map(item => item.value);

  // Opciones del line chart
  const options = {
    chart: {
      type: "line",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    series: [{
      name: "Movimientos",
      data: seriesData
    }],
    xaxis: {
      categories: categories
    },
    stroke: {
      curve: "smooth"
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: function (value) {
          return value;
        },
        title: {
          formatter: function (seriesName, opts) {
            return categories[opts.dataPointIndex] + ":";
          }
        }
      }
    }
  };

  // Renderizar
  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances["chart-tendencia-movimientos"] = chart;
}

/* ============================
   RENDER: VALOR INVENTARIO POR CATEGORÍA (BAR HORIZONTAL)
============================ */

/**
 * Renderiza un horizontal bar chart con el valor de inventario por categoría.
 * @param {Array<{label: string, value: number}>|null|undefined} dataset
 */
export function renderGraficaValorInventarioPorCategoria(dataset) {
  const container = document.querySelector("#chart-valor-por-categoria");
  if (!container) return;

  // Verificar ApexCharts disponible
  if (!isApexChartsAvailable()) {
    showFallbackMessage(container, "La gráfica no pudo ser cargada");
    return;
  }

  // Validar dataset
  if (!isValidDataset(dataset)) {
    destroyPreviousInstance("chart-valor-por-categoria");
    showFallbackMessage(container, "No hay datos");
    return;
  }

  // Destruir instancia previa
  destroyPreviousInstance("chart-valor-por-categoria");
  container.innerHTML = "";

  // Ordenar descendente por value y limitar a 50 categorías
  const sorted = [...dataset].sort((a, b) => b.value - a.value).slice(0, 50);

  // Preparar datos
  const categories = sorted.map(item => truncateLabel(item.label));
  const seriesData = sorted.map(item => item.value);

  // Opciones del horizontal bar chart
  const options = {
    chart: {
      type: "bar",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    series: [{
      name: "Valor",
      data: seriesData
    }],
    plotOptions: {
      bar: {
        horizontal: true
      }
    },
    xaxis: {
      categories: categories,
    },
    tooltip: {
      y: {
        formatter: function (value) {
          return formatCurrency(value);
        }
      }
    },
    dataLabels: {
      formatter: function (value) {
        return formatCurrency(value);
      }
    }
  };

  // Renderizar
  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances["chart-valor-por-categoria"] = chart;
}
