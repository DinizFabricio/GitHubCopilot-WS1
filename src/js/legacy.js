/**
 * Legacy Compatibility Script
 * Mantém o script original para fallback e compatibilidade
 */

// Re-exporta a classe original para compatibilidade
class LegacyAirQualityApp {
    constructor() {
        this.form = document.getElementById('airQualityForm');
        this.cityInput = document.getElementById('city');
        this.stateInput = document.getElementById('state');
        this.countryInput = document.getElementById('country');
        this.submitButton = document.getElementById('submitButton');
        this.successMessage = document.getElementById('successMessage');
        this.locationDisplay = document.getElementById('locationDisplay');
        this.loadingElement = document.getElementById('loading');
        this.resultContainer = document.getElementById('result');
        
        this.cityError = document.getElementById('cityError');
        this.stateError = document.getElementById('stateError');
        
        // URLs das APIs
        this.geocodingAPI = 'https://nominatim.openstreetmap.org/search';
        this.airQualityAPI = 'https://air-quality-api.open-meteo.com/v1/air-quality';
        
        this.initializeEventListeners();
        
        console.log('📜 Legacy AirQualityApp initialized as fallback');
    }

    // Todos os métodos originais mantidos exatamente como estavam
    initializeEventListeners() {
        if (!this.form) return; // Proteção se elementos não existirem
        
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        if (this.cityInput) {
            this.cityInput.addEventListener('input', () => this.clearFieldError(this.cityInput));
        }
        if (this.stateInput) {
            this.stateInput.addEventListener('input', () => this.clearFieldError(this.stateInput));
        }
        
        [this.cityInput, this.stateInput, this.countryInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleFormSubmit(e);
                    }
                });
            }
        });
    }

    clearErrors() {
        if (this.cityInput) this.cityInput.classList.remove('error');
        if (this.stateInput) this.stateInput.classList.remove('error');
        if (this.cityError) this.cityError.style.display = 'none';
        if (this.stateError) this.stateError.style.display = 'none';
    }

    clearFieldError(input) {
        if (input && input.classList.contains('error')) {
            this.clearErrors();
        }
    }

    showFieldError(input, errorElement, message) {
        if (input && errorElement) {
            input.classList.add('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            input.focus();
        }
    }

    validateForm() {
        this.clearErrors();
        
        const city = this.cityInput?.value.trim() || '';
        const state = this.stateInput?.value.trim() || '';
        let isValid = true;

        if (!city) {
            this.showFieldError(this.cityInput, this.cityError, 'Por favor, informe o nome da cidade.');
            isValid = false;
        } else if (city.length < 2) {
            this.showFieldError(this.cityInput, this.cityError, 'O nome da cidade deve ter pelo menos 2 caracteres.');
            isValid = false;
        } else if (!/^[a-zA-ZÀ-ÿ\s.-]+$/.test(city)) {
            this.showFieldError(this.cityInput, this.cityError, 'O nome da cidade contém caracteres inválidos.');
            isValid = false;
        }

        if (!state) {
            this.showFieldError(this.stateInput, this.stateError, 'Por favor, informe o estado/província/região.');
            isValid = false;
        } else if (state.length < 2) {
            this.showFieldError(this.stateInput, this.stateError, 'O estado/província/região deve ter pelo menos 2 caracteres.');
            isValid = false;
        } else if (!/^[a-zA-ZÀ-ÿ\s.-]+$/.test(state)) {
            this.showFieldError(this.stateInput, this.stateError, 'O estado/província/região contém caracteres inválidos.');
            isValid = false;
        }

        return isValid;
    }

    formatLocation(city, state, country) {
        const defaultCountry = country || 'EUA';
        return `${city}, ${state}, ${defaultCountry}`;
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        this.hideMessages();
        
        if (!this.validateForm()) {
            return;
        }
        
        const city = this.cityInput?.value.trim() || '';
        const state = this.stateInput?.value.trim() || '';
        const country = this.countryInput?.value.trim() || 'EUA';
        
        this.setLoadingState(true);
        
        try {
            const coordinates = await this.getCoordinates(city, state, country);
            const airQualityData = await this.getAirQualityData(coordinates.lat, coordinates.lon);
            
            this.displayResults({
                location: `${city}, ${state}, ${country}`,
                coordinates: coordinates,
                airData: airQualityData
            });
            
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            this.displayError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async getCoordinates(city, state, country) {
        const query = `${city}, ${state}, ${country}`;
        const url = `${this.geocodingAPI}?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'AirQualityApp/1.0',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro na API de geocodificação: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('Localização não encontrada. Verifique se a cidade, estado e país estão corretos.');
            }
            
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                displayName: result.display_name
            };
            
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Erro de conexão. Verifique sua conexão com a internet.');
            }
            throw error;
        }
    }

    async getAirQualityData(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            hourly: 'us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dominant_pollutant',
            timezone: 'auto',
            forecast_days: 1
        });
        
        const url = `${this.airQualityAPI}?${params}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro na API de qualidade do ar: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.hourly || !data.hourly.time) {
                throw new Error('Dados de qualidade do ar não disponíveis para esta localização.');
            }
            
            const times = data.hourly.time;
            const currentIndex = times.length - 1;
            
            return {
                time: times[currentIndex],
                aqi: data.hourly.us_aqi[currentIndex],
                pm10: data.hourly.pm10[currentIndex],
                pm25: data.hourly.pm2_5[currentIndex],
                co: data.hourly.carbon_monoxide[currentIndex],
                no2: data.hourly.nitrogen_dioxide[currentIndex],
                so2: data.hourly.sulphur_dioxide[currentIndex],
                o3: data.hourly.ozone[currentIndex],
                dominantPollutant: data.hourly.dominant_pollutant[currentIndex]
            };
            
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Erro de conexão com o serviço de qualidade do ar.');
            }
            throw error;
        }
    }

    getHealthLevel(aqi) {
        if (aqi === null || aqi === undefined || isNaN(aqi)) {
            return { 
                level: 'unknown', 
                text: 'Dados não disponíveis',
                color: '#666',
                description: 'Não foi possível determinar a qualidade do ar.'
            };
        }

        if (aqi <= 50) {
            return { 
                level: 'good', 
                text: 'Boa',
                color: '#00e400',
                description: 'A qualidade do ar é satisfatória e representa pouco ou nenhum risco à saúde.'
            };
        }
        if (aqi <= 100) {
            return { 
                level: 'moderate', 
                text: 'Moderada',
                color: '#ffff00',
                description: 'A qualidade do ar é aceitável. Pessoas sensíveis podem ter sintomas leves.'
            };
        }
        if (aqi <= 150) {
            return { 
                level: 'unhealthy-sensitive', 
                text: 'Insalubre para grupos sensíveis',
                color: '#ff7e00',
                description: 'Pessoas com doenças respiratórias, crianças e idosos podem ser afetados.'
            };
        }
        if (aqi <= 200) {
            return { 
                level: 'unhealthy', 
                text: 'Insalubre',
                color: '#ff0000',
                description: 'Todos podem começar a sentir efeitos na saúde. Grupos sensíveis podem ter efeitos mais sérios.'
            };
        }
        if (aqi <= 300) {
            return { 
                level: 'very-unhealthy', 
                text: 'Muito insalubre',
                color: '#8f3f97',
                description: 'Alerta de saúde: todos podem sentir efeitos mais sérios na saúde.'
            };
        }
        return { 
            level: 'hazardous', 
            text: 'Perigoso',
            color: '#7e0023',
            description: 'Alerta de emergência: todos estão mais propensos a serem afetados.'
        };
    }

    formatPollutantName(pollutant) {
        const pollutants = {
            'pm2_5': 'PM2.5',
            'pm10': 'PM10',
            'carbon_monoxide': 'Monóxido de Carbono (CO)',
            'nitrogen_dioxide': 'Dióxido de Nitrogênio (NO₂)',
            'sulphur_dioxide': 'Dióxido de Enxofre (SO₂)',
            'ozone': 'Ozônio (O₃)'
        };
        return pollutants[pollutant] || pollutant;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    }

    setLoadingState(loading) {
        if (this.submitButton) {
            this.submitButton.disabled = loading;
            this.submitButton.textContent = loading ? 'Buscando dados...' : 'Verificar Qualidade do Ar';
        }
        
        if (this.loadingElement) {
            this.loadingElement.style.display = loading ? 'block' : 'none';
        }
    }

    hideMessages() {
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
        }
    }

    displayResults(data) {
        const { location, coordinates, airData } = data;
        const healthInfo = this.getHealthLevel(airData.aqi);
        
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
        
        if (!this.resultContainer) {
            this.createResultContainer();
        }
        
        // Simplified results display for legacy mode
        const resultsHTML = `
            <div class="legacy-results">
                <h3>📍 ${location}</h3>
                <div class="aqi-display">
                    <div class="aqi-value" style="color: ${healthInfo.color}">
                        ${airData.aqi || 'N/A'}
                    </div>
                    <div class="aqi-status" style="color: ${healthInfo.color}">
                        ${healthInfo.text}
                    </div>
                </div>
                <p>${healthInfo.description}</p>
                <small>Atualizado: ${this.formatDateTime(airData.time)}</small>
            </div>
        `;
        
        this.resultContainer.innerHTML = resultsHTML;
        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.remove('error');
        this.resultContainer.classList.add('success');
        
        setTimeout(() => {
            this.resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    createResultContainer() {
        if (!this.resultContainer) {
            this.resultContainer = document.createElement('div');
            this.resultContainer.id = 'result';
            this.resultContainer.className = 'result-container legacy-result';
            
            const container = document.querySelector('.app-container') || 
                            document.querySelector('.container') || 
                            document.body;
            container.appendChild(this.resultContainer);
        }
    }

    displayError(message) {
        this.createResultContainer();
        
        this.resultContainer.innerHTML = `
            <div class="legacy-error">
                <h3>❌ Erro ao buscar dados</h3>
                <p>${message}</p>
            </div>
        `;
        
        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.remove('success');
        this.resultContainer.classList.add('error');
        
        setTimeout(() => {
            this.resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
        }
        this.clearErrors();
        if (this.successMessage) {
            this.successMessage.style.display = 'none';
        }
    }
}

// Disponibilizar globalmente para fallback
if (typeof window !== 'undefined') {
    window.AirQualityApp = LegacyAirQualityApp;
}

// Export para módulos
export default LegacyAirQualityApp;
