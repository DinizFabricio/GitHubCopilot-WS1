/**
 * EventManager - Observer Pattern Implementation
 * Gerencia eventos e notificações entre componentes de forma desacoplada
 */
class EventManager {
    constructor() {
        this.listeners = {};
        this.debug = false; // Para logging em desenvolvimento
    }

    /**
     * Registra um listener para um evento específico
     * @param {string} event - Nome do evento
     * @param {Function} callback - Função a ser executada
     * @param {Object} options - Opções adicionais
     */
    subscribe(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error(`Callback for event '${event}' must be a function`);
        }

        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: options.id || this._generateId()
        };

        this.listeners[event].push(listener);
        
        // Ordena por prioridade (maior prioridade primeiro)
        this.listeners[event].sort((a, b) => b.priority - a.priority);

        if (this.debug) {
            console.log(`📡 EventManager: Subscribed to '${event}'`, { listenerId: listener.id });
        }

        // Retorna função para unsubscribe
        return () => this.unsubscribe(event, listener.id);
    }

    /**
     * Remove um listener específico
     * @param {string} event - Nome do evento
     * @param {string} listenerId - ID do listener
     */
    unsubscribe(event, listenerId) {
        if (!this.listeners[event]) return false;

        const initialLength = this.listeners[event].length;
        this.listeners[event] = this.listeners[event].filter(
            listener => listener.id !== listenerId
        );

        const removed = initialLength > this.listeners[event].length;
        
        if (this.debug && removed) {
            console.log(`📡 EventManager: Unsubscribed from '${event}'`, { listenerId });
        }

        return removed;
    }

    /**
     * Publica um evento para todos os listeners
     * @param {string} event - Nome do evento
     * @param {*} data - Dados a serem enviados
     */
    publish(event, data = null) {
        if (!this.listeners[event] || this.listeners[event].length === 0) {
            if (this.debug) {
                console.warn(`📡 EventManager: No listeners for event '${event}'`);
            }
            return;
        }

        if (this.debug) {
            console.log(`📡 EventManager: Publishing '${event}'`, { 
                data, 
                listenerCount: this.listeners[event].length 
            });
        }

        // Cria uma cópia dos listeners para evitar problemas com modificações durante iteração
        const listeners = [...this.listeners[event]];
        
        listeners.forEach(listener => {
            try {
                listener.callback(data, event);
                
                // Remove listeners 'once' após execução
                if (listener.once) {
                    this.unsubscribe(event, listener.id);
                }
            } catch (error) {
                console.error(`📡 EventManager: Error in listener for '${event}'`, {
                    error,
                    listenerId: listener.id
                });
            }
        });
    }

    /**
     * Publica evento de forma assíncrona
     * @param {string} event - Nome do evento
     * @param {*} data - Dados a serem enviados
     */
    async publishAsync(event, data = null) {
        if (!this.listeners[event] || this.listeners[event].length === 0) {
            return;
        }

        const listeners = [...this.listeners[event]];
        const promises = listeners.map(async listener => {
            try {
                const result = listener.callback(data, event);
                
                // Suporte para callbacks assíncronos
                if (result instanceof Promise) {
                    await result;
                }
                
                if (listener.once) {
                    this.unsubscribe(event, listener.id);
                }
            } catch (error) {
                console.error(`📡 EventManager: Async error in listener for '${event}'`, {
                    error,
                    listenerId: listener.id
                });
            }
        });

        await Promise.all(promises);
    }

    /**
     * Remove todos os listeners de um evento
     * @param {string} event - Nome do evento
     */
    clearEvent(event) {
        if (this.listeners[event]) {
            const count = this.listeners[event].length;
            delete this.listeners[event];
            
            if (this.debug) {
                console.log(`📡 EventManager: Cleared ${count} listeners for '${event}'`);
            }
        }
    }

    /**
     * Remove todos os listeners
     */
    clearAll() {
        const eventCount = Object.keys(this.listeners).length;
        this.listeners = {};
        
        if (this.debug) {
            console.log(`📡 EventManager: Cleared all listeners (${eventCount} events)`);
        }
    }

    /**
     * Lista todos os eventos registrados
     * @returns {Object} Estatísticas dos eventos
     */
    getStats() {
        const stats = {};
        Object.keys(this.listeners).forEach(event => {
            stats[event] = {
                listenerCount: this.listeners[event].length,
                listeners: this.listeners[event].map(l => ({
                    id: l.id,
                    priority: l.priority,
                    once: l.once
                }))
            };
        });
        return stats;
    }

    /**
     * Ativa/desativa modo debug
     * @param {boolean} enabled - Se deve ativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`📡 EventManager: Debug ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Gera ID único para listeners
     * @returns {string} ID único
     */
    _generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Eventos padrão da aplicação
EventManager.EVENTS = {
    // Form events
    FORM_SUBMIT: 'form:submit',
    FORM_VALIDATE: 'form:validate',
    FORM_CLEAR: 'form:clear',
    
    // API events
    API_LOADING_START: 'api:loading:start',
    API_LOADING_END: 'api:loading:end',
    API_SUCCESS: 'api:success',
    API_ERROR: 'api:error',
    
    // Search events
    SEARCH_START: 'search:start',
    SEARCH_SUCCESS: 'search:success',
    SEARCH_ERROR: 'search:error',
    
    // UI events
    UI_SHOW_RESULTS: 'ui:show:results',
    UI_SHOW_ERROR: 'ui:show:error',
    UI_CLEAR_RESULTS: 'ui:clear:results',
    UI_UPDATE_LOADING: 'ui:update:loading',
    
    // Data events
    DATA_CACHED: 'data:cached',
    DATA_RETRIEVED: 'data:retrieved'
};

export default EventManager;
