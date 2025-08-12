/**
 * BaseComponent - Classe base para todos os componentes
 * Fornece funcionalidades comuns como event management e lifecycle
 */
class BaseComponent {
    constructor(element, options = {}) {
        // Validação do elemento
        if (!element) {
            throw new Error('BaseComponent: Element is required');
        }

        if (typeof element === 'string') {
            const foundElement = document.querySelector(element);
            if (!foundElement) {
                throw new Error(`BaseComponent: Element with selector "${element}" not found`);
            }
            this.element = foundElement;
        } else if (element instanceof HTMLElement) {
            this.element = element;
        } else {
            throw new Error('BaseComponent: Element must be a DOM element or CSS selector');
        }

        // Configurações básicas
        this.options = { ...options };
        this.id = this._generateId();
        
        // Event Manager (será injetado externamente)
        this.eventManager = options.eventManager || null;
        
        // Estado do componente
        this.isDestroyed = false;
        this.isInitialized = false;
        
        // Cache para otimização
        this._cache = new Map();
        
        // Marca elemento como componente
        this.element.setAttribute('data-component-id', this.id);
        this.element.setAttribute('data-component-type', this.constructor.name);
        
        console.log(`🧩 BaseComponent: ${this.constructor.name} created with ID ${this.id}`);
    }

    /**
     * Gera ID único para o componente
     * @returns {string} ID único
     */
    _generateId() {
        return `${this.constructor.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Inicializa o componente
     * Deve ser chamado após configuração completa
     */
    initialize() {
        if (this.isInitialized) {
            console.warn(`🧩 BaseComponent: ${this.constructor.name} already initialized`);
            return;
        }

        try {
            // Valida se elemento ainda existe no DOM
            if (!document.body.contains(this.element)) {
                throw new Error('Component element is not in the DOM');
            }

            // Marca como inicializado
            this.isInitialized = true;
            
            // Notifica inicialização
            this.eventManager?.publish('component:initialized', {
                componentId: this.id,
                componentType: this.constructor.name,
                element: this.element
            });

            console.log(`✅ BaseComponent: ${this.constructor.name} initialized`);
            
        } catch (error) {
            console.error(`❌ BaseComponent: Failed to initialize ${this.constructor.name}`, error);
            throw error;
        }
    }

    /**
     * Define Event Manager
     * @param {Object} eventManager - Instância do EventManager
     */
    setEventManager(eventManager) {
        this.eventManager = eventManager;
        console.log(`🧩 BaseComponent: EventManager set for ${this.constructor.name}`);
    }

    /**
     * Obtém dados do cache
     * @param {string} key - Chave do cache
     * @returns {*} Valor em cache ou undefined
     */
    getCached(key) {
        return this._cache.get(key);
    }

    /**
     * Define dados no cache
     * @param {string} key - Chave do cache
     * @param {*} value - Valor para cachear
     * @param {number} ttl - Time to live em ms (opcional)
     */
    setCached(key, value, ttl = null) {
        const cacheEntry = {
            value,
            timestamp: Date.now(),
            ttl
        };
        
        this._cache.set(key, cacheEntry);
        
        // Auto-limpeza se TTL definido
        if (ttl) {
            setTimeout(() => {
                if (this._cache.has(key)) {
                    const entry = this._cache.get(key);
                    if (entry === cacheEntry) { // Verifica se não foi sobrescrito
                        this._cache.delete(key);
                    }
                }
            }, ttl);
        }
    }

    /**
     * Limpa cache
     * @param {string} key - Chave específica ou undefined para limpar tudo
     */
    clearCache(key = null) {
        if (key) {
            this._cache.delete(key);
        } else {
            this._cache.clear();
        }
    }

    /**
     * Verifica se cache é válido
     * @param {string} key - Chave do cache
     * @returns {boolean} True se cache é válido
     */
    isCacheValid(key) {
        const entry = this._cache.get(key);
        if (!entry) return false;
        
        if (entry.ttl) {
            const isExpired = (Date.now() - entry.timestamp) > entry.ttl;
            if (isExpired) {
                this._cache.delete(key);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Obtém valor do cache com validação
     * @param {string} key - Chave do cache
     * @returns {*} Valor válido ou undefined
     */
    getValidCached(key) {
        if (this.isCacheValid(key)) {
            return this._cache.get(key).value;
        }
        return undefined;
    }

    /**
     * Emite evento através do EventManager
     * @param {string} eventName - Nome do evento
     * @param {*} data - Dados do evento
     */
    emit(eventName, data = null) {
        if (!this.eventManager) {
            console.warn(`🧩 BaseComponent: No EventManager available for ${this.constructor.name}`);
            return;
        }

        const eventData = {
            source: this.constructor.name,
            componentId: this.id,
            timestamp: Date.now(),
            data
        };

        this.eventManager.publish(eventName, eventData);
    }

    /**
     * Escuta eventos através do EventManager
     * @param {string} eventName - Nome do evento
     * @param {Function} callback - Callback do evento
     * @returns {Function} Função para cancelar inscrição
     */
    listen(eventName, callback) {
        if (!this.eventManager) {
            console.warn(`🧩 BaseComponent: No EventManager available for ${this.constructor.name}`);
            return () => {};
        }

        return this.eventManager.subscribe(eventName, callback);
    }

    /**
     * Encontra elemento filho
     * @param {string} selector - Seletor CSS
     * @returns {Element|null} Elemento encontrado
     */
    find(selector) {
        return this.element.querySelector(selector);
    }

    /**
     * Encontra todos os elementos filhos
     * @param {string} selector - Seletor CSS
     * @returns {NodeList} Lista de elementos
     */
    findAll(selector) {
        return this.element.querySelectorAll(selector);
    }

    /**
     * Adiciona classe ao elemento principal
     * @param {...string} classNames - Nomes das classes
     */
    addClass(...classNames) {
        this.element.classList.add(...classNames);
    }

    /**
     * Remove classe do elemento principal
     * @param {...string} classNames - Nomes das classes
     */
    removeClass(...classNames) {
        this.element.classList.remove(...classNames);
    }

    /**
     * Alterna classe do elemento principal
     * @param {string} className - Nome da classe
     * @param {boolean} force - Forçar estado (opcional)
     * @returns {boolean} Estado da classe após alternância
     */
    toggleClass(className, force = undefined) {
        return this.element.classList.toggle(className, force);
    }

    /**
     * Verifica se elemento tem classe
     * @param {string} className - Nome da classe
     * @returns {boolean} True se tem a classe
     */
    hasClass(className) {
        return this.element.classList.contains(className);
    }

    /**
     * Define atributo no elemento
     * @param {string} name - Nome do atributo
     * @param {string} value - Valor do atributo
     */
    setAttribute(name, value) {
        this.element.setAttribute(name, value);
    }

    /**
     * Obtém atributo do elemento
     * @param {string} name - Nome do atributo
     * @returns {string|null} Valor do atributo
     */
    getAttribute(name) {
        return this.element.getAttribute(name);
    }

    /**
     * Remove atributo do elemento
     * @param {string} name - Nome do atributo
     */
    removeAttribute(name) {
        this.element.removeAttribute(name);
    }

    /**
     * Define dados no elemento
     * @param {string} key - Chave do data attribute
     * @param {string} value - Valor
     */
    setData(key, value) {
        this.element.dataset[key] = value;
    }

    /**
     * Obtém dados do elemento
     * @param {string} key - Chave do data attribute
     * @returns {string|undefined} Valor do data attribute
     */
    getData(key) {
        return this.element.dataset[key];
    }

    /**
     * Define estilo no elemento
     * @param {string|Object} property - Propriedade CSS ou objeto de estilos
     * @param {string} value - Valor da propriedade (se property for string)
     */
    setStyle(property, value = null) {
        if (typeof property === 'object') {
            Object.assign(this.element.style, property);
        } else {
            this.element.style[property] = value;
        }
    }

    /**
     * Obtém valor computado de estilo
     * @param {string} property - Propriedade CSS
     * @returns {string} Valor computado
     */
    getStyle(property) {
        return getComputedStyle(this.element)[property];
    }

    /**
     * Mostra elemento
     */
    show() {
        this.element.style.display = '';
        this.element.removeAttribute('hidden');
        this.addClass('visible');
        this.removeClass('hidden');
    }

    /**
     * Esconde elemento
     */
    hide() {
        this.element.style.display = 'none';
        this.addClass('hidden');
        this.removeClass('visible');
    }

    /**
     * Alterna visibilidade do elemento
     * @param {boolean} visible - Estado de visibilidade (opcional)
     */
    toggle(visible = undefined) {
        const isVisible = this.element.style.display !== 'none' && 
                         !this.element.hasAttribute('hidden');
        
        const shouldShow = visible !== undefined ? visible : !isVisible;
        
        if (shouldShow) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Verifica se elemento está visível
     * @returns {boolean} True se visível
     */
    isVisible() {
        return this.element.offsetParent !== null && 
               this.element.style.display !== 'none' &&
               !this.element.hasAttribute('hidden');
    }

    /**
     * Obtém dimensões do elemento
     * @returns {Object} Objeto com width, height, top, left
     */
    getBounds() {
        const rect = this.element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom
        };
    }

    /**
     * Verifica se componente foi destruído
     * @returns {boolean} True se destruído
     */
    isDestroyed() {
        return this.isDestroyed;
    }

    /**
     * Valida se componente está em estado válido
     * @returns {boolean} True se válido
     * @throws {Error} Se estado inválido
     */
    validate() {
        if (this.isDestroyed) {
            throw new Error(`Component ${this.constructor.name} is destroyed`);
        }
        
        if (!this.element) {
            throw new Error(`Component ${this.constructor.name} has no element`);
        }
        
        if (!document.body.contains(this.element)) {
            throw new Error(`Component ${this.constructor.name} element is not in DOM`);
        }
        
        return true;
    }

    /**
     * Método de renderização (deve ser implementado pelas subclasses)
     * Renderiza o componente no DOM
     */
    render() {
        console.warn(`🧩 BaseComponent: render() not implemented in ${this.constructor.name}`);
    }

    /**
     * Método de atualização (pode ser sobrescrito pelas subclasses)
     * Atualiza o estado do componente
     * @param {Object} newData - Novos dados para atualizar
     */
    update(newData = {}) {
        console.log(`🧩 BaseComponent: update() called on ${this.constructor.name}`, newData);
        
        // Implementação padrão - merge com options
        this.options = { ...this.options, ...newData };
        
        // Re-renderiza se necessário
        if (this.isInitialized && !this.isDestroyed) {
            this.render();
        }
    }

    /**
     * Método de limpeza (pode ser sobrescrito pelas subclasses)
     * Executa limpeza específica do componente
     */
    cleanup() {
        // Limpeza padrão
        this.clearCache();
        
        console.log(`🧹 BaseComponent: cleanup() called on ${this.constructor.name}`);
    }

    /**
     * Destrói o componente
     * Remove event listeners e limpa referências
     */
    destroy() {
        if (this.isDestroyed) {
            console.warn(`🧩 BaseComponent: ${this.constructor.name} already destroyed`);
            return;
        }

        console.log(`🗑️ BaseComponent: Destroying ${this.constructor.name}`);

        try {
            // Executa limpeza específica
            this.cleanup();

            // Notifica destruição
            this.eventManager?.publish('component:destroying', {
                componentId: this.id,
                componentType: this.constructor.name
            });

            // Remove atributos do componente
            this.element?.removeAttribute('data-component-id');
            this.element?.removeAttribute('data-component-type');

            // Marca como destruído
            this.isDestroyed = true;
            this.isInitialized = false;

            // Limpa referências
            this.element = null;
            this.eventManager = null;
            this.options = null;
            this._cache = null;

            console.log(`✅ BaseComponent: ${this.constructor.name} destroyed successfully`);

        } catch (error) {
            console.error(`❌ BaseComponent: Error destroying ${this.constructor.name}`, error);
            throw error;
        }
    }

    /**
     * Retorna representação string do componente
     * @returns {string} Representação do componente
     */
    toString() {
        return `${this.constructor.name}#${this.id}`;
    }

    /**
     * Retorna informações de debug do componente
     * @returns {Object} Informações de debug
     */
    getDebugInfo() {
        return {
            id: this.id,
            type: this.constructor.name,
            element: this.element?.tagName,
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            hasEventManager: !!this.eventManager,
            cacheSize: this._cache?.size || 0,
            options: this.options
        };
    }
}

export default BaseComponent;
