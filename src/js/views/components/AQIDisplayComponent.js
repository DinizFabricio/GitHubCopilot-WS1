/**
 * AQIDisplayComponent - Componente para exibição dos dados de qualidade do ar
 * Implementa visualização interativa com gráficos e cartões informativos
 */
import BaseComponent from './BaseComponent.js';

class AQIDisplayComponent extends BaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        // Configurações padrão
        this.config = {
            showAnimations: true,
            autoRefresh: false,
            refreshInterval: 300000, // 5 minutos
            showPollutantDetails: true,
            enableComparison: false,
            showHealthRecommendations: true,
            ...options
        };

        // Estado do componente
        this.state = {
            currentData: null,
            historicalData: [],
            isLoading: false,
            error: null,
            lastUpdated: null,
            selectedPollutant: null,
            comparisonData: []
        };

        // Cache de elementos
        this.elements = {};
        
        // Timer para auto-refresh
        this.refreshTimer = null;

        // Inicialização
        this._initializeElements();
        this._setupEventListeners();
        
        console.log('📊 AQIDisplayComponent: Initialized');
    }

    /**
     * Inicializa elementos do display
     */
    _initializeElements() {
        // Container principal
        this.elements.container = this.element;
        
        // Seções principais
        this.elements.header = this._getOrCreateElement('.aqi-header', 'div', 'aqi-header');
        this.elements.summary = this._getOrCreateElement('.aqi-summary', 'div', 'aqi-summary');
        this.elements.pollutants = this._getOrCreateElement('.aqi-pollutants', 'div', 'aqi-pollutants');
        this.elements.recommendations = this._getOrCreateElement('.aqi-recommendations', 'div', 'aqi-recommendations');
        this.elements.chart = this._getOrCreateElement('.aqi-chart', 'div', 'aqi-chart');
        this.elements.comparison = this._getOrCreateElement('.aqi-comparison', 'div', 'aqi-comparison');
        this.elements.footer = this._getOrCreateElement('.aqi-footer', 'div', 'aqi-footer');

        // Elementos específicos do header
        this.elements.title = this._getOrCreateElement('.aqi-title', 'h2', 'aqi-title', this.elements.header);
        this.elements.location = this._getOrCreateElement('.aqi-location', 'p', 'aqi-location', this.elements.header);
        this.elements.timestamp = this._getOrCreateElement('.aqi-timestamp', 'p', 'aqi-timestamp', this.elements.header);

        // Elementos do summary
        this.elements.aqiValue = this._getOrCreateElement('.aqi-value', 'div', 'aqi-value', this.elements.summary);
        this.elements.aqiLabel = this._getOrCreateElement('.aqi-label', 'div', 'aqi-label', this.elements.summary);
        this.elements.aqiCategory = this._getOrCreateElement('.aqi-category', 'div', 'aqi-category', this.elements.summary);
        this.elements.dominantPollutant = this._getOrCreateElement('.dominant-pollutant', 'div', 'dominant-pollutant', this.elements.summary);

        console.log('📊 AQIDisplayComponent: Elements initialized');
    }

    /**
     * Obtém ou cria elemento
     * @param {string} selector - Seletor CSS
     * @param {string} tagName - Nome da tag
     * @param {string} className - Classe CSS
     * @param {Element} parent - Elemento pai
     * @returns {Element} Elemento encontrado ou criado
     */
    _getOrCreateElement(selector, tagName, className, parent = this.element) {
        let element = parent.querySelector(selector);
        if (!element) {
            element = document.createElement(tagName);
            element.className = className;
            parent.appendChild(element);
        }
        return element;
    }

    /**
     * Configura event listeners
     */
    _setupEventListeners() {
        // Eventos de dados
        this.eventManager?.subscribe('aqi:data:received', (data) => {
            this.updateDisplay(data);
        });

        this.eventManager?.subscribe('aqi:data:error', (error) => {
            this.showError(error);
        });

        this.eventManager?.subscribe('aqi:data:loading', () => {
            this.showLoading();
        });

        // Eventos de localização
        this.eventManager?.subscribe('location:changed', (location) => {
            this._updateLocation(location);
        });

        // Eventos de configuração
        this.eventManager?.subscribe('display:config:update', (config) => {
            this.updateConfig(config);
        });

        // Cliques em poluentes
        this.elements.pollutants.addEventListener('click', (e) => {
            const pollutantCard = e.target.closest('.pollutant-card');
            if (pollutantCard) {
                this._handlePollutantClick(pollutantCard);
            }
        });

        // Auto-refresh
        if (this.config.autoRefresh) {
            this._startAutoRefresh();
        }
    }

    /**
     * Atualiza display com novos dados
     * @param {Object} data - Dados de qualidade do ar
     */
    updateDisplay(data) {
        if (!data) {
            console.warn('⚠️ AQIDisplayComponent: No data provided');
            return;
        }

        console.log('📊 AQIDisplayComponent: Updating display with data', data);

        try {
            // Atualiza estado
            this.state.currentData = data;
            this.state.lastUpdated = new Date();
            this.state.isLoading = false;
            this.state.error = null;

            // Adiciona aos dados históricos
            this._addToHistoricalData(data);

            // Atualiza seções
            this._updateHeader(data);
            this._updateSummary(data);
            this._updatePollutants(data);
            
            if (this.config.showHealthRecommendations) {
                this._updateRecommendations(data);
            }

            this._updateChart(data);
            this._updateFooter(data);

            // Remove estados de loading/erro
            this._clearErrorState();
            this._clearLoadingState();

            // Adiciona animações se habilitadas
            if (this.config.showAnimations) {
                this._animateUpdate();
            }

            // Notifica atualização
            this.eventManager?.publish('aqi:display:updated', {
                data,
                timestamp: this.state.lastUpdated
            });

            console.log('✅ AQIDisplayComponent: Display updated successfully');

        } catch (error) {
            console.error('❌ AQIDisplayComponent: Error updating display', error);
            this.showError(error);
        }
    }

    /**
     * Atualiza header com informações básicas
     * @param {Object} data - Dados de AQI
     */
    _updateHeader(data) {
        // Título
        this.elements.title.textContent = 'Qualidade do Ar';

        // Localização
        if (data.location) {
            const locationText = this._formatLocation(data.location);
            this.elements.location.textContent = locationText;
        }

        // Timestamp
        if (data.timestamp) {
            const timeText = this._formatTimestamp(data.timestamp);
            this.elements.timestamp.textContent = `Última atualização: ${timeText}`;
        }
    }

    /**
     * Atualiza resumo principal
     * @param {Object} data - Dados de AQI
     */
    _updateSummary(data) {
        if (!data.aqi) return;

        // Valor do AQI
        this.elements.aqiValue.textContent = data.aqi.value || '--';
        
        // Label
        this.elements.aqiLabel.textContent = 'AQI';

        // Categoria
        const category = this._getAQICategory(data.aqi.value);
        this.elements.aqiCategory.textContent = category.name;
        this.elements.aqiCategory.className = `aqi-category ${category.class}`;

        // Poluente dominante
        if (data.aqi.dominantPollutant) {
            const pollutantName = this._getPollutantDisplayName(data.aqi.dominantPollutant);
            this.elements.dominantPollutant.textContent = `Poluente dominante: ${pollutantName}`;
        }

        // Aplica cor de fundo baseada na categoria
        this.elements.summary.className = `aqi-summary ${category.class}`;
    }

    /**
     * Atualiza seção de poluentes
     * @param {Object} data - Dados de AQI
     */
    _updatePollutants(data) {
        if (!data.pollutants) return;

        // Limpa conteúdo anterior
        this.elements.pollutants.innerHTML = '';

        // Cria título da seção
        const title = document.createElement('h3');
        title.textContent = 'Poluentes Monitorados';
        title.className = 'pollutants-title';
        this.elements.pollutants.appendChild(title);

        // Container para cartões
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'pollutants-grid';

        // Cria cartão para cada poluente
        Object.entries(data.pollutants).forEach(([pollutant, value]) => {
            const card = this._createPollutantCard(pollutant, value);
            cardsContainer.appendChild(card);
        });

        this.elements.pollutants.appendChild(cardsContainer);
    }

    /**
     * Cria cartão de poluente
     * @param {string} pollutant - Nome do poluente
     * @param {number} value - Valor do poluente
     * @returns {Element} Elemento do cartão
     */
    _createPollutantCard(pollutant, value) {
        const card = document.createElement('div');
        card.className = 'pollutant-card';
        card.dataset.pollutant = pollutant;

        const name = document.createElement('h4');
        name.textContent = this._getPollutantDisplayName(pollutant);
        name.className = 'pollutant-name';

        const valueElement = document.createElement('div');
        valueElement.textContent = this._formatPollutantValue(pollutant, value);
        valueElement.className = 'pollutant-value';

        const unit = document.createElement('div');
        unit.textContent = this._getPollutantUnit(pollutant);
        unit.className = 'pollutant-unit';

        // Status do poluente
        const status = document.createElement('div');
        status.textContent = this._getPollutantStatus(pollutant, value);
        status.className = `pollutant-status ${this._getPollutantStatusClass(pollutant, value)}`;

        card.appendChild(name);
        card.appendChild(valueElement);
        card.appendChild(unit);
        card.appendChild(status);

        return card;
    }

    /**
     * Atualiza recomendações de saúde
     * @param {Object} data - Dados de AQI
     */
    _updateRecommendations(data) {
        if (!data.aqi) return;

        // Limpa conteúdo anterior
        this.elements.recommendations.innerHTML = '';

        // Título
        const title = document.createElement('h3');
        title.textContent = 'Recomendações de Saúde';
        title.className = 'recommendations-title';
        this.elements.recommendations.appendChild(title);

        // Obtém recomendações baseadas no AQI
        const recommendations = this._getHealthRecommendations(data.aqi.value);
        
        // Container para recomendações
        const container = document.createElement('div');
        container.className = 'recommendations-container';

        recommendations.forEach(recommendation => {
            const item = document.createElement('div');
            item.className = `recommendation-item ${recommendation.type}`;
            
            const icon = document.createElement('span');
            icon.className = `recommendation-icon ${recommendation.icon}`;
            icon.textContent = recommendation.iconText;
            
            const text = document.createElement('span');
            text.textContent = recommendation.text;
            text.className = 'recommendation-text';

            item.appendChild(icon);
            item.appendChild(text);
            container.appendChild(item);
        });

        this.elements.recommendations.appendChild(container);
    }

    /**
     * Atualiza gráfico/chart
     * @param {Object} data - Dados de AQI
     */
    _updateChart(data) {
        // Implementação básica - pode ser expandida com bibliotecas de gráficos
        this.elements.chart.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = 'Histórico Recente';
        title.className = 'chart-title';
        this.elements.chart.appendChild(title);

        // Gráfico simples baseado em dados históricos
        if (this.state.historicalData.length > 1) {
            const chartContainer = this._createSimpleChart(this.state.historicalData);
            this.elements.chart.appendChild(chartContainer);
        } else {
            const message = document.createElement('p');
            message.textContent = 'Coletando dados para exibir histórico...';
            message.className = 'chart-message';
            this.elements.chart.appendChild(message);
        }
    }

    /**
     * Cria gráfico simples
     * @param {Array} historicalData - Dados históricos
     * @returns {Element} Elemento do gráfico
     */
    _createSimpleChart(historicalData) {
        const container = document.createElement('div');
        container.className = 'simple-chart';

        // Últimos 10 pontos de dados
        const recentData = historicalData.slice(-10);
        const maxValue = Math.max(...recentData.map(d => d.aqi?.value || 0));
        
        recentData.forEach((dataPoint, index) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            
            const height = ((dataPoint.aqi?.value || 0) / maxValue) * 100;
            bar.style.height = `${height}%`;
            
            const category = this._getAQICategory(dataPoint.aqi?.value || 0);
            bar.style.backgroundColor = category.color;
            
            // Tooltip
            bar.title = `${this._formatTimestamp(dataPoint.timestamp)}: AQI ${dataPoint.aqi?.value || '--'}`;
            
            container.appendChild(bar);
        });

        return container;
    }

    /**
     * Atualiza footer
     * @param {Object} data - Dados de AQI
     */
    _updateFooter(data) {
        this.elements.footer.innerHTML = '';

        // Fonte dos dados
        const source = document.createElement('p');
        source.textContent = 'Dados fornecidos por Open-Meteo Air Quality API';
        source.className = 'data-source';

        // Controles adicionais
        const controls = document.createElement('div');
        controls.className = 'display-controls';

        // Botão de refresh
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '🔄 Atualizar';
        refreshButton.className = 'refresh-button';
        refreshButton.onclick = () => this._handleRefresh();

        // Botão de exportar (se habilitado)
        if (this.config.enableExport) {
            const exportButton = document.createElement('button');
            exportButton.textContent = '📥 Exportar';
            exportButton.className = 'export-button';
            exportButton.onclick = () => this._handleExport();
            controls.appendChild(exportButton);
        }

        controls.appendChild(refreshButton);
        
        this.elements.footer.appendChild(source);
        this.elements.footer.appendChild(controls);
    }

    /**
     * Manipula clique em poluente
     * @param {Element} pollutantCard - Cartão do poluente
     */
    _handlePollutantClick(pollutantCard) {
        const pollutant = pollutantCard.dataset.pollutant;
        this.state.selectedPollutant = pollutant;

        // Remove seleção anterior
        this.elements.pollutants.querySelectorAll('.pollutant-card.selected')
            .forEach(card => card.classList.remove('selected'));

        // Adiciona seleção atual
        pollutantCard.classList.add('selected');

        // Notifica seleção
        this.eventManager?.publish('aqi:pollutant:selected', {
            pollutant,
            data: this.state.currentData?.pollutants?.[pollutant]
        });

        console.log(`📊 AQIDisplayComponent: Pollutant selected - ${pollutant}`);
    }

    /**
     * Manipula refresh manual
     */
    _handleRefresh() {
        this.eventManager?.publish('aqi:refresh:requested');
        console.log('📊 AQIDisplayComponent: Refresh requested');
    }

    /**
     * Manipula exportação de dados
     */
    _handleExport() {
        if (!this.state.currentData) return;

        const exportData = {
            ...this.state.currentData,
            exportedAt: new Date().toISOString(),
            historicalData: this.state.historicalData
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `air-quality-data-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('📊 AQIDisplayComponent: Data exported');
    }

    /**
     * Adiciona dados ao histórico
     * @param {Object} data - Dados a adicionar
     */
    _addToHistoricalData(data) {
        this.state.historicalData.push({
            ...data,
            timestamp: new Date()
        });

        // Mantém apenas últimos 50 registros
        if (this.state.historicalData.length > 50) {
            this.state.historicalData = this.state.historicalData.slice(-50);
        }
    }

    /**
     * Exibe estado de loading
     */
    showLoading() {
        this.state.isLoading = true;
        this.state.error = null;

        // Adiciona classe de loading
        this.element.classList.add('loading');
        
        // Mostra indicador de loading
        if (!this.elements.loadingIndicator) {
            this.elements.loadingIndicator = document.createElement('div');
            this.elements.loadingIndicator.className = 'loading-indicator';
            this.elements.loadingIndicator.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Carregando dados de qualidade do ar...</p>
            `;
            this.element.appendChild(this.elements.loadingIndicator);
        }

        console.log('📊 AQIDisplayComponent: Loading state active');
    }

    /**
     * Exibe erro
     * @param {Error|string} error - Erro a exibir
     */
    showError(error) {
        this.state.error = error;
        this.state.isLoading = false;

        console.error('📊 AQIDisplayComponent: Showing error', error);

        // Remove loading se ativo
        this._clearLoadingState();

        // Adiciona classe de erro
        this.element.classList.add('error');

        // Mostra mensagem de erro
        if (!this.elements.errorMessage) {
            this.elements.errorMessage = document.createElement('div');
            this.elements.errorMessage.className = 'error-message';
            this.element.appendChild(this.elements.errorMessage);
        }

        const errorText = error?.message || error || 'Erro desconhecido';
        this.elements.errorMessage.innerHTML = `
            <div class="error-icon">⚠️</div>
            <h3>Erro ao carregar dados</h3>
            <p>${errorText}</p>
            <button class="retry-button" onclick="this.closest('.aqi-display').dispatchEvent(new CustomEvent('retry'))">
                Tentar novamente
            </button>
        `;

        // Event listener para retry
        this.element.addEventListener('retry', () => {
            this._handleRefresh();
        }, { once: true });
    }

    /**
     * Limpa estado de loading
     */
    _clearLoadingState() {
        this.element.classList.remove('loading');
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.remove();
            delete this.elements.loadingIndicator;
        }
    }

    /**
     * Limpa estado de erro
     */
    _clearErrorState() {
        this.element.classList.remove('error');
        if (this.elements.errorMessage) {
            this.elements.errorMessage.remove();
            delete this.elements.errorMessage;
        }
    }

    /**
     * Anima atualização
     */
    _animateUpdate() {
        this.element.style.opacity = '0.8';
        this.element.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1)';
            this.element.style.transition = 'all 0.3s ease-out';
        }, 100);

        setTimeout(() => {
            this.element.style.transition = '';
        }, 400);
    }

    /**
     * Inicia auto-refresh
     */
    _startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this._handleRefresh();
        }, this.config.refreshInterval);

        console.log(`📊 AQIDisplayComponent: Auto-refresh started (${this.config.refreshInterval}ms)`);
    }

    /**
     * Para auto-refresh
     */
    _stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('📊 AQIDisplayComponent: Auto-refresh stopped');
        }
    }

    // Métodos utilitários

    /**
     * Formata localização
     * @param {Object} location - Dados de localização
     * @returns {string} Localização formatada
     */
    _formatLocation(location) {
        const parts = [];
        if (location.city) parts.push(location.city);
        if (location.state) parts.push(location.state);
        if (location.country) parts.push(location.country);
        return parts.join(', ') || 'Localização desconhecida';
    }

    /**
     * Formata timestamp
     * @param {Date|string} timestamp - Timestamp a formatar
     * @returns {string} Timestamp formatado
     */
    _formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Obtém categoria do AQI
     * @param {number} aqiValue - Valor do AQI
     * @returns {Object} Categoria do AQI
     */
    _getAQICategory(aqiValue) {
        if (aqiValue <= 50) {
            return { name: 'Bom', class: 'good', color: '#00e400' };
        } else if (aqiValue <= 100) {
            return { name: 'Moderado', class: 'moderate', color: '#ffff00' };
        } else if (aqiValue <= 150) {
            return { name: 'Insalubre para grupos sensíveis', class: 'unhealthy-sensitive', color: '#ff7e00' };
        } else if (aqiValue <= 200) {
            return { name: 'Insalubre', class: 'unhealthy', color: '#ff0000' };
        } else if (aqiValue <= 300) {
            return { name: 'Muito insalubre', class: 'very-unhealthy', color: '#8f3f97' };
        } else {
            return { name: 'Perigoso', class: 'hazardous', color: '#7e0023' };
        }
    }

    /**
     * Obtém nome de exibição do poluente
     * @param {string} pollutant - Nome técnico do poluente
     * @returns {string} Nome para exibição
     */
    _getPollutantDisplayName(pollutant) {
        const names = {
            'pm2.5': 'PM2.5',
            'pm10': 'PM10',
            'o3': 'Ozônio (O₃)',
            'no2': 'NO₂',
            'so2': 'SO₂',
            'co': 'CO',
            'nh3': 'NH₃'
        };
        return names[pollutant.toLowerCase()] || pollutant.toUpperCase();
    }

    /**
     * Obtém unidade do poluente
     * @param {string} pollutant - Nome do poluente
     * @returns {string} Unidade
     */
    _getPollutantUnit(pollutant) {
        const units = {
            'pm2.5': 'μg/m³',
            'pm10': 'μg/m³',
            'o3': 'μg/m³',
            'no2': 'μg/m³',
            'so2': 'μg/m³',
            'co': 'mg/m³',
            'nh3': 'μg/m³'
        };
        return units[pollutant.toLowerCase()] || 'μg/m³';
    }

    /**
     * Formata valor do poluente
     * @param {string} pollutant - Nome do poluente
     * @param {number} value - Valor
     * @returns {string} Valor formatado
     */
    _formatPollutantValue(pollutant, value) {
        if (value == null) return '--';
        return pollutant.toLowerCase() === 'co' ? value.toFixed(2) : Math.round(value);
    }

    /**
     * Obtém status do poluente
     * @param {string} pollutant - Nome do poluente
     * @param {number} value - Valor do poluente
     * @returns {string} Status
     */
    _getPollutantStatus(pollutant, value) {
        // Implementação simplificada - pode ser expandida com limites reais
        if (value == null) return 'N/D';
        
        const thresholds = {
            'pm2.5': [12, 35, 55],
            'pm10': [55, 155, 255],
            'o3': [100, 160, 240],
            'no2': [40, 80, 180],
            'so2': [20, 80, 380],
            'co': [4, 9, 15]
        };

        const limits = thresholds[pollutant.toLowerCase()];
        if (!limits) return 'OK';

        if (value <= limits[0]) return 'Bom';
        if (value <= limits[1]) return 'Moderado';
        if (value <= limits[2]) return 'Ruim';
        return 'Péssimo';
    }

    /**
     * Obtém classe CSS do status do poluente
     * @param {string} pollutant - Nome do poluente
     * @param {number} value - Valor do poluente
     * @returns {string} Classe CSS
     */
    _getPollutantStatusClass(pollutant, value) {
        const status = this._getPollutantStatus(pollutant, value);
        return status.toLowerCase().replace(' ', '-');
    }

    /**
     * Obtém recomendações de saúde baseadas no AQI
     * @param {number} aqiValue - Valor do AQI
     * @returns {Array} Lista de recomendações
     */
    _getHealthRecommendations(aqiValue) {
        if (aqiValue <= 50) {
            return [
                { type: 'good', icon: 'good-icon', iconText: '😊', text: 'Qualidade do ar excelente para atividades ao ar livre' },
                { type: 'good', icon: 'exercise-icon', iconText: '🏃', text: 'Ideal para exercícios e caminhadas' }
            ];
        } else if (aqiValue <= 100) {
            return [
                { type: 'moderate', icon: 'moderate-icon', iconText: '😐', text: 'Qualidade do ar aceitável para a maioria das pessoas' },
                { type: 'moderate', icon: 'sensitive-icon', iconText: '⚠️', text: 'Pessoas muito sensíveis devem limitar exercícios prolongados ao ar livre' }
            ];
        } else if (aqiValue <= 150) {
            return [
                { type: 'unhealthy-sensitive', icon: 'warning-icon', iconText: '😷', text: 'Grupos sensíveis devem evitar atividades ao ar livre' },
                { type: 'unhealthy-sensitive', icon: 'indoor-icon', iconText: '🏠', text: 'Prefira atividades em ambientes fechados' }
            ];
        } else if (aqiValue <= 200) {
            return [
                { type: 'unhealthy', icon: 'danger-icon', iconText: '🚨', text: 'Evite atividades ao ar livre' },
                { type: 'unhealthy', icon: 'mask-icon', iconText: '😷', text: 'Use máscara ao sair' }
            ];
        } else {
            return [
                { type: 'hazardous', icon: 'extreme-icon', iconText: '☠️', text: 'Permaneça em casa com janelas fechadas' },
                { type: 'hazardous', icon: 'emergency-icon', iconText: '🚨', text: 'Evite qualquer atividade ao ar livre' }
            ];
        }
    }

    /**
     * Atualiza configuração
     * @param {Object} newConfig - Nova configuração
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Reaplica configurações
        if (newConfig.autoRefresh !== undefined) {
            if (newConfig.autoRefresh) {
                this._startAutoRefresh();
            } else {
                this._stopAutoRefresh();
            }
        }

        console.log('📊 AQIDisplayComponent: Configuration updated', newConfig);
    }

    /**
     * Obtém dados atuais
     * @returns {Object} Dados atuais
     */
    getCurrentData() {
        return this.state.currentData;
    }

    /**
     * Obtém dados históricos
     * @returns {Array} Dados históricos
     */
    getHistoricalData() {
        return [...this.state.historicalData];
    }

    /**
     * Renderização (aplicável para componente)
     */
    render() {
        // Se não há dados, mostra placeholder
        if (!this.state.currentData) {
            this.element.innerHTML = `
                <div class="aqi-placeholder">
                    <h2>🌬️ Monitor de Qualidade do Ar</h2>
                    <p>Insira uma localização para visualizar os dados de qualidade do ar</p>
                </div>
            `;
            return;
        }

        // Caso contrário, re-renderiza com dados atuais
        this.updateDisplay(this.state.currentData);
    }

    /**
     * Destrói o componente
     */
    destroy() {
        // Para auto-refresh
        this._stopAutoRefresh();
        
        // Remove event listeners específicos
        this.elements.pollutants?.removeEventListener('click', this._handlePollutantClick);
        
        // Limpa estado
        this.state = {
            currentData: null,
            historicalData: [],
            isLoading: false,
            error: null,
            lastUpdated: null,
            selectedPollutant: null,
            comparisonData: []
        };

        super.destroy();
        
        console.log('📊 AQIDisplayComponent: Destroyed');
    }
}

export default AQIDisplayComponent;
