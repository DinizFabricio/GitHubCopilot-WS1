/**
 * GeocodingService - Serviço para conversão de endereços em coordenadas
 * Utiliza a API Nominatim do OpenStreetMap
 */
class GeocodingService {
    constructor() {
        this.baseURL = 'https://nominatim.openstreetmap.org';
        this.defaultParams = {
            format: 'json',
            limit: 1,
            addressdetails: 1
        };
    }

    /**
     * Converte endereço em coordenadas geográficas
     * @param {Object} location - Objeto com city, state, country
     * @returns {Promise<Object>} Coordenadas e informações de localização
     */
    async geocode({ city, state, country = 'US' }) {
        try {
            const query = this._buildQuery(city, state, country);
            const url = this._buildURL('search', { q: query, ...this.defaultParams });
            
            console.log(`🗺️ GeocodingService: Searching for "${query}"`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'AirQualityChecker/1.0 (Educational Project)'
                }
            });

            if (!response.ok) {
                throw new Error(`Geocoding API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new LocationNotFoundError(
                    `Localização não encontrada: ${city}, ${state}, ${country}`
                );
            }

            const location = data[0];
            
            const result = {
                lat: parseFloat(location.lat),
                lon: parseFloat(location.lon),
                display_name: location.display_name,
                address: this._extractAddress(location),
                boundingBox: location.boundingbox ? {
                    south: parseFloat(location.boundingbox[0]),
                    north: parseFloat(location.boundingbox[1]),
                    west: parseFloat(location.boundingbox[2]),
                    east: parseFloat(location.boundingbox[3])
                } : null,
                importance: location.importance,
                place_id: location.place_id
            };

            console.log(`✅ GeocodingService: Found location`, result);
            return result;

        } catch (error) {
            console.error('❌ GeocodingService: Error during geocoding', {
                location: { city, state, country },
                error: error.message
            });
            
            if (error instanceof LocationNotFoundError) {
                throw error;
            }
            
            throw new GeocodingError(`Erro ao buscar localização: ${error.message}`, error);
        }
    }

    /**
     * Busca detalhes de uma localização por coordenadas (geocodificação reversa)
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Detalhes da localização
     */
    async reverseGeocode(lat, lon) {
        try {
            const url = this._buildURL('reverse', {
                lat: lat.toString(),
                lon: lon.toString(),
                ...this.defaultParams
            });

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'AirQualityChecker/1.0 (Educational Project)'
                }
            });

            if (!response.ok) {
                throw new Error(`Reverse geocoding API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data || data.error) {
                throw new LocationNotFoundError(
                    `Não foi possível encontrar endereço para as coordenadas: ${lat}, ${lon}`
                );
            }

            return {
                display_name: data.display_name,
                address: this._extractAddress(data),
                place_id: data.place_id
            };

        } catch (error) {
            console.error('❌ GeocodingService: Error during reverse geocoding', {
                coordinates: { lat, lon },
                error: error.message
            });
            throw new GeocodingError(`Erro na geocodificação reversa: ${error.message}`, error);
        }
    }

    /**
     * Constrói a query de busca
     * @param {string} city - Cidade
     * @param {string} state - Estado
     * @param {string} country - País
     * @returns {string} Query formatada
     */
    _buildQuery(city, state, country) {
        const parts = [city, state];
        
        // Adiciona país se não for EUA ou se for especificado
        if (country && country.toUpperCase() !== 'US') {
            parts.push(country);
        }
        
        return parts.filter(part => part && part.trim()).join(', ');
    }

    /**
     * Constrói URL completa para a API
     * @param {string} endpoint - Endpoint da API (search, reverse)
     * @param {Object} params - Parâmetros da query
     * @returns {string} URL completa
     */
    _buildURL(endpoint, params) {
        const url = new URL(`${this.baseURL}/${endpoint}`);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value.toString());
            }
        });
        
        return url.toString();
    }

    /**
     * Extrai informações de endereço padronizadas
     * @param {Object} locationData - Dados da API Nominatim
     * @returns {Object} Endereço padronizado
     */
    _extractAddress(locationData) {
        const address = locationData.address || {};
        
        return {
            city: address.city || address.town || address.village || address.hamlet,
            state: address.state || address.province || address.region,
            country: address.country,
            countryCode: address.country_code?.toUpperCase(),
            postcode: address.postcode,
            county: address.county,
            suburb: address.suburb || address.neighbourhood,
            road: address.road,
            houseNumber: address.house_number
        };
    }

    /**
     * Testa conectividade com a API
     * @returns {Promise<boolean>} True se conectividade OK
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/status`, {
                method: 'GET',
                timeout: 5000
            });
            
            return response.ok;
        } catch (error) {
            console.warn('⚠️ GeocodingService: Health check failed', error.message);
            return false;
        }
    }
}

/**
 * Erro específico quando localização não é encontrada
 */
class LocationNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LocationNotFoundError';
        this.userFriendly = true;
    }
}

/**
 * Erro geral de geocodificação
 */
class GeocodingError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'GeocodingError';
        this.originalError = originalError;
    }
}

export { GeocodingService, LocationNotFoundError, GeocodingError };
