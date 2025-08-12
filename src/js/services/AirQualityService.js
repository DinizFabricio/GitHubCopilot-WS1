/**
 * AirQualityService - Serviço para dados de qualidade do ar
 * Utiliza a API Open-Meteo Air Quality
 */
class AirQualityService {
    constructor() {
        this.baseURL = 'https://air-quality.open-meteo.com/v1/air-quality';
        this.defaultParams = {
            current: [
                'european_aqi',
                'us_aqi',
                'pm10',
                'pm2_5',
                'carbon_monoxide',
                'nitrogen_dioxide',
                'sulphur_dioxide',
                'ozone'
            ].join(','),
            timezone: 'auto'
        };
    }

    /**
     * Obtém dados de qualidade do ar para coordenadas específicas
     * @param {Object} coordinates - Objeto com lat e lon
     * @returns {Promise<Object>} Dados de qualidade do ar processados
     */
    async getAirQuality({ lat, lon }) {
        try {
            const url = this._buildURL({
                latitude: lat,
                longitude: lon,
                ...this.defaultParams
            });

            console.log(`🌬️ AirQualityService: Fetching air quality for ${lat}, ${lon}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Air Quality API returned ${response.status}: ${response.statusText}`);
            }

            const rawData = await response.json();
            
            if (!rawData.current) {
                throw new AirQualityDataError('Dados de qualidade do ar não disponíveis para esta localização');
            }

            const processedData = this._processAirQualityData(rawData);
            
            console.log(`✅ AirQualityService: Data retrieved successfully`, processedData);
            return processedData;

        } catch (error) {
            console.error('❌ AirQualityService: Error fetching air quality data', {
                coordinates: { lat, lon },
                error: error.message
            });
            
            if (error instanceof AirQualityDataError) {
                throw error;
            }
            
            throw new AirQualityError(`Erro ao buscar dados de qualidade do ar: ${error.message}`, error);
        }
    }

    /**
     * Processa dados brutos da API em formato padronizado
     * @param {Object} rawData - Dados brutos da API
     * @returns {Object} Dados processados e enriquecidos
     */
    _processAirQualityData(rawData) {
        const current = rawData.current;
        const units = rawData.current_units || {};

        // Calcula AQI principal (preferência para European AQI)
        const primaryAQI = current.european_aqi || current.us_aqi || null;
        const aqiType = current.european_aqi ? 'european' : 'us';

        // Processa poluentes individuais
        const pollutants = this._processPollutants(current, units);
        
        // Determina poluente dominante
        const dominantPollutant = this._findDominantPollutant(pollutants);
        
        // Gera classificação e recomendações
        const classification = this._classifyAQI(primaryAQI, aqiType);
        const healthRecommendation = this._getHealthRecommendation(classification);

        return {
            aqi: {
                value: primaryAQI,
                type: aqiType,
                classification: classification.level,
                color: classification.color,
                description: classification.description
            },
            pollutants,
            dominantPollutant,
            healthRecommendation,
            metadata: {
                timestamp: current.time,
                timezone: rawData.timezone,
                coordinates: {
                    latitude: rawData.latitude,
                    longitude: rawData.longitude
                },
                elevation: rawData.elevation
            },
            raw: rawData // Manter dados brutos para debug
        };
    }

    /**
     * Processa dados de poluentes individuais
     * @param {Object} current - Dados atuais da API
     * @param {Object} units - Unidades dos dados
     * @returns {Object} Poluentes processados
     */
    _processPollutants(current, units) {
        const pollutantMap = {
            pm10: { name: 'PM10', description: 'Material Particulado 10μm' },
            pm2_5: { name: 'PM2.5', description: 'Material Particulado 2.5μm' },
            carbon_monoxide: { name: 'CO', description: 'Monóxido de Carbono' },
            nitrogen_dioxide: { name: 'NO₂', description: 'Dióxido de Nitrogênio' },
            sulphur_dioxide: { name: 'SO₂', description: 'Dióxido de Enxofre' },
            ozone: { name: 'O₃', description: 'Ozônio' }
        };

        const pollutants = {};

        Object.entries(pollutantMap).forEach(([key, info]) => {
            if (current[key] !== undefined && current[key] !== null) {
                pollutants[key] = {
                    ...info,
                    value: current[key],
                    unit: units[key] || 'µg/m³',
                    level: this._categorizePollutantLevel(key, current[key])
                };
            }
        });

        return pollutants;
    }

    /**
     * Encontra o poluente dominante (com maior concentração relativa)
     * @param {Object} pollutants - Poluentes processados
     * @returns {Object|null} Poluente dominante
     */
    _findDominantPollutant(pollutants) {
        let dominant = null;
        let highestRatio = 0;

        // Limites seguros para comparação (WHO guidelines)
        const safetyLimits = {
            pm10: 50,    // µg/m³
            pm2_5: 25,   // µg/m³
            carbon_monoxide: 10000, // µg/m³
            nitrogen_dioxide: 40,    // µg/m³
            sulphur_dioxide: 125,    // µg/m³
            ozone: 120   // µg/m³
        };

        Object.entries(pollutants).forEach(([key, pollutant]) => {
            const limit = safetyLimits[key];
            if (limit && pollutant.value > 0) {
                const ratio = pollutant.value / limit;
                if (ratio > highestRatio) {
                    highestRatio = ratio;
                    dominant = {
                        ...pollutant,
                        key,
                        exceedsLimit: ratio > 1,
                        ratio
                    };
                }
            }
        });

        return dominant;
    }

    /**
     * Classifica nível de AQI
     * @param {number} aqi - Valor do AQI
     * @param {string} type - Tipo do AQI (european, us)
     * @returns {Object} Classificação do AQI
     */
    _classifyAQI(aqi, type = 'european') {
        if (!aqi) {
            return {
                level: 'unknown',
                color: '#gray',
                description: 'Dados não disponíveis'
            };
        }

        // Classificação European AQI
        if (type === 'european') {
            if (aqi <= 20) return { level: 'good', color: '#00E400', description: 'Boa' };
            if (aqi <= 40) return { level: 'fair', color: '#FFFF00', description: 'Razoável' };
            if (aqi <= 60) return { level: 'moderate', color: '#FF7E00', description: 'Moderada' };
            if (aqi <= 80) return { level: 'poor', color: '#FF0000', description: 'Ruim' };
            if (aqi <= 100) return { level: 'very-poor', color: '#8F3F97', description: 'Muito Ruim' };
            return { level: 'extremely-poor', color: '#7E0023', description: 'Extremamente Ruim' };
        }

        // Classificação US AQI
        if (aqi <= 50) return { level: 'good', color: '#00E400', description: 'Boa' };
        if (aqi <= 100) return { level: 'moderate', color: '#FFFF00', description: 'Moderada' };
        if (aqi <= 150) return { level: 'unhealthy-sensitive', color: '#FF7E00', description: 'Ruim para Grupos Sensíveis' };
        if (aqi <= 200) return { level: 'unhealthy', color: '#FF0000', description: 'Ruim' };
        if (aqi <= 300) return { level: 'very-unhealthy', color: '#8F3F97', description: 'Muito Ruim' };
        return { level: 'hazardous', color: '#7E0023', description: 'Perigosa' };
    }

    /**
     * Gera recomendações de saúde baseadas na classificação
     * @param {Object} classification - Classificação do AQI
     * @returns {Object} Recomendações de saúde
     */
    _getHealthRecommendation(classification) {
        const recommendations = {
            'good': {
                general: 'A qualidade do ar é considerada satisfatória. Aproveite atividades ao ar livre!',
                sensitive: 'Excelente para pessoas com sensibilidades respiratórias.',
                activities: 'Todas as atividades ao ar livre são recomendadas.'
            },
            'fair': {
                general: 'Qualidade do ar aceitável. A maioria das pessoas pode realizar atividades normais.',
                sensitive: 'Pessoas muito sensíveis devem considerar reduzir atividades prolongadas ao ar livre.',
                activities: 'Atividades normais são adequadas.'
            },
            'moderate': {
                general: 'Pessoas sensíveis podem experimentar sintomas respiratórios menores.',
                sensitive: 'Grupos sensíveis devem limitar atividades prolongadas ao ar livre.',
                activities: 'Reduza atividades extenuantes ao ar livre.'
            },
            'poor': {
                general: 'Todos podem começar a experimentar efeitos na saúde.',
                sensitive: 'Grupos sensíveis devem evitar atividades ao ar livre.',
                activities: 'Evite exercícios ao ar livre. Prefira ambientes fechados.'
            },
            'very-poor': {
                general: 'Alerta de saúde: todos podem experimentar efeitos mais sérios.',
                sensitive: 'Grupos sensíveis devem permanecer em ambientes fechados.',
                activities: 'Evite todas as atividades ao ar livre.'
            },
            'extremely-poor': {
                general: 'Emergência de saúde: toda a população pode ser afetada.',
                sensitive: 'Todos devem permanecer em ambientes fechados com ar filtrado.',
                activities: 'Permaneça em casa. Use purificadores de ar se disponível.'
            }
        };

        return recommendations[classification.level] || recommendations['good'];
    }

    /**
     * Categoriza nível de poluente individual
     * @param {string} pollutant - Tipo do poluente
     * @param {number} value - Valor do poluente
     * @returns {string} Categoria do nível
     */
    _categorizePollutantLevel(pollutant, value) {
        // Implementação simplificada - pode ser expandida
        const thresholds = {
            pm10: [20, 50, 100],
            pm2_5: [10, 25, 50],
            ozone: [60, 120, 180],
            nitrogen_dioxide: [20, 40, 80]
        };

        const limits = thresholds[pollutant] || [25, 50, 100];
        
        if (value <= limits[0]) return 'low';
        if (value <= limits[1]) return 'moderate';
        if (value <= limits[2]) return 'high';
        return 'very-high';
    }

    /**
     * Constrói URL para a API
     * @param {Object} params - Parâmetros da query
     * @returns {string} URL completa
     */
    _buildURL(params) {
        const url = new URL(this.baseURL);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value.toString());
            }
        });
        
        return url.toString();
    }

    /**
     * Testa conectividade com a API
     * @returns {Promise<boolean>} True se conectividade OK
     */
    async healthCheck() {
        try {
            // Testa com coordenadas de São Paulo
            const response = await fetch(this._buildURL({
                latitude: -23.5505,
                longitude: -46.6333,
                current: 'european_aqi'
            }));
            
            return response.ok;
        } catch (error) {
            console.warn('⚠️ AirQualityService: Health check failed', error.message);
            return false;
        }
    }
}

/**
 * Erro quando dados de qualidade do ar não estão disponíveis
 */
class AirQualityDataError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AirQualityDataError';
        this.userFriendly = true;
    }
}

/**
 * Erro geral do serviço de qualidade do ar
 */
class AirQualityError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'AirQualityError';
        this.originalError = originalError;
    }
}

export { AirQualityService, AirQualityDataError, AirQualityError };
