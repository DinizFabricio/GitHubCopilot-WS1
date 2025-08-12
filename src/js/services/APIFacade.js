/**
 * APIFacade - Facade Pattern Implementation
 * Simplifica e centraliza todas as interações com APIs externas
 */
class APIFacade {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.geocodingService = new GeocodingService();
        this.airQualityService = new AirQualityService();
        this.cacheService = new CacheService();
        
        // Configurações
        this.config = {
            cacheEnabled: true,
            cacheTTL: 15 * 60 * 1000, // 15 minutos
            retryAttempts: 3,
            retryDelay: 1000 // 1 segundo
        };
    }

    /**
     * Busca dados completos de qualidade do ar para uma localização
     * @param {Object} locationData - Dados da localização (city, state, country)
     * @returns {Promise<Object>} Dados completos de qualidade do ar
     */
    async getAirQualityData(locationData) {
        const { city, state, country = 'US' } = locationData;
        const cacheKey = this._generateCacheKey(city, state, country);
        
        try {
            this.eventManager.publish(EventManager.EVENTS.API_LOADING_START);
            
            // Verifica cache primeiro
            if (this.config.cacheEnabled) {
                const cachedData = await this.cacheService.get(cacheKey);
                if (cachedData) {
                    this.eventManager.publish(EventManager.EVENTS.DATA_RETRIEVED, {
                        source: 'cache',
                        data: cachedData
                    });
                    this.eventManager.publish(EventManager.EVENTS.API_LOADING_END);
                    return cachedData;
                }
            }

            // Busca coordenadas
            const coordinates = await this._getCoordinatesWithRetry({
                city,
                state,
                country
            });

            // Busca dados de qualidade do ar
            const airQualityData = await this._getAirQualityWithRetry(coordinates);

            // Combina todos os dados
            const completeData = {
                location: {
                    city,
                    state,
                    country,
                    coordinates,
                    displayName: coordinates.display_name
                },
                airQuality: airQualityData,
                timestamp: new Date().toISOString(),
                source: 'api'
            };

            // Salva no cache
            if (this.config.cacheEnabled) {
                await this.cacheService.set(cacheKey, completeData, this.config.cacheTTL);
                this.eventManager.publish(EventManager.EVENTS.DATA_CACHED, { cacheKey });
            }

            this.eventManager.publish(EventManager.EVENTS.API_SUCCESS, completeData);
            return completeData;

        } catch (error) {
            this.eventManager.publish(EventManager.EVENTS.API_ERROR, {
                error,
                locationData,
                timestamp: new Date().toISOString()
            });
            throw error;
        } finally {
            this.eventManager.publish(EventManager.EVENTS.API_LOADING_END);
        }
    }

    /**
     * Busca coordenadas com retry automático
     * @param {Object} location - Dados da localização
     * @returns {Promise<Object>} Coordenadas e dados de localização
     */
    async _getCoordinatesWithRetry(location) {
        return this._retryOperation(
            () => this.geocodingService.geocode(location),
            'geocoding',
            location
        );
    }

    /**
     * Busca dados de qualidade do ar com retry automático
     * @param {Object} coordinates - Coordenadas (lat, lon)
     * @returns {Promise<Object>} Dados de qualidade do ar
     */
    async _getAirQualityWithRetry(coordinates) {
        return this._retryOperation(
            () => this.airQualityService.getAirQuality(coordinates),
            'air-quality',
            coordinates
        );
    }

    /**
     * Executa operação com retry automático
     * @param {Function} operation - Operação a ser executada
     * @param {string} operationType - Tipo da operação para logging
     * @param {Object} context - Contexto da operação
     * @returns {Promise<*>} Resultado da operação
     */
    async _retryOperation(operation, operationType, context) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                console.warn(`🔄 APIFacade: ${operationType} attempt ${attempt}/${this.config.retryAttempts} failed`, {
                    error: error.message,
                    context
                });

                // Não faz retry no último attempt
                if (attempt === this.config.retryAttempts) {
                    break;
                }

                // Aguarda antes do próximo attempt
                await this._delay(this.config.retryDelay * attempt);
            }
        }

        // Se chegou aqui, todos os attempts falharam
        throw new APIError(
            `${operationType} failed after ${this.config.retryAttempts} attempts: ${lastError.message}`,
            operationType,
            lastError
        );
    }

    /**
     * Gera chave única para cache
     * @param {string} city - Cidade
     * @param {string} state - Estado
     * @param {string} country - País
     * @returns {string} Chave do cache
     */
    _generateCacheKey(city, state, country) {
        return `air_quality_${city.toLowerCase()}_${state.toLowerCase()}_${country.toLowerCase()}`;
    }

    /**
     * Utilitário para delay
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise<void>}
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Limpa todo o cache
     * @returns {Promise<void>}
     */
    async clearCache() {
        await this.cacheService.clear();
        this.eventManager.publish(EventManager.EVENTS.DATA_CACHED, { action: 'cleared' });
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Promise<Object>} Estatísticas do cache
     */
    async getCacheStats() {
        return await this.cacheService.getStats();
    }

    /**
     * Configura opções da API
     * @param {Object} options - Novas configurações
     */
    configure(options) {
        this.config = { ...this.config, ...options };
    }

    /**
     * Testa conectividade com todas as APIs
     * @returns {Promise<Object>} Status de conectividade
     */
    async healthCheck() {
        const results = {
            geocoding: { status: 'unknown', error: null },
            airQuality: { status: 'unknown', error: null },
            cache: { status: 'unknown', error: null }
        };

        // Testa geocoding
        try {
            await this.geocodingService.healthCheck();
            results.geocoding.status = 'ok';
        } catch (error) {
            results.geocoding = { status: 'error', error: error.message };
        }

        // Testa air quality
        try {
            await this.airQualityService.healthCheck();
            results.airQuality.status = 'ok';
        } catch (error) {
            results.airQuality = { status: 'error', error: error.message };
        }

        // Testa cache
        try {
            await this.cacheService.healthCheck();
            results.cache.status = 'ok';
        } catch (error) {
            results.cache = { status: 'error', error: error.message };
        }

        return results;
    }
}

/**
 * Classe de erro específica para APIs
 */
class APIError extends Error {
    constructor(message, type, originalError = null) {
        super(message);
        this.name = 'APIError';
        this.type = type;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
    }
}

export { APIFacade, APIError };
