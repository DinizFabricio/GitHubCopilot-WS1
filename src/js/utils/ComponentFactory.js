/**
 * ComponentFactory - Factory Pattern para criação de componentes de UI
 * Centraliza a criação e configuração de todos os componentes da interface
 */
import FormComponent from '../views/components/FormComponent.js';
import AQIDisplayComponent from '../views/components/AQIDisplayComponent.js';
import LoadingComponent from '../views/components/LoadingComponent.js';
import ErrorDisplayComponent from '../views/components/ErrorDisplayComponent.js';
import ResultsComponent from '../views/components/ResultsComponent.js';
import PollutantCardComponent from '../views/components/PollutantCardComponent.js';
import HealthRecommendationComponent from '../views/components/HealthRecommendationComponent.js';

class ComponentFactory {
    /**
     * Tipos de componentes suportados
     */
    static COMPONENT_TYPES = {
        FORM: 'form',
        AQI_DISPLAY: 'aqi-display',
        LOADING: 'loading',
        ERROR_DISPLAY: 'error-display',
        RESULTS: 'results',
        POLLUTANT_CARD: 'pollutant-card',
        HEALTH_RECOMMENDATION: 'health-recommendation'
    };

    /**
     * Registro de componentes customizados
     */
    static customComponents = new Map();

    /**
     * Cria componente baseado no tipo
     * @param {string} type - Tipo do componente
     * @param {HTMLElement} element - Elemento DOM do componente
     * @param {Object} options - Opções de configuração
     * @returns {Object} Instância do componente
     */
    static createComponent(type, element, options = {}) {
        try {
            console.log(`🏭 ComponentFactory: Creating ${type} component`);

            // Verifica se é um componente customizado
            if (this.customComponents.has(type)) {
                const CustomComponent = this.customComponents.get(type);
                return new CustomComponent(element, options);
            }

            // Cria componente padrão baseado no tipo
            switch (type) {
                case this.COMPONENT_TYPES.FORM:
                    return new FormComponent(element, options);

                case this.COMPONENT_TYPES.AQI_DISPLAY:
                    return new AQIDisplayComponent(element, options);

                case this.COMPONENT_TYPES.LOADING:
                    return new LoadingComponent(element, options);

                case this.COMPONENT_TYPES.ERROR_DISPLAY:
                    return new ErrorDisplayComponent(element, options);

                case this.COMPONENT_TYPES.RESULTS:
                    return new ResultsComponent(element, options);

                case this.COMPONENT_TYPES.POLLUTANT_CARD:
                    return new PollutantCardComponent(element, options);

                case this.COMPONENT_TYPES.HEALTH_RECOMMENDATION:
                    return new HealthRecommendationComponent(element, options);

                default:
                    throw new ComponentCreationError(`Unknown component type: ${type}`);
            }

        } catch (error) {
            console.error(`❌ ComponentFactory: Failed to create ${type} component`, error);
            
            // Retorna componente fallback em caso de erro
            if (options.allowFallback !== false) {
                return this._createFallbackComponent(element, options, error);
            }
            
            throw error;
        }
    }

    /**
     * Cria múltiplos componentes de uma vez
     * @param {Array} componentConfigs - Array de configurações de componentes
     * @returns {Map} Mapa de componentes criados
     */
    static createComponents(componentConfigs) {
        const components = new Map();
        const errors = [];

        componentConfigs.forEach(config => {
            try {
                const component = this.createComponent(
                    config.type,
                    config.element,
                    config.options
                );
                
                components.set(config.name || config.type, component);
                console.log(`✅ ComponentFactory: Created ${config.name || config.type}`);

            } catch (error) {
                console.error(`❌ ComponentFactory: Failed to create ${config.name || config.type}`, error);
                errors.push({ config, error });
            }
        });

        if (errors.length > 0) {
            console.warn(`⚠️ ComponentFactory: ${errors.length} components failed to create`, errors);
        }

        return { components, errors };
    }

    /**
     * Registra componente customizado
     * @param {string} type - Tipo do componente
     * @param {Function} ComponentClass - Classe do componente
     * @param {Object} metadata - Metadados do componente
     */
    static registerComponent(type, ComponentClass, metadata = {}) {
        if (typeof ComponentClass !== 'function') {
            throw new Error('Component must be a constructor function or class');
        }

        // Valida se o componente implementa interface mínima
        if (!this._validateComponentInterface(ComponentClass)) {
            console.warn(`⚠️ ComponentFactory: Component ${type} may not implement required interface`);
        }

        this.customComponents.set(type, ComponentClass);
        
        console.log(`🔧 ComponentFactory: Registered custom component '${type}'`, metadata);
    }

    /**
     * Remove componente customizado
     * @param {string} type - Tipo do componente
     * @returns {boolean} True se removido com sucesso
     */
    static unregisterComponent(type) {
        const removed = this.customComponents.delete(type);
        
        if (removed) {
            console.log(`🗑️ ComponentFactory: Unregistered component '${type}'`);
        }
        
        return removed;
    }

    /**
     * Lista todos os tipos de componentes disponíveis
     * @returns {Array} Array com tipos disponíveis
     */
    static getAvailableTypes() {
        const standardTypes = Object.values(this.COMPONENT_TYPES);
        const customTypes = Array.from(this.customComponents.keys());
        
        return [...standardTypes, ...customTypes];
    }

    /**
     * Verifica se um tipo de componente está disponível
     * @param {string} type - Tipo do componente
     * @returns {boolean} True se disponível
     */
    static isTypeAvailable(type) {
        return this.getAvailableTypes().includes(type);
    }

    /**
     * Cria componente baseado no elemento DOM (auto-detecção)
     * @param {HTMLElement} element - Elemento DOM
     * @param {Object} options - Opções de configuração
     * @returns {Object|null} Componente ou null se não detectado
     */
    static createFromElement(element, options = {}) {
        if (!element) {
            return null;
        }

        // Detecção baseada em atributos data-component
        const componentType = element.getAttribute('data-component');
        if (componentType && this.isTypeAvailable(componentType)) {
            return this.createComponent(componentType, element, options);
        }

        // Detecção baseada no ID do elemento
        const autoDetectedType = this._detectTypeFromElement(element);
        if (autoDetectedType) {
            return this.createComponent(autoDetectedType, element, options);
        }

        console.warn('⚠️ ComponentFactory: Could not auto-detect component type', element);
        return null;
    }

    /**
     * Detecta tipo do componente baseado no elemento
     * @param {HTMLElement} element - Elemento DOM
     * @returns {string|null} Tipo detectado ou null
     */
    static _detectTypeFromElement(element) {
        const id = element.id;
        const classList = Array.from(element.classList);
        const tagName = element.tagName.toLowerCase();

        // Detecção por ID
        if (id) {
            if (id.includes('form')) return this.COMPONENT_TYPES.FORM;
            if (id.includes('loading') || id.includes('spinner')) return this.COMPONENT_TYPES.LOADING;
            if (id.includes('error')) return this.COMPONENT_TYPES.ERROR_DISPLAY;
            if (id.includes('result')) return this.COMPONENT_TYPES.RESULTS;
            if (id.includes('aqi')) return this.COMPONENT_TYPES.AQI_DISPLAY;
        }

        // Detecção por classes
        const classString = classList.join(' ');
        if (classString.includes('form')) return this.COMPONENT_TYPES.FORM;
        if (classString.includes('loading')) return this.COMPONENT_TYPES.LOADING;
        if (classString.includes('error')) return this.COMPONENT_TYPES.ERROR_DISPLAY;
        if (classString.includes('aqi')) return this.COMPONENT_TYPES.AQI_DISPLAY;

        // Detecção por tag
        if (tagName === 'form') return this.COMPONENT_TYPES.FORM;

        return null;
    }

    /**
     * Cria componente fallback em caso de erro
     * @param {HTMLElement} element - Elemento DOM
     * @param {Object} options - Opções originais
     * @param {Error} error - Erro que causou o fallback
     * @returns {Object} Componente fallback
     */
    static _createFallbackComponent(element, options, error) {
        console.warn('⚠️ ComponentFactory: Creating fallback component', { element, error });

        return new FallbackComponent(element, { ...options, originalError: error });
    }

    /**
     * Valida se componente implementa interface mínima
     * @param {Function} ComponentClass - Classe do componente
     * @returns {boolean} True se válido
     */
    static _validateComponentInterface(ComponentClass) {
        const prototype = ComponentClass.prototype;
        const requiredMethods = ['render', 'destroy'];
        
        return requiredMethods.every(method => 
            typeof prototype[method] === 'function'
        );
    }

    /**
     * Cria componente com configuração padrão baseada no tipo
     * @param {string} type - Tipo do componente
     * @param {HTMLElement} element - Elemento DOM
     * @returns {Object} Componente com configuração padrão
     */
    static createWithDefaults(type, element) {
        const defaultConfigs = {
            [this.COMPONENT_TYPES.FORM]: {
                validation: true,
                realTimeValidation: true,
                submitOnEnter: true
            },
            [this.COMPONENT_TYPES.AQI_DISPLAY]: {
                showDetails: true,
                colorCoding: true,
                animate: true
            },
            [this.COMPONENT_TYPES.LOADING]: {
                type: 'spinner',
                showProgress: false,
                message: 'Carregando...'
            },
            [this.COMPONENT_TYPES.ERROR_DISPLAY]: {
                autoHide: true,
                timeout: 5000,
                allowRetry: true
            },
            [this.COMPONENT_TYPES.RESULTS]: {
                expandable: true,
                showTimestamp: true
            }
        };

        const config = defaultConfigs[type] || {};
        return this.createComponent(type, element, config);
    }

    /**
     * Obtém metadados de um tipo de componente
     * @param {string} type - Tipo do componente
     * @returns {Object} Metadados do componente
     */
    static getComponentMetadata(type) {
        const metadata = {
            [this.COMPONENT_TYPES.FORM]: {
                description: 'Formulário de entrada para busca de qualidade do ar',
                requiredElements: ['input[name="city"]', 'input[name="state"]'],
                optionalElements: ['input[name="country"]', 'button[type="submit"]'],
                events: ['form:submit', 'form:validate', 'form:clear']
            },
            [this.COMPONENT_TYPES.AQI_DISPLAY]: {
                description: 'Exibição principal dos dados de qualidade do ar',
                requiredElements: ['.aqi-value', '.aqi-label'],
                optionalElements: ['.aqi-indicator', '.health-recommendation'],
                events: ['aqi:rendered', 'aqi:updated']
            },
            [this.COMPONENT_TYPES.LOADING]: {
                description: 'Indicador de carregamento',
                requiredElements: [],
                optionalElements: ['.spinner', '.progress-bar'],
                events: ['loading:start', 'loading:end']
            },
            [this.COMPONENT_TYPES.ERROR_DISPLAY]: {
                description: 'Exibição de erros e mensagens',
                requiredElements: ['.error-message'],
                optionalElements: ['.error-retry', '.error-close'],
                events: ['error:shown', 'error:hidden', 'error:retry']
            }
        };

        return metadata[type] || { description: 'Componente customizado' };
    }

    /**
     * Valida se elemento é adequado para o tipo de componente
     * @param {HTMLElement} element - Elemento DOM
     * @param {string} type - Tipo do componente
     * @returns {Object} Resultado da validação
     */
    static validateElementForType(element, type) {
        const metadata = this.getComponentMetadata(type);
        const result = {
            isValid: true,
            warnings: [],
            errors: []
        };

        if (!element) {
            result.isValid = false;
            result.errors.push('Element is null or undefined');
            return result;
        }

        // Verifica elementos obrigatórios
        if (metadata.requiredElements) {
            metadata.requiredElements.forEach(selector => {
                if (!element.querySelector(selector)) {
                    result.warnings.push(`Missing recommended element: ${selector}`);
                }
            });
        }

        return result;
    }
}

/**
 * Componente fallback básico
 */
class FallbackComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;
        this.isDestroyed = false;
        
        console.warn('⚠️ FallbackComponent: Created fallback component', {
            element: element?.id || element?.className,
            originalError: options.originalError?.message
        });
    }

    render(data) {
        if (this.isDestroyed || !this.element) return;
        
        this.element.innerHTML = `
            <div class="fallback-component">
                <p>⚠️ Componente não disponível</p>
                ${this.options.originalError ? 
                    `<small>Erro: ${this.options.originalError.message}</small>` : 
                    ''
                }
            </div>
        `;
    }

    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    clear() {
        if (this.element) {
            this.element.innerHTML = '';
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.element = null;
        this.options = null;
    }
}

/**
 * Erro específico para criação de componentes
 */
class ComponentCreationError extends Error {
    constructor(message, componentType = null) {
        super(message);
        this.name = 'ComponentCreationError';
        this.componentType = componentType;
    }
}

export default ComponentFactory;
export { ComponentCreationError, FallbackComponent };
