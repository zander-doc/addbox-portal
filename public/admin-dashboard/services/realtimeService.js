/**
 * RealtimeService — Gestión de suscripciones en tiempo real via Supabase v1
 *
 * Maneja la suscripción a INSERT en la tabla `movimientos` filtrada por obra,
 * con reconexión automática exponencial y estado de conexión observable.
 *
 * Uso:
 *   import { supabase } from './supabase-client.js';
 *   const rt = new RealtimeService(supabase);
 *   rt.subscribe(obraId, (nuevoMovimiento) => { ... });
 *   // Al cambiar de obra o salir:
 *   rt.unsubscribe();
 */

// Intervalos de reconexión exponencial (ms)
const RETRY_INTERVALS = [1000, 2000, 4000, 8000, 16000];
const MAX_RETRIES = 5;

export class RealtimeService {
  /**
   * @param {object} supabaseClient — instancia de Supabase v1 client
   */
  constructor(supabaseClient) {
    this._supabase = supabaseClient;
    this._subscription = null;
    this._status = 'disconnected'; // 'connected' | 'reconnecting' | 'disconnected'
    this._retryCount = 0;
    this._retryTimer = null;
    this._currentObraId = null;
    this._currentCallback = null;
  }

  /**
   * Suscribirse a INSERT en movimientos filtrado por obra.
   * Cancela cualquier suscripción previa antes de crear una nueva.
   *
   * @param {string} obraId — UUID de la obra a observar
   * @param {function} onInsert — callback invocado con el nuevo movimiento
   */
  subscribe(obraId, onInsert) {
    // Cancelar suscripción previa si existe
    this.unsubscribe();

    this._currentObraId = obraId;
    this._currentCallback = onInsert;
    this._retryCount = 0;

    this._createSubscription();
  }

  /**
   * Cancelar la suscripción activa y limpiar estado.
   */
  unsubscribe() {
    this._clearRetryTimer();

    if (this._subscription) {
      this._supabase.removeSubscription(this._subscription);
      this._subscription = null;
    }

    this._status = 'disconnected';
    this._currentObraId = null;
    this._currentCallback = null;
    this._retryCount = 0;
  }

  /**
   * Retorna el estado actual de la conexión realtime.
   * @returns {'connected' | 'reconnecting' | 'disconnected'}
   */
  getStatus() {
    return this._status;
  }

  /**
   * Reintento manual de conexión. Reinicia el contador de reintentos
   * y vuelve a crear la suscripción con la obra y callback actuales.
   */
  retry() {
    if (!this._currentObraId || !this._currentCallback) {
      return;
    }

    this._clearRetryTimer();
    this._retryCount = 0;
    this._status = 'reconnecting';

    this._createSubscription();
  }

  // --- Métodos internos ---

  /**
   * Crea la suscripción a Supabase Realtime usando la API v1.
   * @private
   */
  _createSubscription() {
    try {
      this._subscription = this._supabase
        .from(`movimientos:obra_id=eq.${this._currentObraId}`)
        .on('INSERT', (payload) => {
          this._handleInsert(payload);
        })
        .subscribe((status) => {
          this._handleSubscriptionStatus(status);
        });
    } catch (error) {
      this._handleDisconnect();
    }
  }

  /**
   * Maneja un evento INSERT recibido.
   * @private
   */
  _handleInsert(payload) {
    if (this._currentCallback && payload && payload.new) {
      this._currentCallback(payload.new);
    }
  }

  /**
   * Maneja cambios de estado de la suscripción.
   * @private
   * @param {string} status — estado reportado por Supabase ('SUBSCRIBED', 'CLOSED', 'CHANNEL_ERROR', etc.)
   */
  _handleSubscriptionStatus(status) {
    if (status === 'SUBSCRIBED') {
      this._status = 'connected';
      this._retryCount = 0;
      this._clearRetryTimer();
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      this._handleDisconnect();
    }
  }

  /**
   * Maneja una desconexión: inicia reconexión automática con backoff exponencial.
   * @private
   */
  _handleDisconnect() {
    // Limpiar suscripción rota
    if (this._subscription) {
      try {
        this._supabase.removeSubscription(this._subscription);
      } catch (_) {
        // Ignorar errores al limpiar suscripción fallida
      }
      this._subscription = null;
    }

    if (this._retryCount >= MAX_RETRIES) {
      this._status = 'disconnected';
      return;
    }

    this._status = 'reconnecting';
    const delay = RETRY_INTERVALS[this._retryCount] || RETRY_INTERVALS[RETRY_INTERVALS.length - 1];
    this._retryCount++;

    this._retryTimer = setTimeout(() => {
      if (this._currentObraId && this._currentCallback) {
        this._createSubscription();
      }
    }, delay);
  }

  /**
   * Limpia el timer de reintento pendiente.
   * @private
   */
  _clearRetryTimer() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
  }
}
