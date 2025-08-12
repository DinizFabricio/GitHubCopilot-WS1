/**
 * Main Application Entry Point
 * Integra todos os componentes da nova arquitetura modular
 */

// Imports dos componentes principais
import EventManager from './utils/EventManager.js';
import APIFacade from './utils/APIFacade.js';
import ComponentFactory from './utils/ComponentFactory.js';
import AirQualityController from './controllers/AirQualityController.js';
import ViewManager from './views/ViewManager.js';

// Imports dos serviços
import GeocodingService from './services/GeocodingService.js';
import AirQualityService from './services/AirQualityService.js';
import CacheService from './services/CacheService.js';

// Imports dos componentes de UI
import FormComponent from './views/components/FormComponent.js';
import AQIDisplayComponent from './views/components/AQIDisplayComponent.js';
import LoadingComponent from './views/components/LoadingComponent.js';

/**
 * Aplicação principal modernizada com arquitetura modular
 */
class ModernAirQualityApp {
    constructor() {
        console.log('🚀 Modern Air Quality App: Initializing...');
        
        // Estado da aplicação
        this.state = {
            isInitialized: false,
            currentLocation: null,
            lastQuery: null,
            components: {},
            services: {}
        };

        // Inicialização em fases
        this.initialize();
    }

    /**
     * Inicialização da aplicação
     */
    async initialize() {
        try {
            console.log('📋 Phase 1: Setting up core systems...');
            await this.setupCoreSystem();

            console.log('🔧 Phase 2: Initializing services...');
            await this.initializeServices();

            console.log('🎨 Phase 3: Creating UI components...');
            await this.createComponents();

            console.log('🔗 Phase 4: Connecting event handlers...');
            await this.setupEventHandlers();

            console.log('✅ Phase 5: Final initialization...');
            await this.finalizeInitialization();

            this.state.isInitialized = true;
            console.log('🎉 Modern Air Quality App: Successfully initialized!');

        } catch (error) {
            console.error('❌ Failed to initialize Modern Air Quality App:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Configura sistema principal
     */
    async setupCoreSystem() {
        // Event Manager - central de eventos
        this.eventManager = new EventManager({
            enableDebug: true,
            enablePersistence: false
        });

        // Cache Service
        this.cacheService = new CacheService({
            defaultTTL: 300000, // 5 minutos
            maxEntries: 50
        });

        // API Facade - gerenciamento unificado de APIs
        this.apiFacade = new APIFacade({
            eventManager: this.eventManager,
            cacheService: this.cacheService
        });

        // Component Factory - criação dinâmica de componentes
        this.componentFactory = new ComponentFactory({
            eventManager: this.eventManager
        });

        // View Manager - coordenação de views
        this.viewManager = new ViewManager({
            eventManager: this.eventManager,
            strategy: this.detectViewStrategy()
        });

        console.log('✅ Core system initialized');
    }

    /**
     * Inicializa serviços especializados
     */
    async initializeServices() {
        // Geocoding Service
        this.services.geocoding = new GeocodingService({
            eventManager: this.eventManager,
            cacheService: this.cacheService
        });

        // Air Quality Service
        this.services.airQuality = new AirQualityService({
            eventManager: this.eventManager,
            cacheService: this.cacheService
        });

        // Registra serviços no API Facade
        this.apiFacade.registerService('geocoding', this.services.geocoding);
        this.apiFacade.registerService('airQuality', this.services.airQuality);

        // Air Quality Controller - lógica principal
        this.controller = new AirQualityController({
            eventManager: this.eventManager,
            apiFacade: this.apiFacade,
            cacheService: this.cacheService
        });

        console.log('✅ Services initialized');
    }

    /**
     * Cria componentes de UI
     */
    async createComponents() {
        // Form Component
        const formElement = document.getElementById('formComponent');
        if (formElement) {
            this.components.form = new FormComponent(formElement, {
                eventManager: this.eventManager,
                validation: true,
                realTimeValidation: true,
                autoFocus: true
            });
        }

        // Loading Component
        const loadingElement = document.getElementById('loadingComponent');
        if (loadingElement) {
            this.components.loading = new LoadingComponent(loadingElement, {
                eventManager: this.eventManager,
                type: 'spinner',
                showMessage: true,
                animated: true,
                timeout: 30000
            });
        }

        // AQI Display Component
        const aqiElement = document.getElementById('aqiDisplayComponent');
        if (aqiElement) {
            this.components.aqiDisplay = new AQIDisplayComponent(aqiElement, {
                eventManager: this.eventManager,
                showAnimations: true,
                showHealthRecommendations: true,
                autoRefresh: false
            });
        }

        // Registra componentes no View Manager
        Object.entries(this.components).forEach(([key, component]) => {
            this.viewManager.registerComponent(key, component);
        });

        // Inicializa componentes
        Object.values(this.components).forEach(component => {
            if (component.initialize) {
                component.initialize();
            }
        });

        console.log('✅ UI Components created:', Object.keys(this.components));
    }

    /**
     * Configura manipuladores de eventos
     */
    async setupEventHandlers() {
        // Eventos do formulário
        this.eventManager.subscribe('form:submit', (data) => {
            console.log('📝 Form submitted:', data);
            this.handleFormSubmit(data);
        });

        this.eventManager.subscribe('form:validation:error', (data) => {
            console.log('⚠️ Form validation error:', data);
            this.handleFormValidationError(data);
        });

        // Eventos de dados
        this.eventManager.subscribe('aqi:data:received', (data) => {
            console.log('📊 AQI data received:', data);
            this.handleAQIDataReceived(data);
        });

        this.eventManager.subscribe('aqi:data:error', (error) => {
            console.error('❌ AQI data error:', error);
            this.handleAQIDataError(error);
        });

        // Eventos de loading
        this.eventManager.subscribe('aqi:data:loading', () => {
            this.showLoading('Obtendo dados de qualidade do ar...');
        });

        this.eventManager.subscribe('geocoding:loading', () => {
            this.showLoading('Localizando endereço...');
        });

        // Eventos de localização
        this.eventManager.subscribe('location:found', (location) => {
            console.log('📍 Location found:', location);
            this.state.currentLocation = location;
        });

        this.eventManager.subscribe('location:error', (error) => {
            console.error('❌ Location error:', error);
            this.handleLocationError(error);
        });

        // Eventos de componentes
        this.eventManager.subscribe('component:initialized', (data) => {
            console.log(`🧩 Component initialized: ${data.componentType}`);
        });

        // Eventos do controller
        this.eventManager.subscribe('controller:ready', () => {
            console.log('🎮 Controller is ready');
        });

        // Eventos de erro global
        this.eventManager.subscribe('app:error', (error) => {
            console.error('🚨 Application error:', error);
            this.handleGlobalError(error);
        });

        console.log('✅ Event handlers configured');
    }

    /**
     * Finaliza inicialização
     */
    async finalizeInitialization() {
        // Configura estratégia responsiva
        this.setupResponsiveStrategy();

        // Configura tratamento de erros globais
        this.setupGlobalErrorHandling();

        // Renderiza estado inicial
        this.renderInitialState();

        // Notifica inicialização completa
        this.eventManager.publish('app:initialized', {
            timestamp: Date.now(),
            components: Object.keys(this.components),
            services: Object.keys(this.services)
        });

        console.log('✅ Finalization complete');
    }

    /**
     * Manipula submissão do formulário
     */
    async handleFormSubmit(formData) {
        try {
            this.state.lastQuery = formData;
            
            // Inicia processo de busca via controller
            await this.controller.searchAirQuality({
                city: formData.city,
                state: formData.state,
                country: formData.country || 'USA'
            });

        } catch (error) {
            console.error('❌ Error handling form submit:', error);
            this.eventManager.publish('app:error', { error, context: 'form_submit' });
        }
    }

    /**
     * Manipula erro de validação do formulário
     */
    handleFormValidationError(validationData) {
        // O FormComponent já trata a exibição de erros
        // Aqui podemos adicionar lógica adicional se necessário
        console.log('Form validation failed:', validationData.errors);
    }

    /**
     * Manipula recebimento de dados AQI
     */
    handleAQIDataReceived(data) {
        // Esconde loading
        this.hideLoading();

        // Mostra seção de resultados
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }

        // Os dados são automaticamente exibidos pelo AQIDisplayComponent
        console.log('AQI data processed successfully');
    }

    /**
     * Manipula erro de dados AQI
     */
    handleAQIDataError(error) {
        // Esconde loading
        this.hideLoading();

        // Mostra erro no componente de display
        if (this.components.aqiDisplay) {
            this.components.aqiDisplay.showError(error);
            
            // Mostra seção de resultados mesmo com erro
            const resultsSection = document.querySelector('.results-section');
            if (resultsSection) {
                resultsSection.style.display = 'block';
            }
        }

        console.error('AQI data error handled');
    }

    /**
     * Manipula erro de localização
     */
    handleLocationError(error) {
        this.hideLoading();
        
        // Notifica erro através do sistema de eventos
        this.eventManager.publish('aqi:data:error', {
            message: `Erro de localização: ${error.message || error}`,
            type: 'location_error',
            error
        });
    }

    /**
     * Mostra loading
     */
    showLoading(message = 'Carregando...') {
        if (this.components.loading) {
            this.components.loading.show({ message });
            
            // Mostra seção de loading
            const loadingSection = document.querySelector('.loading-section');
            if (loadingSection) {
                loadingSection.style.display = 'block';
            }
        }
    }

    /**
     * Esconde loading
     */
    hideLoading() {
        if (this.components.loading) {
            this.components.loading.hide();
            
            // Esconde seção de loading
            const loadingSection = document.querySelector('.loading-section');
            if (loadingSection) {
                loadingSection.style.display = 'none';
            }
        }
    }

    /**
     * Detecta estratégia de view baseada no dispositivo
     */
    detectViewStrategy() {
        const width = window.innerWidth;
        
        if (width < 768) {
            return 'mobile';
        } else if (width < 1024) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Configura estratégia responsiva
     */
    setupResponsiveStrategy() {
        // Listener para mudanças de tamanho de tela
        window.addEventListener('resize', () => {
            const newStrategy = this.detectViewStrategy();
            this.viewManager.setStrategy(newStrategy);
        });

        // Configura estratégia inicial
        this.viewManager.setStrategy(this.detectViewStrategy());
    }

    /**
     * Configura tratamento de erros globais
     */
    setupGlobalErrorHandling() {
        // Erros de JavaScript não capturados
        window.addEventListener('error', (event) => {
            console.error('Global JavaScript error:', event.error);
            this.eventManager.publish('app:error', {
                error: event.error,
                context: 'javascript_error',
                filename: event.filename,
                lineno: event.lineno
            });
        });

        // Promises rejeitadas não capturadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.eventManager.publish('app:error', {
                error: event.reason,
                context: 'promise_rejection'
            });
        });
    }

    /**
     * Renderiza estado inicial da aplicação
     */
    renderInitialState() {
        // Esconde seções que devem começar ocultas
        const sectionsToHide = [
            '.loading-section',
            '.results-section',
            '.status-messages'
        ];

        sectionsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Mostra seção do formulário
        const formSection = document.querySelector('.form-section');
        if (formSection) {
            formSection.style.display = 'block';
        }

        // Renderiza componentes iniciais
        Object.values(this.components).forEach(component => {
            if (component.render) {
                component.render();
            }
        });
    }

    /**
     * Manipula erro global da aplicação
     */
    handleGlobalError(errorData) {
        const { error, context } = errorData;
        
        // Log detalhado do erro
        console.error(`Global error in context '${context}':`, error);

        // Esconde loading se ativo
        this.hideLoading();

        // Mostra erro genérico se não foi tratado por componente específico
        if (this.components.aqiDisplay && !this.components.aqiDisplay.state.error) {
            this.components.aqiDisplay.showError({
                message: 'Ocorreu um erro inesperado. Tente novamente.',
                type: 'global_error'
            });

            // Mostra seção de resultados para exibir erro
            const resultsSection = document.querySelector('.results-section');
            if (resultsSection) {
                resultsSection.style.display = 'block';
            }
        }
    }

    /**
     * Manipula erro de inicialização
     */
    handleInitializationError(error) {
        console.error('Initialization failed:', error);
        
        // Fallback para script original se disponível
        if (window.AirQualityApp) {
            console.log('🔄 Falling back to original script...');
            try {
                new window.AirQualityApp();
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                this.showCriticalError();
            }
        } else {
            this.showCriticalError();
        }
    }

    /**
     * Mostra erro crítico quando nada mais funciona
     */
    showCriticalError() {
        const container = document.querySelector('.app-container') || document.body;
        const errorHTML = `
            <div class="critical-error" style="
                padding: 20px; 
                background: #ffebee; 
                border: 2px solid #e53e3e; 
                border-radius: 8px; 
                margin: 20px; 
                text-align: center;
            ">
                <h2 style="color: #e53e3e;">❌ Erro Crítico</h2>
                <p>A aplicação não pôde ser inicializada corretamente.</p>
                <p>Por favor, recarregue a página ou tente novamente mais tarde.</p>
                <button onclick="location.reload()" style="
                    background: #e53e3e; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-top: 10px;
                ">
                    🔄 Recarregar Página
                </button>
            </div>
        `;
        
        container.innerHTML = errorHTML;
    }

    /**
     * Obtém informações de debug da aplicação
     */
    getDebugInfo() {
        return {
            isInitialized: this.state.isInitialized,
            currentLocation: this.state.currentLocation,
            lastQuery: this.state.lastQuery,
            components: Object.keys(this.components),
            services: Object.keys(this.services),
            viewStrategy: this.viewManager?.getCurrentStrategy(),
            eventManagerStats: this.eventManager?.getStats(),
            cacheStats: this.cacheService?.getStats()
        };
    }

    /**
     * Destrói a aplicação
     */
    destroy() {
        console.log('🗑️ Destroying Modern Air Quality App...');

        // Destrói componentes
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });

        // Destrói serviços
        Object.values(this.services).forEach(service => {
            if (service.destroy) {
                service.destroy();
            }
        });

        // Destrói sistemas principais
        if (this.controller?.destroy) this.controller.destroy();
        if (this.viewManager?.destroy) this.viewManager.destroy();
        if (this.apiFacade?.destroy) this.apiFacade.destroy();
        if (this.eventManager?.destroy) this.eventManager.destroy();
        if (this.cacheService?.destroy) this.cacheService.destroy();

        // Limpa estado
        this.state = null;
        this.components = null;
        this.services = null;

        console.log('✅ Modern Air Quality App destroyed');
    }
}

/**
 * Inicialização da aplicação quando DOM estiver carregado
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded, initializing Modern Air Quality App...');
    
    try {
        // Cria instância da aplicação moderna
        window.modernAirQualityApp = new ModernAirQualityApp();
        
        // Mantém referência global para debug
        if (typeof globalThis !== 'undefined') {
            globalThis.app = window.modernAirQualityApp;
        }
        
    } catch (error) {
        console.error('Failed to create Modern Air Quality App:', error);
        
        // Fallback para o script original se disponível
        if (typeof AirQualityApp !== 'undefined') {
            console.log('Falling back to original AirQualityApp...');
            try {
                window.airQualityApp = new AirQualityApp();
            } catch (fallbackError) {
                console.error('Fallback to original script also failed:', fallbackError);
            }
        }
    }
});

// Export para testes
export default ModernAirQualityApp;
