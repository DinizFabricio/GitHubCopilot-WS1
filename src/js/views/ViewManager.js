/**
 * ViewManager - Gerenciador central da interface do usuário
 * Coordena todos os componentes da UI e gerencia estados visuais
 */
import ComponentFactory from '../utils/ComponentFactory.js';
import EventManager from '../utils/EventManager.js';

class ViewManager {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.components = new Map();
        this.currentStrategy = null;
        this.isInitialized = false;
        
        // Estado da UI
        this.uiState = {
            isLoading: false,
            hasResults: false,
            hasError: false,
            currentView: 'form',
            theme: 'auto'
        };

        // Cache de elementos DOM
        this.elements = {};
        
        // Configurações
        this.config = {
            animationDuration: 300,
            autoHideErrors: true,
            errorTimeout: 5000,
            enableAnimations: true,
            responsive: true
        };

        console.log('🎨 ViewManager: Created');
    }

    /**
     * Inicializa o ViewManager e todos os componentes
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ ViewManager: Already initialized');
            return;
        }

        try {
            this._cacheElements();
            this._detectRenderStrategy();
            this._createComponents();
            this._setupEventListeners();
            this._setupResizeHandler();
            this._applyInitialState();
            
            this.isInitialized = true;
            console.log('✅ ViewManager: Initialized successfully');
            
            this.eventManager.publish('view:initialized', {
                strategy: this.currentStrategy?.constructor.name,
                components: Array.from(this.components.keys())
            });

        } catch (error) {
            console.error('❌ ViewManager: Initialization failed', error);
            throw error;
        }
    }

    /**
     * Cacheia elementos DOM importantes
     */
    _cacheElements() {
        const selectors = {
            form: '#airQualityForm',
            loadingSpinner: '#loadingSpinner', 
            resultContainer: '#resultContainer',
            errorContainer: '#errorContainer',
            submitButton: '#submitButton',
            
            // Form inputs
            cityInput: '#city',
            stateInput: '#state', 
            countryInput: '#country',
            
            // Error displays
            cityError: '#cityError',
            stateError: '#stateError',
            
            // Result sections
            locationInfo: '#locationInfo',
            aqiValue: '#aqiValue',
            aqiLabel: '#aqiLabel',
            aqiIndicator: '.aqi-indicator',
            healthRecommendation: '#healthRecommendation',
            pollutantsDetails: '#pollutantsDetails'
        };

        Object.entries(selectors).forEach(([key, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                this.elements[key] = element;
            } else {
                console.warn(`⚠️ ViewManager: Element not found: ${selector}`);
            }
        });

        console.log(`📦 ViewManager: Cached ${Object.keys(this.elements).length} DOM elements`);
    }

    /**
     * Detecta estratégia de renderização baseada no dispositivo
     */
    _detectRenderStrategy() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        const isTouch = 'ontouchstart' in window;

        if (isMobile) {
            this.currentStrategy = new MobileRenderStrategy(this);
        } else if (isTablet) {
            this.currentStrategy = new TabletRenderStrategy(this);
        } else {
            this.currentStrategy = new DesktopRenderStrategy(this);
        }

        console.log(`📱 ViewManager: Using ${this.currentStrategy.constructor.name}`, {
            screenWidth: window.innerWidth,
            isMobile,
            isTablet,
            isTouch
        });
    }

    /**
     * Cria todos os componentes necessários
     */
    _createComponents() {
        const componentConfigs = [
            {
                type: 'form',
                name: 'mainForm',
                element: this.elements.form,
                options: { validation: true, realTimeValidation: true }
            },
            {
                type: 'loading',
                name: 'loadingIndicator', 
                element: this.elements.loadingSpinner,
                options: { type: 'spinner', showProgress: false }
            },
            {
                type: 'error-display',
                name: 'errorDisplay',
                element: this.elements.errorContainer,
                options: { autoHide: this.config.autoHideErrors, timeout: this.config.errorTimeout }
            },
            {
                type: 'aqi-display',
                name: 'aqiDisplay',
                element: this.elements.resultContainer,
                options: { showDetails: true, colorCoding: true }
            }
        ];

        componentConfigs.forEach(config => {
            try {
                if (config.element) {
                    const component = ComponentFactory.createComponent(
                        config.type,
                        config.element,
                        { 
                            ...config.options, 
                            eventManager: this.eventManager,
                            viewManager: this
                        }
                    );
                    
                    this.components.set(config.name, component);
                    console.log(`🔧 ViewManager: Created component '${config.name}' (${config.type})`);
                } else {
                    console.warn(`⚠️ ViewManager: Skipping component '${config.name}' - element not found`);
                }
            } catch (error) {
                console.error(`❌ ViewManager: Failed to create component '${config.name}'`, error);
            }
        });
    }

    /**
     * Configura listeners para eventos da aplicação
     */
    _setupEventListeners() {
        // Loading events
        this.eventManager.subscribe(EventManager.EVENTS.UI_UPDATE_LOADING, (data) => {
            this.setLoadingState(data.isLoading);
        });

        // Result events
        this.eventManager.subscribe(EventManager.EVENTS.UI_SHOW_RESULTS, (data) => {
            this.displayResults(data);
        });

        // Error events
        this.eventManager.subscribe(EventManager.EVENTS.UI_SHOW_ERROR, (data) => {
            this.displayError(data);
        });

        // Clear events
        this.eventManager.subscribe(EventManager.EVENTS.UI_CLEAR_RESULTS, (data) => {
            this.clearResults(data?.type);
        });

        // Form events
        this.eventManager.subscribe('form:validation:result', (data) => {
            this.handleValidationResult(data);
        });

        // Component events
        this.eventManager.subscribe('component:error', (data) => {
            console.error('❌ Component error:', data);
        });

        this.eventManager.subscribe('component:ready', (data) => {
            console.log(`✅ Component ready: ${data.name}`);
        });

        console.log('👂 ViewManager: Event listeners configured');
    }

    /**
     * Configura handler para redimensionamento da tela
     */
    _setupResizeHandler() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this._handleResize();
            }, 250);
        });
    }

    /**
     * Manipula redimensionamento da tela
     */
    _handleResize() {
        const previousStrategy = this.currentStrategy?.constructor.name;
        this._detectRenderStrategy();
        
        if (this.currentStrategy?.constructor.name !== previousStrategy) {
            console.log(`📱 ViewManager: Strategy changed to ${this.currentStrategy.constructor.name}`);
            this._applyRenderStrategy();
        }

        // Notifica componentes sobre resize
        this.components.forEach(component => {
            if (component.onResize) {
                component.onResize(window.innerWidth, window.innerHeight);
            }
        });
    }

    /**
     * Aplica estado inicial da UI
     */
    _applyInitialState() {
        this.setLoadingState(false);
        this.clearResults('all');
        
        // Aplica estratégia inicial
        this._applyRenderStrategy();
        
        // Foca no primeiro campo
        if (this.elements.cityInput) {
            this.elements.cityInput.focus();
        }
    }

    /**
     * Aplica estratégia de renderização atual
     */
    _applyRenderStrategy() {
        if (this.currentStrategy) {
            this.currentStrategy.apply();
        }
    }

    /**
     * Define estado de loading
     * @param {boolean} isLoading - Se está carregando
     */
    setLoadingState(isLoading) {
        this.uiState.isLoading = isLoading;
        
        const loadingComponent = this.components.get('loadingIndicator');
        if (loadingComponent) {
            if (isLoading) {
                loadingComponent.show();
            } else {
                loadingComponent.hide();
            }
        }

        // Desabilita/habilita botão de submit
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = isLoading;
            this.elements.submitButton.textContent = isLoading ? 'Buscando...' : 'Verificar Qualidade do Ar';
        }

        console.log(`⏳ ViewManager: Loading state = ${isLoading}`);
    }

    /**
     * Exibe resultados de qualidade do ar
     * @param {Object} data - Dados dos resultados
     */
    displayResults(data) {
        try {
            this.uiState.hasResults = true;
            this.uiState.currentView = 'results';
            
            // Limpa erros antes de mostrar resultados
            this.clearResults('error');
            
            const aqiComponent = this.components.get('aqiDisplay');
            if (aqiComponent) {
                aqiComponent.render(data);
            } else {
                // Fallback para renderização direta
                this._renderResultsFallback(data);
            }

            // Aplica animação se habilitada
            if (this.config.enableAnimations && this.elements.resultContainer) {
                this._animateIn(this.elements.resultContainer);
            }

            console.log('📊 ViewManager: Results displayed', data);

        } catch (error) {
            console.error('❌ ViewManager: Error displaying results', error);
            this.displayError({
                message: 'Erro ao exibir resultados',
                type: 'render'
            });
        }
    }

    /**
     * Renderização de resultados sem componente (fallback)
     * @param {Object} data - Dados dos resultados
     */
    _renderResultsFallback(data) {
        const { location, airQuality } = data;
        
        // Informações da localização
        if (this.elements.locationInfo) {
            this.elements.locationInfo.textContent = 
                `${location.city}, ${location.state}${location.country ? ', ' + location.country : ''}`;
        }

        // Valor do AQI
        if (this.elements.aqiValue && airQuality.aqi) {
            this.elements.aqiValue.textContent = airQuality.aqi.value || 'N/A';
        }

        // Label do AQI
        if (this.elements.aqiLabel && airQuality.aqi) {
            this.elements.aqiLabel.textContent = airQuality.aqi.description || 'Desconhecido';
        }

        // Indicador visual (cor)
        if (this.elements.aqiIndicator && airQuality.aqi) {
            const indicator = this.elements.aqiIndicator;
            indicator.className = `aqi-indicator ${airQuality.aqi.classification}`;
            indicator.style.backgroundColor = airQuality.aqi.color;
        }

        // Recomendação de saúde
        if (this.elements.healthRecommendation && airQuality.healthRecommendation) {
            this.elements.healthRecommendation.textContent = airQuality.healthRecommendation.general;
        }

        // Mostra container de resultados
        if (this.elements.resultContainer) {
            this.elements.resultContainer.style.display = 'block';
        }
    }

    /**
     * Exibe erro na interface
     * @param {Object} errorData - Dados do erro
     */
    displayError(errorData) {
        this.uiState.hasError = true;
        
        const errorComponent = this.components.get('errorDisplay');
        if (errorComponent) {
            errorComponent.show(errorData);
        } else {
            // Fallback para exibição direta
            this._displayErrorFallback(errorData);
        }

        console.log('❌ ViewManager: Error displayed', errorData);
    }

    /**
     * Exibição de erro sem componente (fallback)
     * @param {Object} errorData - Dados do erro
     */
    _displayErrorFallback(errorData) {
        if (this.elements.errorContainer) {
            this.elements.errorContainer.textContent = errorData.message || 'Erro desconhecido';
            this.elements.errorContainer.style.display = 'block';
            
            // Auto-hide se configurado
            if (this.config.autoHideErrors) {
                setTimeout(() => {
                    this.elements.errorContainer.style.display = 'none';
                }, this.config.errorTimeout);
            }
        }
    }

    /**
     * Limpa resultados ou erros da interface
     * @param {string} type - Tipo a limpar ('results', 'error', 'all')
     */
    clearResults(type = 'all') {
        if (type === 'results' || type === 'all') {
            this.uiState.hasResults = false;
            
            if (this.elements.resultContainer) {
                this.elements.resultContainer.style.display = 'none';
            }
            
            const aqiComponent = this.components.get('aqiDisplay');
            if (aqiComponent && aqiComponent.clear) {
                aqiComponent.clear();
            }
        }

        if (type === 'error' || type === 'all') {
            this.uiState.hasError = false;
            
            if (this.elements.errorContainer) {
                this.elements.errorContainer.style.display = 'none';
            }
            
            const errorComponent = this.components.get('errorDisplay');
            if (errorComponent && errorComponent.hide) {
                errorComponent.hide();
            }
        }

        if (type === 'all') {
            this.uiState.currentView = 'form';
        }

        console.log(`🧹 ViewManager: Cleared ${type}`);
    }

    /**
     * Manipula resultado de validação do formulário
     * @param {Object} validationResult - Resultado da validação
     */
    handleValidationResult(validationResult) {
        const formComponent = this.components.get('mainForm');
        if (formComponent && formComponent.handleValidation) {
            formComponent.handleValidation(validationResult);
        } else {
            // Fallback para validação direta
            this._handleValidationFallback(validationResult);
        }
    }

    /**
     * Manipulação de validação sem componente (fallback)
     * @param {Object} validationResult - Resultado da validação
     */
    _handleValidationFallback(validationResult) {
        // Limpa erros anteriores
        [this.elements.cityError, this.elements.stateError].forEach(element => {
            if (element) {
                element.style.display = 'none';
                element.textContent = '';
            }
        });

        // Exibe novos erros se houver
        if (!validationResult.isValid) {
            validationResult.errors.forEach(error => {
                if (error.includes('Cidade') && this.elements.cityError) {
                    this.elements.cityError.textContent = error;
                    this.elements.cityError.style.display = 'block';
                } else if (error.includes('Estado') && this.elements.stateError) {
                    this.elements.stateError.textContent = error;
                    this.elements.stateError.style.display = 'block';
                }
            });
        }
    }

    /**
     * Animação de entrada para elementos
     * @param {HTMLElement} element - Elemento para animar
     */
    _animateIn(element) {
        if (!element || !this.config.enableAnimations) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = `all ${this.config.animationDuration}ms ease-out`;
        
        // Força reflow
        element.offsetHeight;
        
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }

    /**
     * Obtém componente por nome
     * @param {string} name - Nome do componente
     * @returns {Object|null} Componente ou null se não encontrado
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Obtém estado atual da UI
     * @returns {Object} Estado da UI
     */
    getUIState() {
        return { ...this.uiState };
    }

    /**
     * Aplica tema na interface
     * @param {string} theme - Nome do tema ('light', 'dark', 'auto')
     */
    setTheme(theme) {
        this.uiState.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        this.eventManager.publish('view:theme:changed', { theme });
        console.log(`🎨 ViewManager: Theme changed to ${theme}`);
    }

    /**
     * Configura opções do ViewManager
     * @param {Object} options - Novas configurações
     */
    configure(options) {
        this.config = { ...this.config, ...options };
        console.log('⚙️ ViewManager: Configuration updated', this.config);
    }

    /**
     * Destrói o ViewManager e limpa recursos
     */
    destroy() {
        // Destrói todos os componentes
        this.components.forEach((component, name) => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
        
        // Limpa cache de elementos
        this.elements = {};
        
        // Remove listeners se necessário
        window.removeEventListener('resize', this._handleResize);
        
        this.isInitialized = false;
        console.log('🎨 ViewManager: Destroyed');
    }
}

/**
 * Estratégias de renderização para diferentes dispositivos
 */

class RenderStrategy {
    constructor(viewManager) {
        this.viewManager = viewManager;
    }

    apply() {
        throw new Error('RenderStrategy.apply() must be implemented');
    }
}

class DesktopRenderStrategy extends RenderStrategy {
    apply() {
        document.body.classList.add('desktop-layout');
        document.body.classList.remove('mobile-layout', 'tablet-layout');
        
        // Configurações específicas para desktop
        this.viewManager.configure({
            animationDuration: 300,
            enableAnimations: true
        });
    }
}

class TabletRenderStrategy extends RenderStrategy {
    apply() {
        document.body.classList.add('tablet-layout');
        document.body.classList.remove('desktop-layout', 'mobile-layout');
        
        // Configurações específicas para tablet
        this.viewManager.configure({
            animationDuration: 250,
            enableAnimations: true
        });
    }
}

class MobileRenderStrategy extends RenderStrategy {
    apply() {
        document.body.classList.add('mobile-layout');
        document.body.classList.remove('desktop-layout', 'tablet-layout');
        
        // Configurações específicas para mobile
        this.viewManager.configure({
            animationDuration: 200,
            enableAnimations: window.innerWidth > 480, // Menos animações em telas muito pequenas
            autoHideErrors: true,
            errorTimeout: 4000 // Timeout menor em mobile
        });
    }
}

export default ViewManager;
export { RenderStrategy, DesktopRenderStrategy, TabletRenderStrategy, MobileRenderStrategy };
