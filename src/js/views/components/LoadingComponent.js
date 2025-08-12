/**
 * LoadingComponent - Componente para exibição de estados de carregamento
 * Implementa diferentes estilos de loading com animações
 */
import BaseComponent from './BaseComponent.js';

class LoadingComponent extends BaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        // Configurações padrão
        this.config = {
            type: 'spinner', // spinner, dots, bar, skeleton, pulse
            message: 'Carregando...',
            showMessage: true,
            overlay: false,
            size: 'medium', // small, medium, large
            theme: 'light', // light, dark, auto
            timeout: 30000, // 30 segundos
            showProgress: false,
            animated: true,
            ...options
        };

        // Estado do loading
        this.state = {
            isActive: false,
            startTime: null,
            progress: 0,
            timeoutId: null,
            currentMessage: this.config.message
        };

        // Templates de loading
        this.templates = {};

        // Inicialização
        this._initializeTemplates();
        this._setupEventListeners();
        
        console.log('⏳ LoadingComponent: Initialized');
    }

    /**
     * Inicializa templates de loading
     */
    _initializeTemplates() {
        this.templates = {
            spinner: this._createSpinnerTemplate(),
            dots: this._createDotsTemplate(),
            bar: this._createBarTemplate(),
            skeleton: this._createSkeletonTemplate(),
            pulse: this._createPulseTemplate()
        };

        console.log('⏳ LoadingComponent: Templates initialized');
    }

    /**
     * Configura event listeners
     */
    _setupEventListeners() {
        // Eventos de loading
        this.eventManager?.subscribe('loading:start', (data) => {
            this.show(data);
        });

        this.eventManager?.subscribe('loading:stop', () => {
            this.hide();
        });

        this.eventManager?.subscribe('loading:progress', (progress) => {
            this.updateProgress(progress);
        });

        this.eventManager?.subscribe('loading:message', (message) => {
            this.updateMessage(message);
        });

        // Eventos específicos de AQI
        this.eventManager?.subscribe('aqi:data:loading', () => {
            this.show({ message: 'Obtendo dados de qualidade do ar...', type: 'spinner' });
        });

        this.eventManager?.subscribe('geocoding:loading', () => {
            this.show({ message: 'Localizando endereço...', type: 'dots' });
        });

        this.eventManager?.subscribe('form:submit', () => {
            this.show({ message: 'Verificando qualidade do ar...', type: 'bar', showProgress: true });
        });
    }

    /**
     * Cria template de spinner
     * @returns {string} Template HTML
     */
    _createSpinnerTemplate() {
        return `
            <div class="loading-container spinner-container">
                <div class="spinner-wrapper">
                    <div class="spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                </div>
                {{message}}
                {{progress}}
            </div>
        `;
    }

    /**
     * Cria template de dots
     * @returns {string} Template HTML
     */
    _createDotsTemplate() {
        return `
            <div class="loading-container dots-container">
                <div class="dots-wrapper">
                    <div class="dots">
                        <div class="dot dot-1"></div>
                        <div class="dot dot-2"></div>
                        <div class="dot dot-3"></div>
                        <div class="dot dot-4"></div>
                        <div class="dot dot-5"></div>
                    </div>
                </div>
                {{message}}
                {{progress}}
            </div>
        `;
    }

    /**
     * Cria template de barra
     * @returns {string} Template HTML
     */
    _createBarTemplate() {
        return `
            <div class="loading-container bar-container">
                <div class="bar-wrapper">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        <div class="progress-glow"></div>
                    </div>
                </div>
                {{message}}
                {{progress}}
            </div>
        `;
    }

    /**
     * Cria template de skeleton
     * @returns {string} Template HTML
     */
    _createSkeletonTemplate() {
        return `
            <div class="loading-container skeleton-container">
                <div class="skeleton-wrapper">
                    <div class="skeleton-item skeleton-header"></div>
                    <div class="skeleton-item skeleton-line skeleton-line-long"></div>
                    <div class="skeleton-item skeleton-line skeleton-line-medium"></div>
                    <div class="skeleton-item skeleton-line skeleton-line-short"></div>
                    <div class="skeleton-grid">
                        <div class="skeleton-card"></div>
                        <div class="skeleton-card"></div>
                        <div class="skeleton-card"></div>
                    </div>
                </div>
                {{message}}
            </div>
        `;
    }

    /**
     * Cria template de pulse
     * @returns {string} Template HTML
     */
    _createPulseTemplate() {
        return `
            <div class="loading-container pulse-container">
                <div class="pulse-wrapper">
                    <div class="pulse-circle">
                        <div class="pulse-ring pulse-ring-1"></div>
                        <div class="pulse-ring pulse-ring-2"></div>
                        <div class="pulse-ring pulse-ring-3"></div>
                        <div class="pulse-center">🌬️</div>
                    </div>
                </div>
                {{message}}
                {{progress}}
            </div>
        `;
    }

    /**
     * Exibe loading
     * @param {Object} options - Opções de exibição
     */
    show(options = {}) {
        if (this.state.isActive) {
            console.log('⏳ LoadingComponent: Already active, updating...');
            this.updateMessage(options.message);
            return;
        }

        console.log('⏳ LoadingComponent: Showing loading', options);

        // Atualiza configuração com opções fornecidas
        const config = { ...this.config, ...options };
        
        // Atualiza estado
        this.state.isActive = true;
        this.state.startTime = Date.now();
        this.state.progress = 0;
        this.state.currentMessage = config.message;

        // Renderiza loading
        this._render(config);

        // Adiciona classes
        this.element.classList.add('loading-active', `loading-${config.type}`, `loading-${config.size}`, `theme-${config.theme}`);

        // Overlay se necessário
        if (config.overlay) {
            this.element.classList.add('loading-overlay');
            document.body.classList.add('loading-active');
        }

        // Animações se habilitadas
        if (config.animated) {
            this.element.classList.add('loading-animated');
        }

        // Timeout se configurado
        if (config.timeout > 0) {
            this.state.timeoutId = setTimeout(() => {
                console.warn('⏳ LoadingComponent: Timeout reached');
                this.hide();
                this.eventManager?.publish('loading:timeout', { duration: config.timeout });
            }, config.timeout);
        }

        // Notifica início
        this.eventManager?.publish('loading:started', {
            type: config.type,
            message: config.message
        });
    }

    /**
     * Esconde loading
     */
    hide() {
        if (!this.state.isActive) {
            return;
        }

        console.log('⏳ LoadingComponent: Hiding loading');

        // Calcula duração
        const duration = Date.now() - this.state.startTime;

        // Remove timeout
        if (this.state.timeoutId) {
            clearTimeout(this.state.timeoutId);
            this.state.timeoutId = null;
        }

        // Animação de saída se habilitada
        if (this.config.animated) {
            this.element.classList.add('loading-hiding');
            
            setTimeout(() => {
                this._finishHide(duration);
            }, 300); // Tempo da animação
        } else {
            this._finishHide(duration);
        }
    }

    /**
     * Finaliza processo de esconder
     * @param {number} duration - Duração do loading
     */
    _finishHide(duration) {
        // Remove classes
        this.element.classList.remove(
            'loading-active', 'loading-animated', 'loading-hiding', 'loading-overlay',
            'loading-spinner', 'loading-dots', 'loading-bar', 'loading-skeleton', 'loading-pulse',
            'loading-small', 'loading-medium', 'loading-large',
            'theme-light', 'theme-dark', 'theme-auto'
        );

        // Remove overlay do body
        document.body.classList.remove('loading-active');

        // Limpa conteúdo
        this.element.innerHTML = '';

        // Reseta estado
        this.state = {
            isActive: false,
            startTime: null,
            progress: 0,
            timeoutId: null,
            currentMessage: this.config.message
        };

        // Notifica fim
        this.eventManager?.publish('loading:finished', { duration });
    }

    /**
     * Atualiza progresso
     * @param {number} progress - Progresso (0-100)
     */
    updateProgress(progress) {
        if (!this.state.isActive) return;

        this.state.progress = Math.max(0, Math.min(100, progress));

        // Atualiza barra de progresso se visível
        const progressFill = this.element.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${this.state.progress}%`;
        }

        // Atualiza texto de progresso
        const progressText = this.element.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `${Math.round(this.state.progress)}%`;
        }

        // Notifica mudança de progresso
        this.eventManager?.publish('loading:progress:updated', {
            progress: this.state.progress
        });

        console.log(`⏳ LoadingComponent: Progress updated - ${this.state.progress}%`);
    }

    /**
     * Atualiza mensagem
     * @param {string} message - Nova mensagem
     */
    updateMessage(message) {
        if (!message || !this.state.isActive) return;

        this.state.currentMessage = message;

        // Atualiza elemento da mensagem
        const messageElement = this.element.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        console.log(`⏳ LoadingComponent: Message updated - ${message}`);
    }

    /**
     * Renderiza loading
     * @param {Object} config - Configuração de renderização
     */
    _render(config) {
        // Obtém template
        const template = this.templates[config.type] || this.templates.spinner;

        // Substitui placeholders
        let html = template;

        // Mensagem
        if (config.showMessage && config.message) {
            html = html.replace('{{message}}', `
                <div class="loading-message">${config.message}</div>
            `);
        } else {
            html = html.replace('{{message}}', '');
        }

        // Progresso
        if (config.showProgress) {
            html = html.replace('{{progress}}', `
                <div class="loading-progress">
                    <div class="progress-text">${Math.round(this.state.progress)}%</div>
                </div>
            `);
        } else {
            html = html.replace('{{progress}}', '');
        }

        // Aplica HTML
        this.element.innerHTML = html;

        // Adiciona estilos inline se necessário
        this._applyInlineStyles(config);
    }

    /**
     * Aplica estilos inline se necessário
     * @param {Object} config - Configuração
     */
    _applyInlineStyles(config) {
        // Adiciona CSS básico se não existir
        if (!document.querySelector('#loading-component-styles')) {
            this._injectStyles();
        }

        // Estilos específicos do tamanho
        const sizeClasses = {
            small: { size: '24px', fontSize: '12px' },
            medium: { size: '48px', fontSize: '14px' },
            large: { size: '72px', fontSize: '16px' }
        };

        const sizeConfig = sizeClasses[config.size] || sizeClasses.medium;
        
        // Aplica tamanho aos elementos
        const spinnerElements = this.element.querySelectorAll('.spinner, .dots, .pulse-circle');
        spinnerElements.forEach(el => {
            el.style.width = sizeConfig.size;
            el.style.height = sizeConfig.size;
        });

        // Aplica fonte às mensagens
        const messageElements = this.element.querySelectorAll('.loading-message, .progress-text');
        messageElements.forEach(el => {
            el.style.fontSize = sizeConfig.fontSize;
        });
    }

    /**
     * Injeta estilos CSS necessários
     */
    _injectStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'loading-component-styles';
        styleSheet.textContent = this._getComponentStyles();
        document.head.appendChild(styleSheet);
    }

    /**
     * Retorna estilos CSS do componente
     * @returns {string} CSS do componente
     */
    _getComponentStyles() {
        return `
            .loading-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                text-align: center;
                min-height: 100px;
            }

            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .theme-dark .loading-overlay {
                background: rgba(0, 0, 0, 0.8);
                color: white;
            }

            /* Spinner Styles */
            .spinner {
                position: relative;
                width: 48px;
                height: 48px;
            }

            .spinner-ring {
                position: absolute;
                width: 100%;
                height: 100%;
                border: 3px solid transparent;
                border-top: 3px solid #007acc;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .spinner-ring:nth-child(2) {
                animation-delay: 0.1s;
                border-top-color: #00a8e6;
            }

            .spinner-ring:nth-child(3) {
                animation-delay: 0.2s;
                border-top-color: #66c2ff;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Dots Styles */
            .dots {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .dot {
                width: 8px;
                height: 8px;
                background: #007acc;
                border-radius: 50%;
                animation: pulse-dot 1.4s infinite ease-in-out;
            }

            .dot-1 { animation-delay: 0s; }
            .dot-2 { animation-delay: 0.16s; }
            .dot-3 { animation-delay: 0.32s; }
            .dot-4 { animation-delay: 0.48s; }
            .dot-5 { animation-delay: 0.64s; }

            @keyframes pulse-dot {
                0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }

            /* Progress Bar Styles */
            .progress-bar {
                width: 200px;
                height: 6px;
                background: #e0e0e0;
                border-radius: 3px;
                overflow: hidden;
                position: relative;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007acc, #00a8e6);
                transition: width 0.3s ease;
                border-radius: 3px;
            }

            .progress-glow {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: glow 2s infinite;
            }

            @keyframes glow {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            /* Skeleton Styles */
            .skeleton-wrapper {
                width: 100%;
                max-width: 300px;
            }

            .skeleton-item {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                margin-bottom: 10px;
                border-radius: 4px;
            }

            .skeleton-header { height: 24px; }
            .skeleton-line { height: 16px; }
            .skeleton-line-long { width: 100%; }
            .skeleton-line-medium { width: 75%; }
            .skeleton-line-short { width: 50%; }

            .skeleton-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-top: 15px;
            }

            .skeleton-card {
                height: 60px;
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 8px;
            }

            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Pulse Styles */
            .pulse-circle {
                position: relative;
                width: 60px;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pulse-ring {
                position: absolute;
                border: 2px solid #007acc;
                border-radius: 50%;
                animation: pulse-ring 2s infinite;
            }

            .pulse-ring-1 {
                width: 100%;
                height: 100%;
                animation-delay: 0s;
            }

            .pulse-ring-2 {
                width: 80%;
                height: 80%;
                animation-delay: 0.3s;
            }

            .pulse-ring-3 {
                width: 60%;
                height: 60%;
                animation-delay: 0.6s;
            }

            .pulse-center {
                font-size: 24px;
                z-index: 1;
            }

            @keyframes pulse-ring {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(1); opacity: 0; }
            }

            /* Message Styles */
            .loading-message {
                margin-top: 15px;
                color: #333;
                font-size: 14px;
                font-weight: 500;
            }

            .theme-dark .loading-message {
                color: #fff;
            }

            /* Progress Text Styles */
            .loading-progress {
                margin-top: 10px;
            }

            .progress-text {
                font-size: 12px;
                color: #666;
                font-weight: 600;
            }

            .theme-dark .progress-text {
                color: #ccc;
            }

            /* Animation States */
            .loading-animated {
                opacity: 0;
                animation: fadeIn 0.3s ease-out forwards;
            }

            .loading-hiding {
                animation: fadeOut 0.3s ease-out forwards;
            }

            @keyframes fadeIn {
                to { opacity: 1; }
            }

            @keyframes fadeOut {
                to { opacity: 0; }
            }

            /* Size Variants */
            .loading-small .spinner,
            .loading-small .dots,
            .loading-small .pulse-circle {
                transform: scale(0.7);
            }

            .loading-large .spinner,
            .loading-large .dots,
            .loading-large .pulse-circle {
                transform: scale(1.3);
            }

            .loading-small .loading-message {
                font-size: 12px;
            }

            .loading-large .loading-message {
                font-size: 16px;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .loading-container {
                    padding: 15px;
                }
                
                .progress-bar {
                    width: 150px;
                }
                
                .skeleton-wrapper {
                    max-width: 250px;
                }
            }
        `;
    }

    /**
     * Define tipo de loading
     * @param {string} type - Tipo de loading
     */
    setType(type) {
        if (this.templates[type]) {
            this.config.type = type;
            
            if (this.state.isActive) {
                // Re-renderiza com novo tipo
                this._render(this.config);
                
                // Atualiza classes
                this.element.classList.remove('loading-spinner', 'loading-dots', 'loading-bar', 'loading-skeleton', 'loading-pulse');
                this.element.classList.add(`loading-${type}`);
            }
            
            console.log(`⏳ LoadingComponent: Type changed to ${type}`);
        }
    }

    /**
     * Define tamanho
     * @param {string} size - Tamanho (small, medium, large)
     */
    setSize(size) {
        this.config.size = size;
        
        if (this.state.isActive) {
            this.element.classList.remove('loading-small', 'loading-medium', 'loading-large');
            this.element.classList.add(`loading-${size}`);
            this._applyInlineStyles(this.config);
        }
        
        console.log(`⏳ LoadingComponent: Size changed to ${size}`);
    }

    /**
     * Verifica se está ativo
     * @returns {boolean} True se ativo
     */
    isActive() {
        return this.state.isActive;
    }

    /**
     * Obtém progresso atual
     * @returns {number} Progresso (0-100)
     */
    getProgress() {
        return this.state.progress;
    }

    /**
     * Obtém tempo decorrido
     * @returns {number} Tempo em ms
     */
    getElapsedTime() {
        return this.state.startTime ? Date.now() - this.state.startTime : 0;
    }

    /**
     * Renderização principal
     */
    render() {
        if (this.state.isActive) {
            this._render(this.config);
        } else {
            // Estado inicial vazio
            this.element.innerHTML = '';
        }
    }

    /**
     * Destrói o componente
     */
    destroy() {
        // Para loading se ativo
        if (this.state.isActive) {
            this.hide();
        }
        
        // Remove estilos se necessário
        const styleSheet = document.querySelector('#loading-component-styles');
        if (styleSheet && !document.querySelector('.loading-component:not([data-destroyed])')) {
            styleSheet.remove();
        }
        
        // Limpa estado
        this.state = {
            isActive: false,
            startTime: null,
            progress: 0,
            timeoutId: null,
            currentMessage: ''
        };

        super.destroy();
        
        console.log('⏳ LoadingComponent: Destroyed');
    }
}

export default LoadingComponent;
