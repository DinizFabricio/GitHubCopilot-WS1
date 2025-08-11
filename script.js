// Aplicação de Verificação da Qualidade do Ar
// Funcionalidade completa com integração de APIs

class AirQualityApp {
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
    }

    // Inicializar event listeners
    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Limpar erros quando o usuário começar a digitar
        this.cityInput.addEventListener('input', () => this.clearFieldError(this.cityInput));
        this.stateInput.addEventListener('input', () => this.clearFieldError(this.stateInput));
        
        // Permitir envio com Enter
        [this.cityInput, this.stateInput, this.countryInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleFormSubmit(e);
                }
            });
        });
    }

    // Limpar erros de validação
    clearErrors() {
        this.cityInput.classList.remove('error');
        this.stateInput.classList.remove('error');
        this.cityError.style.display = 'none';
        this.stateError.style.display = 'none';
    }

    // Limpar erro de um campo específico
    clearFieldError(input) {
        if (input.classList.contains('error')) {
            this.clearErrors();
        }
    }

    // Mostrar erro em um campo
    showFieldError(input, errorElement, message) {
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        input.focus();
    }

    // Validar formulário
    validateForm() {
        this.clearErrors();
        
        const city = this.cityInput.value.trim();
        const state = this.stateInput.value.trim();
        let isValid = true;

        // Validação da cidade
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

        // Validação do estado
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

    // Formatar localização para exibição
    formatLocation(city, state, country) {
        const defaultCountry = country || 'EUA';
        return `${city}, ${state}, ${defaultCountry}`;
    }

    // Processar envio do formulário
    async handleFormSubmit(event) {
        event.preventDefault();
        
        // Ocultar mensagens anteriores
        this.hideMessages();
        
        // Validar
        if (!this.validateForm()) {
            return;
        }
        
        // Obter valores
        const city = this.cityInput.value.trim();
        const state = this.stateInput.value.trim();
        const country = this.countryInput.value.trim() || 'EUA';
        
        // Iniciar processo de busca
        this.setLoadingState(true);
        
        try {
            // 1. Buscar coordenadas geográficas
            const coordinates = await this.getCoordinates(city, state, country);
            
            // 2. Buscar dados de qualidade do ar
            const airQualityData = await this.getAirQualityData(coordinates.lat, coordinates.lon);
            
            // 3. Exibir resultados
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

    // Buscar coordenadas geográficas usando Nominatim
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

    // Buscar dados de qualidade do ar usando Open-Meteo
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
            
            // Pegar o último horário disponível (mais recente)
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

    // Determinar nível de saúde baseado no IQA
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

    // Formatar nome do poluente
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

    // Formatar data e hora
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

    // Definir estado de carregamento
    setLoadingState(loading) {
        this.submitButton.disabled = loading;
        this.submitButton.textContent = loading ? 'Buscando dados...' : 'Verificar Qualidade do Ar';
        
        if (this.loadingElement) {
            this.loadingElement.style.display = loading ? 'block' : 'none';
        }
    }

    // Ocultar todas as mensagens
    hideMessages() {
        this.successMessage.style.display = 'none';
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
        }
    }

    // Exibir resultados da qualidade do ar
    displayResults(data) {
        const { location, coordinates, airData } = data;
        const healthInfo = this.getHealthLevel(airData.aqi);
        
        // Ocultar mensagem de sucesso simples
        this.successMessage.style.display = 'none';
        
        // Criar ou atualizar container de resultados
        if (!this.resultContainer) {
            this.createResultContainer();
        }
        
        // Montar HTML dos resultados
        const resultsHTML = `
            <div class="result-header">
                <h3>📍 ${location}</h3>
                <p class="coordinates">Coordenadas: ${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}</p>
                <p class="timestamp">Dados atualizados em: ${this.formatDateTime(airData.time)}</p>
            </div>
            
            <div class="aqi-main">
                <div class="aqi-circle" style="border-color: ${healthInfo.color}">
                    <span class="aqi-value">${airData.aqi || 'N/A'}</span>
                    <span class="aqi-label">IQA</span>
                </div>
                <div class="aqi-info">
                    <h4 style="color: ${healthInfo.color}">${healthInfo.text}</h4>
                    <p class="health-description">${healthInfo.description}</p>
                </div>
            </div>
            
            <div class="pollutant-details">
                <h4>📊 Detalhes dos Poluentes</h4>
                <div class="pollutants-grid">
                    <div class="pollutant-item">
                        <span class="pollutant-name">Poluente Dominante:</span>
                        <span class="pollutant-value">${this.formatPollutantName(airData.dominantPollutant)}</span>
                    </div>
                    ${airData.pm25 !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">PM2.5:</span>
                        <span class="pollutant-value">${airData.pm25} µg/m³</span>
                    </div>
                    ` : ''}
                    ${airData.pm10 !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">PM10:</span>
                        <span class="pollutant-value">${airData.pm10} µg/m³</span>
                    </div>
                    ` : ''}
                    ${airData.o3 !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">Ozônio (O₃):</span>
                        <span class="pollutant-value">${airData.o3} µg/m³</span>
                    </div>
                    ` : ''}
                    ${airData.no2 !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">NO₂:</span>
                        <span class="pollutant-value">${airData.no2} µg/m³</span>
                    </div>
                    ` : ''}
                    ${airData.so2 !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">SO₂:</span>
                        <span class="pollutant-value">${airData.so2} µg/m³</span>
                    </div>
                    ` : ''}
                    ${airData.co !== null ? `
                    <div class="pollutant-item">
                        <span class="pollutant-name">CO:</span>
                        <span class="pollutant-value">${airData.co} µg/m³</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="health-recommendations">
                <h4>💡 Recomendações de Saúde</h4>
                <div class="recommendations">
                    ${this.getHealthRecommendations(airData.aqi)}
                </div>
            </div>
        `;
        
        this.resultContainer.innerHTML = resultsHTML;
        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.remove('error');
        this.resultContainer.classList.add('success');
        
        // Scroll suave para os resultados
        setTimeout(() => {
            this.resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Obter recomendações de saúde baseadas no IQA
    getHealthRecommendations(aqi) {
        if (aqi <= 50) {
            return `
                <div class="recommendation good">
                    ✅ Qualidade do ar excelente para atividades ao ar livre.
                </div>
                <div class="recommendation good">
                    🏃‍♂️ Ideal para exercícios e atividades físicas externas.
                </div>
            `;
        } else if (aqi <= 100) {
            return `
                <div class="recommendation moderate">
                    ⚠️ Pessoas sensíveis devem considerar reduzir atividades ao ar livre prolongadas.
                </div>
                <div class="recommendation moderate">
                    🚴‍♀️ Atividades moderadas ao ar livre são geralmente aceitáveis.
                </div>
            `;
        } else if (aqi <= 150) {
            return `
                <div class="recommendation unhealthy">
                    🚨 Pessoas com doenças respiratórias devem limitar atividades ao ar livre.
                </div>
                <div class="recommendation unhealthy">
                    👥 Crianças e idosos devem reduzir exercícios prolongados ao ar livre.
                </div>
            `;
        } else if (aqi <= 200) {
            return `
                <div class="recommendation unhealthy">
                    ⛔ Evite atividades físicas ao ar livre.
                </div>
                <div class="recommendation unhealthy">
                    🏠 Mantenha janelas fechadas e use purificadores de ar se disponível.
                </div>
            `;
        } else {
            return `
                <div class="recommendation hazardous">
                    🚨 ALERTA: Evite sair de casa desnecessariamente.
                </div>
                <div class="recommendation hazardous">
                    😷 Se precisar sair, use máscara adequada para partículas.
                </div>
                <div class="recommendation hazardous">
                    🏠 Mantenha-se em ambientes fechados e bem ventilados.
                </div>
            `;
        }
    }

    // Criar container de resultados se não existir
    createResultContainer() {
        if (!this.resultContainer) {
            this.resultContainer = document.createElement('div');
            this.resultContainer.id = 'result';
            this.resultContainer.className = 'result-container';
            this.form.parentNode.appendChild(this.resultContainer);
        }
    }

    // Exibir erro
    displayError(message) {
        this.createResultContainer();
        
        this.resultContainer.innerHTML = `
            <div class="error-content">
                <div class="error-icon">❌</div>
                <h3>Erro ao buscar dados</h3>
                <p>${message}</p>
                <div class="error-suggestions">
                    <h4>Sugestões:</h4>
                    <ul>
                        <li>Verifique se a cidade e estado estão escritos corretamente</li>
                        <li>Tente usar nomes em português ou inglês</li>
                        <li>Verifique sua conexão com a internet</li>
                        <li>Tente novamente em alguns minutos</li>
                    </ul>
                </div>
            </div>
        `;
        
        this.resultContainer.style.display = 'block';
        this.resultContainer.classList.remove('success');
        this.resultContainer.classList.add('error');
        
        // Scroll para o erro
        setTimeout(() => {
            this.resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Resetar formulário
    resetForm() {
        this.form.reset();
        this.clearErrors();
        this.successMessage.style.display = 'none';
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const app = new AirQualityApp();
    
    // Expor para testes
    if (typeof window !== 'undefined') {
        window.airQualityApp = app;
    }
});

// Exportar para testes (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AirQualityApp;
}
