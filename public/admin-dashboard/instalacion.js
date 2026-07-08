/* ============================================================
   INSTALACION.JS — ADDBOX
   Funciones para la instalación inicial del sistema
============================================================ */

import { markInstallationComplete } from './modules/admin/installation-state.js';
import { handleError } from "../services/error-handler.js";

document.addEventListener('DOMContentLoaded', () => {
    initInstallation();
});

/* ============================
   VARIABLES GLOBALES
============================ */
let masterKey = null;
let keyHash = null;

/* ============================
   FUNCIONES DE INICIALIZACIÓN
============================ */
function initInstallation() {
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    const downloadKeyBtn = document.getElementById('downloadKeyBtn');
    const continueBtn = document.getElementById('continueBtn');

    if (!generateKeyBtn || !downloadKeyBtn || !continueBtn) {
        console.error('Elementos del DOM no encontrados');
        return;
    }

    // Evento: Generar clave maestra
    generateKeyBtn.addEventListener('click', handleGenerateKey);

    // Evento: Descargar clave
    downloadKeyBtn.addEventListener('click', handleDownloadKey);

    // Evento: Continuar con la instalación
    continueBtn.addEventListener('click', handleContinueInstallation);
}

/* ============================
   GENERAR CLAVE MAESTRA
============================ */
function handleGenerateKey() {
    // Generar un valor aleatorio seguro de 256 bits (32 bytes)
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);

    // Convertir a string hexadecimal
    masterKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

    // Generar el hash de la clave
    generateKeyHash(masterKey).then(hash => {
        keyHash = hash;
        console.log('Clave maestra generada con éxito');
        console.log('Hash guardado (no mostrar al usuario):', hash.substring(0, 16) + '...');
    }).catch(error => {
        console.error('Error generando el hash:', error);
        // 🔄 Reemplazado por error-handler.js
        handleError("instalacion", error);
        return;
    });

    // Mostrar la clave en pantalla
    displayMasterKey(masterKey);

    // Actualizar estado de botones
    updateButtonStates(true);
}

function displayMasterKey(key) {
    const display = document.getElementById('masterKeyDisplay');
    const value = document.getElementById('masterKeyValue');

    if (display && value) {
        value.textContent = key;
        display.classList.remove('empty');
    }
}

function updateButtonStates(keyGenerated) {
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    const downloadKeyBtn = document.getElementById('downloadKeyBtn');
    const continueBtn = document.getElementById('continueBtn');

    if (generateKeyBtn) {
        generateKeyBtn.disabled = keyGenerated;
    }

    if (downloadKeyBtn) {
        downloadKeyBtn.disabled = !keyGenerated;
    }

    if (continueBtn) {
        continueBtn.disabled = !keyGenerated;
    }
}

/* ============================
   GENERAR HASH DE LA CLAVE
============================ */
async function generateKeyHash(key) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(key);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Error generando hash:', error);
        throw error;
    }
}

/* ============================
   DESCARGAR CLAVE (.key)
============================ */
function handleDownloadKey() {
    if (!masterKey) {
        console.error('No hay clave para descargar');
        // 🔄 Reemplazado por error-handler.js
        handleError("instalacion", new Error('No se puede descargar una clave no generada'));
        return;
    }

    // Crear Blob con la clave
    const blob = new Blob([masterKey], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // Crear elemento de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = 'addbox-master-key.key';
    document.body.appendChild(a);

    // Disparar descarga
    a.click();

    // Limpiar
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/* ============================
   GUARDAR CONFIGURACIÓN Y REDIRECCIÓN
============================ */
async function handleContinueInstallation() {
    if (!masterKey || !keyHash) {
        console.error('Clave o hash no disponibles');
        // 🔄 Reemplazado por error-handler.js
        handleError("instalacion", new Error('Error: La clave maestra no está completamente configurada'));
        return;
    }

    try {
        // Guardar en Supabase usando markInstallationComplete
        await markInstallationComplete(keyHash);
        
        console.log('Configuración guardada exitosamente');
        // Redirigir al formulario de creación de jefe
        window.location.href = 'inicio-de-sesion.html';
    } catch (error) {
        console.error('Error guardando configuración:', error);
        // 🔄 Reemplazado por error-handler.js
        handleError("instalacion", error);
    }
}

/* ============================
   EXPORTS (para uso modular)
============================ */
export {
    masterKey,
    keyHash,
    generateKeyHash,
    displayMasterKey,
    updateButtonStates
};
