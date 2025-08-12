/**
 * AirQualityController - Controller principal da aplicação
 * Implementa padrão MVC e coordena todos os componentes
 */
import EventManager from '../utils/EventManager.js';
import { APIFacade } from '../services/APIFacade.js';
import { GeocodingService } from '../services/GeocodingService.js';
import { AirQualityService } from '../services/AirQualityService.js';
import CacheService from '../services/CacheService.js';
import ViewManager from '../views/ViewManager.js';
import { SearchCommand } from '../utils/CommandManager.js';

class AirQualityController {
    constructor() {
        // Inicialização dos componentes principais
        this.eventManager = new EventManager();
        this.cacheService = new CacheService();
        this.apiFacade = new APIFacade(this.eventManager);
        this.viewManager = new ViewManager(this.eventManager);
        
        // Histórico de comandos para undo/redo
        this.commandHistory = [];
        this.currentCommandIndex = -1;
        
        // Estado da aplicação
        this.state = {
            isLoading: false,
            currentSearch: null,
            lastResult: null,
            searchHistory: [],
            errors: []
        };

        // Inicialização
        this._initializeServices();
        this._initializeEventListeners();
        this._initializeUI();
        
        console.log('🎮 AirQualityController: Initialized successfully');
    }

    /**
     * Inicializa os serviços com o EventManager
     */
    _initializeServices() {
        // Injeta dependências nos serviços
        this.apiFacade.geocodingService = new GeocodingService();
        this.apiFacade.airQualityService = new AirQualityService();
        this.apiFacade.cacheService = this.cacheService;
        
        // Configura debug em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
            this.eventManager.setDebug(true);
        }
    }

    /**
     * Configura todos os event listeners da aplicação
     */
    _initializeEventListeners() {
        // Form events
        this.eventManager.subscribe(EventManager.EVENTS.FORM_SUBMIT, (data) => {
            this._handleFormSubmit(data);
        });

        this.eventManager.subscribe(EventManager.EVENTS.FORM_VALIDATE, (data) => {
            this._handleFormValidation(data);
        });

        this.eventManager.subscribe(EventManager.EVENTS.FORM_CLEAR, () => {
            this._handleFormClear();
        });

        // API events
        this.eventManager.subscribe(EventManager.EVENTS.API_LOADING_START, () => {
            this._handleLoadingStart();
        });

        this.eventManager.subscribe(EventManager.EVENTS.API_LOADING_END, () => {
            this._handleLoadingEnd();
        });

        this.eventManager.subscribe(EventManager.EVENTS.API_SUCCESS, (data) => {
            this._handleAPISuccess(data);
        });

        this.eventManager.subscribe(EventManager.EVENTS.API_ERROR, (errorData) => {
            this._handleAPIError(errorData);
        });

        // Search events
        this.eventManager.subscribe(EventManager.EVENTS.SEARCH_SUCCESS, (result) => {
            this._handleSearchSuccess(result);
        });

        this.eventManager.subscribe(EventManager.EVENTS.SEARCH_ERROR, (error) => {
            this._handleSearchError(error);
        });

        // UI events
        this.eventManager.subscribe('ui:action:retry', () => {
            this._handleRetry();
        });

        this.eventManager.subscribe('ui:action:clear-history', () => {
            this._handleClearHistory();
        });

        this.eventManager.subscribe('ui:action:toggle-details', (data) => {
            this._handleToggleDetails(data);
        });

        // Cache events
        this.eventManager.subscribe(EventManager.EVENTS.DATA_CACHED, (data) => {
            console.log('💾 Data cached:', data);
        });

        // Window/App events
        window.addEventListener('beforeunload', () => {
            this._handleBeforeUnload();
        });

        // Error handling global
        window.addEventListener('error', (event) => {
            this._handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this._handleUnhandledRejection(event.reason);
        });
    }

    /**
     * Inicializa a interface do usuário
     */
    _initializeUI() {
        // Aguarda DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._setupUI();
            });
        } else {
            this._setupUI();
        }
    }

    /**
     * Configura elementos da UI após DOM ready
     */
    _setupUI() {
        this.viewManager.initialize();
        
        // Testa health das APIs em background
        this._performHealthCheck();
        
        // Carrega histórico do LocalStorage
        this._loadSearchHistory();

        console.log('🎨 UI initialized successfully');
    }

    /**
     * Manipula submissão do formulário
     * @param {Object} formData - Dados do formulário
     */
    async _handleFormSubmit(formData) {
        try {
            console.log('📝 Form submitted:', formData);
            
            // Valida dados antes de prosseguir
            const validation = this._validateFormData(formData);
            if (!validation.isValid) {
                this.eventManager.publish(EventManager.EVENTS.UI_SHOW_ERROR, {
                    message: validation.errors.join(', '),
                    type: 'validation'
                });
                return;
            }

            // Cria comando de busca
            const searchCommand = new SearchCommand(formData, this.apiFacade);
            
            // Adiciona ao histórico de comandos
            this._addCommand(searchCommand);
            
            // Executa busca
            this.state.currentSearch = formData;
            await this._executeCurrentCommand();

        } catch (error) {
            console.error('❌ Error handling form submit:', error);
            this.eventManager.publish(EventManager.EVENTS.SEARCH_ERROR, error);
        }
    }

    /**
     * Executa o comando atual
     */
    async _executeCurrentCommand() {
        if (this.currentCommandIndex < 0 || this.currentCommandIndex >= this.commandHistory.length) {
            return;
        }

        const command = this.commandHistory[this.currentCommandIndex];
        
        try {
            this.eventManager.publish(EventManager.EVENTS.SEARCH_START, command.searchParams);
            
            const result = await command.execute();
            
            this.eventManager.publish(EventManager.EVENTS.SEARCH_SUCCESS, result);
            
        } catch (error) {
            this.eventManager.publish(EventManager.EVENTS.SEARCH_ERROR, error);
        }
    }

    /**
     * Adiciona comando ao histórico
     * @param {SearchCommand} command - Comando a ser adicionado
     */
    _addCommand(command) {
        // Remove comandos após o índice atual (se houver)
        this.commandHistory = this.commandHistory.slice(0, this.currentCommandIndex + 1);
        
        // Adiciona novo comando
        this.commandHistory.push(command);
        this.currentCommandIndex = this.commandHistory.length - 1;
        
        // Limita tamanho do histórico
        const maxHistory = 10;
        if (this.commandHistory.length > maxHistory) {
            this.commandHistory = this.commandHistory.slice(-maxHistory);
            this.currentCommandIndex = this.commandHistory.length - 1;
        }
    }

    /**
     * Valida dados do formulário
     * @param {Object} formData - Dados para validar
     * @returns {Object} Resultado da validação
     */
    _validateFormData(formData) {
        const errors = [];
        
        if (!formData.city || formData.city.trim().length < 2) {
            errors.push('Cidade deve ter pelo menos 2 caracteres');
        }
        
        if (!formData.state || formData.state.trim().length < 2) {
            errors.push('Estado deve ter pelo menos 2 caracteres');
        }
        
        // Validação de caracteres especiais
        const invalidChars = /[0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./]/;
        if (invalidChars.test(formData.city)) {
            errors.push('Cidade contém caracteres inválidos');
        }
        
        if (invalidChars.test(formData.state)) {
            errors.push('Estado contém caracteres inválidos');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Manipula início de loading
     */
    _handleLoadingStart() {
        this.state.isLoading = true;
        this.eventManager.publish(EventManager.EVENTS.UI_UPDATE_LOADING, { isLoading: true });
    }

    /**
     * Manipula fim de loading
     */
    _handleLoadingEnd() {
        this.state.isLoading = false;
        this.eventManager.publish(EventManager.EVENTS.UI_UPDATE_LOADING, { isLoading: false });
    }

    /**
     * Manipula sucesso da API
     * @param {Object} data - Dados retornados da API
     */
    _handleAPISuccess(data) {
        this.state.lastResult = data;
        this.state.errors = [];
        
        // Adiciona ao histórico de buscas
        this._addToSearchHistory(data);
        
        console.log('✅ API success:', data);
    }

    /**
     * Manipula erro da API
     * @param {Object} errorData - Dados do erro
     */
    _handleAPIError(errorData) {
        const error = errorData.error;
        this.state.errors.push(error);
        
        let userMessage = 'Erro ao buscar dados de qualidade do ar';
        
        // Personaliza mensagem baseada no tipo de erro
        if (error.name === 'LocationNotFoundError') {
            userMessage = 'Localização não encontrada. Verifique se cidade, estado e país estão corretos.';
        } else if (error.name === 'AirQualityDataError') {
            userMessage = 'Dados de qualidade do ar não disponíveis para esta localização.';
        } else if (error.name === 'APIError') {
            userMessage = 'Erro de conexão com o serviço. Tente novamente em alguns minutos.';
        }
        
        this.eventManager.publish(EventManager.EVENTS.UI_SHOW_ERROR, {
            message: userMessage,
            type: 'api',
            canRetry: true
        });
        
        console.error('❌ API error:', errorData);
    }

    /**
     * Manipula sucesso da busca
     * @param {Object} result - Resultado da busca
     */
    _handleSearchSuccess(result) {
        this.eventManager.publish(EventManager.EVENTS.UI_SHOW_RESULTS, result);
        this.eventManager.publish(EventManager.EVENTS.UI_CLEAR_RESULTS, { type: 'error' });
    }

    /**
     * Manipula erro da busca
     * @param {Error} error - Erro ocorrido
     */
    _handleSearchError(error) {
        console.error('❌ Search error:', error);
        this.eventManager.publish(EventManager.EVENTS.API_ERROR, { error });
    }

    /**
     * Adiciona busca ao histórico
     * @param {Object} data - Dados da busca bem-sucedida
     */
    _addToSearchHistory(data) {
        const historyItem = {
            id: Date.now().toString(),
            searchParams: this.state.currentSearch,
            result: data,
            timestamp: new Date().toISOString()
        };
        
        // Remove duplicatas baseadas na localização
        this.state.searchHistory = this.state.searchHistory.filter(item => {
            const currentLocation = `${data.location.city}-${data.location.state}-${data.location.country}`;
            const itemLocation = `${item.result.location.city}-${item.result.location.state}-${item.result.location.country}`;
            return itemLocation !== currentLocation;
        });
        
        // Adiciona no início
        this.state.searchHistory.unshift(historyItem);
        
        // Limita histórico
        this.state.searchHistory = this.state.searchHistory.slice(0, 20);
        
        // Salva no LocalStorage
        this._saveSearchHistory();
    }

    /**
     * Carrega histórico do LocalStorage
     */
    _loadSearchHistory() {
        try {
            const stored = localStorage.getItem('air_quality_search_history');
            if (stored) {
                this.state.searchHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('⚠️ Could not load search history:', error);
        }
    }

    /**
     * Salva histórico no LocalStorage
     */
    _saveSearchHistory() {
        try {
            localStorage.setItem('air_quality_search_history', JSON.stringify(this.state.searchHistory));
        } catch (error) {
            console.warn('⚠️ Could not save search history:', error);
        }
    }

    /**
     * Manipula retry de operação
     */
    async _handleRetry() {
        if (this.state.currentSearch) {
            await this._executeCurrentCommand();
        }
    }

    /**
     * Limpa histórico de buscas
     */
    _handleClearHistory() {
        this.state.searchHistory = [];
        this._saveSearchHistory();
        this.eventManager.publish('ui:history:cleared');
    }

    /**
     * Toggle de detalhes na UI
     * @param {Object} data - Dados do toggle
     */
    _handleToggleDetails(data) {
        // Implementação específica para toggle de detalhes
        console.log('🔄 Toggle details:', data);
    }

    /**
     * Testa saúde das APIs
     */
    async _performHealthCheck() {
        try {
            console.log('🏥 Performing health check...');
            const health = await this.apiFacade.healthCheck();
            console.log('🏥 Health check results:', health);
            
            // Notifica problemas de conectividade
            const issues = Object.entries(health).filter(([, status]) => status.status !== 'ok');
            if (issues.length > 0) {
                console.warn('⚠️ API connectivity issues detected:', issues);
            }
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
        }
    }

    /**
     * Manipula validação do formulário
     * @param {Object} data - Dados de validação
     */
    _handleFormValidation(data) {
        const validation = this._validateFormData(data);
        this.eventManager.publish('form:validation:result', validation);
    }

    /**
     * Limpa formulário
     */
    _handleFormClear() {
        this.state.currentSearch = null;
        this.state.lastResult = null;
        this.eventManager.publish(EventManager.EVENTS.UI_CLEAR_RESULTS, { type: 'all' });
    }

    /**
     * Manipula antes do unload da página
     */
    _handleBeforeUnload() {
        // Salva estado atual
        this._saveSearchHistory();
        
        // Limpa timers/recursos se necessário
        if (this.cacheService) {
            this.cacheService.destroy();
        }
    }

    /**
     * Manipula erros globais
     * @param {Error} error - Erro global
     */
    _handleGlobalError(error) {
        console.error('🌍 Global error:', error);
        this.eventManager.publish(EventManager.EVENTS.UI_SHOW_ERROR, {
            message: 'Erro inesperado na aplicação',
            type: 'system'
        });
    }

    /**
     * Manipula promises rejeitadas não capturadas
     * @param {*} reason - Razão da rejeição
     */
    _handleUnhandledRejection(reason) {
        console.error('🌍 Unhandled promise rejection:', reason);
        this.eventManager.publish(EventManager.EVENTS.UI_SHOW_ERROR, {
            message: 'Erro de processamento assíncrono',
            type: 'async'
        });
    }

    /**
     * Obtém estado atual da aplicação
     * @returns {Object} Estado da aplicação
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Obtém estatísticas da aplicação
     * @returns {Promise<Object>} Estatísticas detalhadas
     */
    async getStats() {
        const cacheStats = await this.cacheService.getStats();
        const eventStats = this.eventManager.getStats();
        
        return {
            state: this.getState(),
            cache: cacheStats,
            events: eventStats,
            commandHistory: {
                total: this.commandHistory.length,
                currentIndex: this.currentCommandIndex
            }
        };
    }

    /**
     * Destrói o controller e limpa recursos
     */
    destroy() {
        this.eventManager.clearAll();
        this.cacheService.destroy();
        this.commandHistory = [];
        console.log('🎮 AirQualityController: Destroyed');
    }
}

export default AirQualityController;
