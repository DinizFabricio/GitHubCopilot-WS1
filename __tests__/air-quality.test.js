// __tests__/air-quality.test.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { screen, fireEvent, waitFor, getByTestId } = require('@testing-library/dom');
require('@testing-library/jest-dom');

// Mock das respostas das APIs - Cenários diversos
const mockResponses = {
    geocoding: {
        success: [
            {
                lat: "-23.5505",
                lon: "-46.6333",
                display_name: "São Paulo, Estado de São Paulo, Brasil"
            }
        ],
        newYork: [
            {
                lat: "40.7128",
                lon: "-74.0060",
                display_name: "New York, NY, United States"
            }
        ],
        london: [
            {
                lat: "51.5074",
                lon: "-0.1278",
                display_name: "London, England, United Kingdom"
            }
        ],
        empty: [],
        multipleResults: [
            {
                lat: "-23.5505",
                lon: "-46.6333",
                display_name: "São Paulo, Estado de São Paulo, Brasil"
            },
            {
                lat: "-23.9608",
                lon: "-46.3331",
                display_name: "São Paulo, Município de São Paulo, Brasil"
            }
        ]
    },
    airQuality: {
        good: {
            hourly: {
                time: ["2025-08-11T12:00"],
                us_aqi: [42],
                pm10: [15],
                pm2_5: [8],
                carbon_monoxide: [120],
                nitrogen_dioxide: [12],
                sulphur_dioxide: [3],
                ozone: [65],
                dominant_pollutant: ["pm2_5"]
            }
        },
        moderate: {
            hourly: {
                time: ["2025-08-11T14:00"],
                us_aqi: [75],
                pm10: [45],
                pm2_5: [25],
                carbon_monoxide: [230],
                nitrogen_dioxide: [15],
                sulphur_dioxide: [5],
                ozone: [80],
                dominant_pollutant: ["pm2_5"]
            }
        },
        unhealthy: {
            hourly: {
                time: ["2025-08-11T16:00"],
                us_aqi: [165],
                pm10: [85],
                pm2_5: [55],
                carbon_monoxide: [450],
                nitrogen_dioxide: [35],
                sulphur_dioxide: [15],
                ozone: [140],
                dominant_pollutant: ["pm2_5"]
            }
        },
        hazardous: {
            hourly: {
                time: ["2025-08-11T18:00"],
                us_aqi: [350],
                pm10: [180],
                pm2_5: [120],
                carbon_monoxide: [800],
                nitrogen_dioxide: [65],
                sulphur_dioxide: [40],
                ozone: [220],
                dominant_pollutant: ["pm2_5"]
            }
        },
        incomplete: {
            hourly: {
                time: ["2025-08-11T20:00"],
                us_aqi: [null],
                pm10: [null],
                pm2_5: [25],
                carbon_monoxide: [230],
                nitrogen_dioxide: [null],
                sulphur_dioxide: [5],
                ozone: [null],
                dominant_pollutant: ["pm2_5"]
            }
        },
        empty: {
            hourly: {
                time: [],
                us_aqi: [],
                pm10: [],
                pm2_5: [],
                carbon_monoxide: [],
                nitrogen_dioxide: [],
                sulphur_dioxide: [],
                ozone: [],
                dominant_pollutant: []
            }
        }
    }
};

// Utilitários para setup de DOM
function setupDOM() {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const script = fs.readFileSync(path.resolve(__dirname, '../script.js'), 'utf8');
    
    const dom = new JSDOM(html, { 
        runScripts: 'dangerously',
        resources: 'usable',
        url: 'http://localhost',
        pretendToBeVisual: true
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;
    global.fetch = jest.fn();
    
    // Mock do console para evitar spam nos testes
    global.console = {
        ...console,
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    };
    
    // Executa o script manualmente
    const scriptEl = dom.window.document.createElement('script');
    scriptEl.textContent = script;
    dom.window.document.head.appendChild(scriptEl);
    
    // Dispara o evento DOMContentLoaded
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    
    return dom;
}

function fillForm(city, state, country = '') {
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const countryInput = document.getElementById('country');
    
    fireEvent.change(cityInput, { target: { value: city } });
    fireEvent.change(stateInput, { target: { value: state } });
    if (country) {
        fireEvent.change(countryInput, { target: { value: country } });
    }
}

function submitForm() {
    const form = document.getElementById('airQualityForm');
    fireEvent.submit(form);
}

function mockAPISuccess(geoResponse, airResponse) {
    global.fetch
        .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(geoResponse)
        })
        .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(airResponse)
        });
}

// =============================================================================
// TESTES UNITÁRIOS - VALIDAÇÃO DE FORMULÁRIO
// =============================================================================

describe('🧪 TESTES UNITÁRIOS - Validação de Formulário', () => {
    beforeEach(() => {
        setupDOM();
    });

    describe('Elementos do DOM', () => {
        test('deve carregar todos os elementos necessários', () => {
            expect(document.getElementById('airQualityForm')).toBeInTheDocument();
            expect(document.getElementById('city')).toBeInTheDocument();
            expect(document.getElementById('state')).toBeInTheDocument();
            expect(document.getElementById('country')).toBeInTheDocument();
            expect(document.getElementById('submitButton')).toBeInTheDocument();
            expect(document.getElementById('cityError')).toBeInTheDocument();
            expect(document.getElementById('stateError')).toBeInTheDocument();
        });

        test('deve ter atributos corretos nos campos', () => {
            const cityInput = document.getElementById('city');
            const stateInput = document.getElementById('state');
            const countryInput = document.getElementById('country');

            expect(cityInput).toHaveAttribute('required');
            expect(stateInput).toHaveAttribute('required');
            expect(countryInput).not.toHaveAttribute('required');
            
            expect(cityInput).toHaveAttribute('placeholder');
            expect(stateInput).toHaveAttribute('placeholder');
            expect(countryInput).toHaveAttribute('placeholder');
        });
    });

    describe('Validação de Campos Obrigatórios', () => {
        test('deve mostrar erro quando cidade está vazia', () => {
            fillForm('', 'SP');
            submitForm();

            const cityError = document.getElementById('cityError');
            expect(cityError.style.display).toBe('block');
            expect(cityError.textContent).toContain('Por favor, informe o nome da cidade');
        });

        test('deve mostrar erro quando estado está vazio', () => {
            fillForm('São Paulo', '');
            submitForm();

            const stateError = document.getElementById('stateError');
            expect(stateError.style.display).toBe('block');
            expect(stateError.textContent).toContain('Por favor, informe o estado');
        });

        test('deve mostrar erros para ambos os campos quando vazios', () => {
            fillForm('', '');
            submitForm();

            const cityError = document.getElementById('cityError');
            const stateError = document.getElementById('stateError');
            
            expect(cityError.style.display).toBe('block');
            expect(stateError.style.display).toBe('block');
        });
    });

    describe('Validação de Tamanho Mínimo', () => {
        test('deve rejeitar cidade com menos de 2 caracteres', () => {
            fillForm('A', 'SP');
            submitForm();

            const cityError = document.getElementById('cityError');
            expect(cityError.style.display).toBe('block');
            expect(cityError.textContent).toContain('pelo menos 2 caracteres');
        });

        test('deve rejeitar estado com menos de 2 caracteres', () => {
            fillForm('São Paulo', 'S');
            submitForm();

            const stateError = document.getElementById('stateError');
            expect(stateError.style.display).toBe('block');
            expect(stateError.textContent).toContain('pelo menos 2 caracteres');
        });

        test('deve aceitar campos com 2 ou mais caracteres', () => {
            fillForm('SP', 'SP');
            submitForm();

            const cityError = document.getElementById('cityError');
            const stateError = document.getElementById('stateError');
            
            expect(cityError.style.display).toBe('none');
            expect(stateError.style.display).toBe('none');
        });
    });

    describe('Validação de Caracteres', () => {
        test('deve rejeitar números na cidade', () => {
            fillForm('São Paulo123', 'SP');
            submitForm();

            const cityError = document.getElementById('cityError');
            expect(cityError.style.display).toBe('block');
            expect(cityError.textContent).toContain('caracteres inválidos');
        });

        test('deve rejeitar símbolos especiais no estado', () => {
            fillForm('São Paulo', 'SP@#$');
            submitForm();

            const stateError = document.getElementById('stateError');
            expect(stateError.style.display).toBe('block');
            expect(stateError.textContent).toContain('caracteres inválidos');
        });

        test('deve aceitar acentos e hífens', () => {
            fillForm('São João-da-Boa-Vista', 'Minas-Gerais');
            submitForm();

            const cityError = document.getElementById('cityError');
            const stateError = document.getElementById('stateError');
            
            expect(cityError.style.display).toBe('none');
            expect(stateError.style.display).toBe('none');
        });

        test('deve aceitar pontos e espaços', () => {
            fillForm('St. Petersburg', 'Rio Grande do Sul');
            submitForm();

            const cityError = document.getElementById('cityError');
            const stateError = document.getElementById('stateError');
            
            expect(cityError.style.display).toBe('none');
            expect(stateError.style.display).toBe('none');
        });
    });

    describe('Limpeza Automática de Erros', () => {
        test('deve limpar erros quando usuário digita na cidade', () => {
            // Provoca erro
            fillForm('', 'SP');
            submitForm();
            
            const cityError = document.getElementById('cityError');
            expect(cityError.style.display).toBe('block');

            // Digita na cidade
            const cityInput = document.getElementById('city');
            fireEvent.input(cityInput, { target: { value: 'S' } });
            
            expect(cityError.style.display).toBe('none');
        });

        test('deve limpar erros quando usuário digita no estado', () => {
            // Provoca erro
            fillForm('São Paulo', '');
            submitForm();
            
            const stateError = document.getElementById('stateError');
            expect(stateError.style.display).toBe('block');

            // Digita no estado
            const stateInput = document.getElementById('state');
            fireEvent.input(stateInput, { target: { value: 'S' } });
            
            expect(stateError.style.display).toBe('none');
        });
    });
});

// =============================================================================
// TESTES UNITÁRIOS - LÓGICA DA API
// =============================================================================

describe('🌐 TESTES UNITÁRIOS - Lógica da API', () => {
    beforeEach(() => {
        setupDOM();
        global.fetch.mockClear();
    });

    describe('Geocoding API', () => {
        test('deve fazer requisição com parâmetros corretos', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([MOCK_RESPONSES.geocoding.success])
            });

            fillForm('São Paulo', 'SP', 'Brazil');
            await submitFormAndWait();

            const geocodingCall = global.fetch.mock.calls[0];
            expect(geocodingCall[0]).toContain('nominatim.openstreetmap.org');
            expect(geocodingCall[0]).toContain('São Paulo');
            expect(geocodingCall[0]).toContain('SP');
            expect(geocodingCall[0]).toContain('Brazil');
            expect(geocodingCall[0]).toContain('format=json');
        });

        test('deve tratar resposta vazia da geocoding', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            fillForm('CidadeInexistente', 'EstadoInexistente');
            await submitFormAndWait();

            const errorContainer = document.getElementById('errorContainer');
            expect(errorContainer.style.display).toBe('block');
            expect(errorContainer.textContent).toContain('Localização não encontrada');
        });

        test('deve tratar erro de rede na geocoding', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const errorContainer = document.getElementById('errorContainer');
            expect(errorContainer.style.display).toBe('block');
            expect(errorContainer.textContent).toContain('Erro de conexão');
        });
    });

    describe('Air Quality API', () => {
        test('deve fazer requisição com coordenadas corretas', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const airQualityCall = global.fetch.mock.calls[1];
            expect(airQualityCall[0]).toContain('air-quality.open-meteo.com');
            expect(airQualityCall[0]).toContain('latitude=-23.55');
            expect(airQualityCall[0]).toContain('longitude=-46.63');
            expect(airQualityCall[0]).toContain('current=european_aqi');
        });

        test('deve tratar erro HTTP da Air Quality API', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([MOCK_RESPONSES.geocoding.success])
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500
                });

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const errorContainer = document.getElementById('errorContainer');
            expect(errorContainer.style.display).toBe('block');
            expect(errorContainer.textContent).toContain('Erro no serviço de qualidade do ar');
        });

        test('deve tratar dados incompletos da API', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve([MOCK_RESPONSES.geocoding.success])
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ current: {} })
                });

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const errorContainer = document.getElementById('errorContainer');
            expect(errorContainer.style.display).toBe('block');
            expect(errorContainer.textContent).toContain('Dados de qualidade do ar não disponíveis');
        });
    });
});

// =============================================================================
// TESTES DE INTEGRAÇÃO - RENDERIZAÇÃO DE RESULTADOS
// =============================================================================

describe('🎨 TESTES DE INTEGRAÇÃO - Renderização de Resultados', () => {
    beforeEach(() => {
        setupDOM();
        global.fetch.mockClear();
    });

    describe('Renderização de Qualidade Boa', () => {
        test('deve renderizar corretamente qualidade boa (AQI 15)', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            // Verifica se os resultados são exibidos
            const resultContainer = document.getElementById('resultContainer');
            expect(resultContainer.style.display).toBe('block');

            // Verifica informações da localização
            const locationInfo = document.getElementById('locationInfo');
            expect(locationInfo.textContent).toContain('São Paulo');

            // Verifica índice AQI
            const aqiValue = document.getElementById('aqiValue');
            expect(aqiValue.textContent).toBe('15');

            // Verifica classificação
            const aqiLabel = document.getElementById('aqiLabel');
            expect(aqiLabel.textContent).toBe('Boa');

            // Verifica cor do indicador
            const aqiIndicator = document.querySelector('.aqi-indicator');
            expect(aqiIndicator.className).toContain('good');

            // Verifica recomendação de saúde
            const healthRecommendation = document.getElementById('healthRecommendation');
            expect(healthRecommendation.textContent).toContain('A qualidade do ar é considerada satisfatória');
        });
    });

    describe('Renderização de Qualidade Moderada', () => {
        test('deve renderizar corretamente qualidade moderada (AQI 65)', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.moderate
            );

            fillForm('Rio de Janeiro', 'RJ');
            await submitFormAndWait();

            const aqiValue = document.getElementById('aqiValue');
            const aqiLabel = document.getElementById('aqiLabel');
            const aqiIndicator = document.querySelector('.aqi-indicator');
            
            expect(aqiValue.textContent).toBe('65');
            expect(aqiLabel.textContent).toBe('Moderada');
            expect(aqiIndicator.className).toContain('moderate');

            const healthRecommendation = document.getElementById('healthRecommendation');
            expect(healthRecommendation.textContent).toContain('Pessoas sensíveis podem experimentar sintomas respiratórios');
        });
    });

    describe('Renderização de Qualidade Ruim', () => {
        test('deve renderizar corretamente qualidade ruim (AQI 125)', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.unhealthy
            );

            fillForm('Pequim', 'China');
            await submitFormAndWait();

            const aqiValue = document.getElementById('aqiValue');
            const aqiLabel = document.getElementById('aqiLabel');
            const aqiIndicator = document.querySelector('.aqi-indicator');
            
            expect(aqiValue.textContent).toBe('125');
            expect(aqiLabel.textContent).toBe('Ruim para Grupos Sensíveis');
            expect(aqiIndicator.className).toContain('unhealthy-sensitive');

            const healthRecommendation = document.getElementById('healthRecommendation');
            expect(healthRecommendation.textContent).toContain('Grupos sensíveis devem evitar atividades ao ar livre');
        });
    });

    describe('Renderização de Qualidade Muito Ruim', () => {
        test('deve renderizar corretamente qualidade muito ruim (AQI 220)', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.veryUnhealthy
            );

            fillForm('Delhi', 'India');
            await submitFormAndWait();

            const aqiValue = document.getElementById('aqiValue');
            const aqiLabel = document.getElementById('aqiLabel');
            const aqiIndicator = document.querySelector('.aqi-indicator');
            
            expect(aqiValue.textContent).toBe('220');
            expect(aqiLabel.textContent).toBe('Muito Ruim');
            expect(aqiIndicator.className).toContain('very-unhealthy');

            const healthRecommendation = document.getElementById('healthRecommendation');
            expect(healthRecommendation.textContent).toContain('Todos devem evitar atividades ao ar livre');
        });
    });

    describe('Detalhes dos Poluentes', () => {
        test('deve exibir detalhes dos poluentes quando disponíveis', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.withPollutants
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            // Verifica se a seção de poluentes é exibida
            const pollutantsSection = document.getElementById('pollutantsDetails');
            expect(pollutantsSection.style.display).toBe('block');

            // Verifica valores dos poluentes
            const pm25Value = document.getElementById('pm25Value');
            const pm10Value = document.getElementById('pm10Value');
            const no2Value = document.getElementById('no2Value');
            const o3Value = document.getElementById('o3Value');

            expect(pm25Value.textContent).toBe('25.5 µg/m³');
            expect(pm10Value.textContent).toBe('45.2 µg/m³');
            expect(no2Value.textContent).toBe('35.1 µg/m³');
            expect(o3Value.textContent).toBe('80.3 µg/m³');
        });

        test('deve ocultar seção de poluentes quando não disponível', async () => {
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const pollutantsSection = document.getElementById('pollutantsDetails');
            expect(pollutantsSection.style.display).toBe('none');
        });
    });
});

// =============================================================================
// TESTES DE INTEGRAÇÃO - FLUXO COMPLETO
// =============================================================================

describe('🔄 TESTES DE INTEGRAÇÃO - Fluxo Completo', () => {
    beforeEach(() => {
        setupDOM();
        global.fetch.mockClear();
    });

    describe('Estados de Carregamento', () => {
        test('deve mostrar e ocultar loading durante requisição', async () => {
            // Mock para simular delay nas respostas
            let resolveGeo, resolveAir;
            global.fetch
                .mockReturnValueOnce(new Promise(resolve => { resolveGeo = resolve; }))
                .mockReturnValueOnce(new Promise(resolve => { resolveAir = resolve; }));

            fillForm('São Paulo', 'SP');
            
            const submitButton = document.getElementById('submitButton');
            const loadingSpinner = document.getElementById('loadingSpinner');
            
            // Clica no botão
            fireEvent.click(submitButton);

            // Verifica se o loading apareceu
            expect(loadingSpinner.style.display).toBe('block');
            expect(submitButton.disabled).toBe(true);

            // Resolve a primeira API
            resolveGeo({
                ok: true,
                json: () => Promise.resolve([MOCK_RESPONSES.geocoding.success])
            });

            await waitFor(() => {
                expect(loadingSpinner.style.display).toBe('block');
            });

            // Resolve a segunda API
            resolveAir({
                ok: true,
                json: () => Promise.resolve(MOCK_RESPONSES.airQuality.good)
            });

            await waitFor(() => {
                expect(loadingSpinner.style.display).toBe('none');
                expect(submitButton.disabled).toBe(false);
            });
        });
    });

    describe('Múltiplas Consultas', () => {
        test('deve permitir múltiplas consultas consecutivas', async () => {
            // Primeira consulta
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            let aqiValue = document.getElementById('aqiValue');
            expect(aqiValue.textContent).toBe('15');

            // Segunda consulta
            global.fetch.mockClear();
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.rioSuccess,
                MOCK_RESPONSES.airQuality.moderate
            );

            fillForm('Rio de Janeiro', 'RJ');
            await submitFormAndWait();

            aqiValue = document.getElementById('aqiValue');
            expect(aqiValue.textContent).toBe('65');

            // Verifica que foram feitas 4 chamadas no total (2 para cada consulta)
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Limpeza de Estados Anteriores', () => {
        test('deve limpar resultados anteriores antes de nova consulta', async () => {
            // Primeira consulta bem-sucedida
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const resultContainer = document.getElementById('resultContainer');
            const errorContainer = document.getElementById('errorContainer');
            
            expect(resultContainer.style.display).toBe('block');
            expect(errorContainer.style.display).toBe('none');

            // Segunda consulta com erro
            global.fetch.mockClear();
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            fillForm('Cidade Error', 'Estado Error');
            await submitFormAndWait();

            expect(resultContainer.style.display).toBe('none');
            expect(errorContainer.style.display).toBe('block');
        });
    });

    describe('Interação com Interface', () => {
        test('deve permitir nova consulta após erro', async () => {
            // Primeira consulta com erro
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            fillForm('Cidade Error', 'Estado Error');
            await submitFormAndWait();

            const errorContainer = document.getElementById('errorContainer');
            expect(errorContainer.style.display).toBe('block');

            // Segunda consulta bem-sucedida
            global.fetch.mockClear();
            mockAPISuccess(
                MOCK_RESPONSES.geocoding.success,
                MOCK_RESPONSES.airQuality.good
            );

            fillForm('São Paulo', 'SP');
            await submitFormAndWait();

            const resultContainer = document.getElementById('resultContainer');
            expect(resultContainer.style.display).toBe('block');
            expect(errorContainer.style.display).toBe('none');
        });

        test('deve manter focus no primeiro campo após erro de validação', () => {
            fillForm('', '');
            submitForm();

            const cityInput = document.getElementById('city');
            expect(document.activeElement).toBe(cityInput);
        });
    });
});
    // Simula o evento DOMContentLoaded
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    
    return dom;
}

describe('Verificador de Qualidade do Ar - Testes de Estrutura', () => {
    beforeEach(() => {
        setupDOM();
    });

    test('deve carregar todos os elementos necessários do formulário', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const countryInput = document.getElementById('country');
        const submitButton = document.getElementById('submitButton');

        expect(form).toBeInTheDocument();
        expect(cityInput).toBeInTheDocument();
        expect(stateInput).toBeInTheDocument();
        expect(countryInput).toBeInTheDocument();
        expect(submitButton).toBeInTheDocument();
    });

    test('deve ter campos obrigatórios marcados corretamente', () => {
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const countryInput = document.getElementById('country');

        expect(cityInput.hasAttribute('required')).toBe(true);
        expect(stateInput.hasAttribute('required')).toBe(true);
        expect(countryInput.hasAttribute('required')).toBe(false);
    });
});

describe('Verificador de Qualidade do Ar - Testes de Validação', () => {
    beforeEach(() => {
        setupDOM();
    });

    test('deve mostrar erro para cidade vazia', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        // Preenche apenas o estado
        fireEvent.change(stateInput, { target: { value: 'SP' } });
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        expect(cityError.style.display).toBe('block');
        expect(cityError.textContent).toContain('Por favor, informe o nome da cidade');
    });

    test('deve mostrar erro para estado vazio', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        // Preenche apenas a cidade
        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.submit(form);

        const stateError = document.getElementById('stateError');
        expect(stateError.style.display).toBe('block');
        expect(stateError.textContent).toContain('Por favor, informe o estado');
    });

    test('deve validar campos com valores muito curtos', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        // Preenche com valores de 1 caractere
        fireEvent.change(cityInput, { target: { value: 'S' } });
        fireEvent.change(stateInput, { target: { value: 'S' } });
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');
        
        expect(cityError.style.display).toBe('block');
        expect(stateError.style.display).toBe('block');
        expect(cityError.textContent).toContain('pelo menos 2 caracteres');
        expect(stateError.textContent).toContain('pelo menos 2 caracteres');
    });

    test('deve aceitar formulário com campos válidos', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'SP' } });
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');
        
        expect(cityError.style.display).toBe('none');
        expect(stateError.style.display).toBe('none');
    });
});

describe('Verificador de Qualidade do Ar - Testes de Funcionalidade', () => {
    beforeEach(() => {
        setupDOM();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('deve exibir mensagem de sucesso após envio válido', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const countryInput = document.getElementById('country');
        
        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'SP' } });
        fireEvent.change(countryInput, { target: { value: 'Brasil' } });
        fireEvent.submit(form);

        // Avança o timer para simular o processamento
        jest.advanceTimersByTime(1000);

        const successMessage = document.getElementById('successMessage');
        const locationDisplay = document.getElementById('locationDisplay');
        
        expect(successMessage.style.display).toBe('block');
        expect(locationDisplay.textContent).toContain('São Paulo, SP, Brasil');
    });

    test('deve usar EUA como país padrão quando não informado', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        fireEvent.change(cityInput, { target: { value: 'New York' } });
        fireEvent.change(stateInput, { target: { value: 'NY' } });
        fireEvent.submit(form);

        // Avança o timer
        jest.advanceTimersByTime(1000);

        const locationDisplay = document.getElementById('locationDisplay');
        expect(locationDisplay.textContent).toContain('New York, NY, EUA');
    });

    test('deve desabilitar botão durante processamento', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const submitButton = document.getElementById('submitButton');
        
        fireEvent.change(cityInput, { target: { value: 'London' } });
        fireEvent.change(stateInput, { target: { value: 'England' } });
        fireEvent.submit(form);

        // Deve estar desabilitado durante processamento
        expect(submitButton.disabled).toBe(true);
        expect(submitButton.textContent).toBe('Processando...');

        // Avança o timer
        jest.advanceTimersByTime(1000);

        // Deve voltar ao normal
        expect(submitButton.disabled).toBe(false);
        expect(submitButton.textContent).toBe('Verificar Qualidade do Ar');
    });
});

describe('Verificador de Qualidade do Ar - Testes de Interação', () => {
    beforeEach(() => {
        setupDOM();
    });

    test('deve limpar erros quando usuário digita', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        // Provoca erro de validação
        fireEvent.submit(form);
        
        const cityError = document.getElementById('cityError');
        expect(cityError.style.display).toBe('block');

        // Começa a digitar na cidade
        fireEvent.input(cityInput, { target: { value: 'S' } });
        
        // Erro deve ter sido limpo
        expect(cityError.style.display).toBe('none');
    });

    test('deve permitir envio com Enter em qualquer campo', () => {
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const countryInput = document.getElementById('country');
        
        fireEvent.change(cityInput, { target: { value: 'Paris' } });
        fireEvent.change(stateInput, { target: { value: 'Île-de-France' } });
        fireEvent.change(countryInput, { target: { value: 'França' } });
        
        // Pressiona Enter no campo país
        fireEvent.keyPress(countryInput, { 
            key: 'Enter', 
            code: 'Enter', 
            charCode: 13 
        });

        // Verifica que o formulário foi processado (sem erros de validação)
        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');
        
        expect(cityError.style.display).toBe('none');
        expect(stateError.style.display).toBe('none');
    });
});

describe('Verificador de Qualidade do Ar - Testes de Funções Utilitárias', () => {
    let dom, app;
    
    beforeEach(() => {
        dom = setupDOM();
        // Aguarda a inicialização da aplicação
        app = global.window.airQualityApp;
        if (!app) {
            // Se não encontrou, cria uma instância manualmente para teste
            const AirQualityApp = require('../script.js');
            app = new AirQualityApp();
        }
    });

    test('deve determinar nível de saúde corretamente', () => {
        expect(app.getHealthLevel(30)).toEqual(expect.objectContaining({
            level: 'good',
            text: 'Boa'
        }));

        expect(app.getHealthLevel(75)).toEqual(expect.objectContaining({
            level: 'moderate',
            text: 'Moderada'
        }));

        expect(app.getHealthLevel(120)).toEqual(expect.objectContaining({
            level: 'unhealthy-sensitive',
            text: 'Insalubre para grupos sensíveis'
        }));

        expect(app.getHealthLevel(180)).toEqual(expect.objectContaining({
            level: 'unhealthy',
            text: 'Insalubre'
        }));

        expect(app.getHealthLevel(250)).toEqual(expect.objectContaining({
            level: 'very-unhealthy',
            text: 'Muito insalubre'
        }));

        expect(app.getHealthLevel(350)).toEqual(expect.objectContaining({
            level: 'hazardous',
            text: 'Perigoso'
        }));
    });

    test('deve tratar valores de IQA inválidos', () => {
        expect(app.getHealthLevel(null)).toEqual(expect.objectContaining({
            level: 'unknown',
            text: 'Dados não disponíveis'
        }));

        expect(app.getHealthLevel(undefined)).toEqual(expect.objectContaining({
            level: 'unknown',
            text: 'Dados não disponíveis'
        }));

        expect(app.getHealthLevel(NaN)).toEqual(expect.objectContaining({
            level: 'unknown',
            text: 'Dados não disponíveis'
        }));
    });

    test('deve formatar nomes de poluentes corretamente', () => {
        expect(app.formatPollutantName('pm2_5')).toBe('PM2.5');
        expect(app.formatPollutantName('pm10')).toBe('PM10');
        expect(app.formatPollutantName('carbon_monoxide')).toBe('Monóxido de Carbono (CO)');
        expect(app.formatPollutantName('nitrogen_dioxide')).toBe('Dióxido de Nitrogênio (NO₂)');
        expect(app.formatPollutantName('sulphur_dioxide')).toBe('Dióxido de Enxofre (SO₂)');
        expect(app.formatPollutantName('ozone')).toBe('Ozônio (O₃)');
        expect(app.formatPollutantName('unknown_pollutant')).toBe('unknown_pollutant');
    });

    test('deve formatar data e hora corretamente', () => {
        const testDate = '2025-08-11T14:30:00';
        const formatted = app.formatDateTime(testDate);
        
        // Verifica se contém elementos de data e hora
        expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/); // DD/MM/YYYY
        expect(formatted).toMatch(/\d{2}:\d{2}/); // HH:MM
    });

    test('deve gerar recomendações de saúde apropriadas', () => {
        // Testa recomendações para ar bom
        const goodRecommendations = app.getHealthRecommendations(30);
        expect(goodRecommendations).toContain('atividades ao ar livre');
        expect(goodRecommendations).toContain('exercícios');

        // Testa recomendações para ar perigoso
        const hazardousRecommendations = app.getHealthRecommendations(350);
        expect(hazardousRecommendations).toContain('ALERTA');
        expect(hazardousRecommendations).toContain('máscara');
        expect(hazardousRecommendations).toContain('ambientes fechados');
    });
});

describe('Verificador de Qualidade do Ar - Testes de Validação Avançada', () => {
    beforeEach(() => {
        setupDOM();
    });

    test('deve rejeitar caracteres especiais inválidos na cidade', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        fireEvent.change(cityInput, { target: { value: 'São@Paulo123' } });
        fireEvent.change(stateInput, { target: { value: 'SP' } });
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        expect(cityError.style.display).toBe('block');
        expect(cityError.textContent).toContain('caracteres inválidos');
    });

    test('deve rejeitar caracteres especiais inválidos no estado', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'SP@123' } });
        fireEvent.submit(form);

        const stateError = document.getElementById('stateError');
        expect(stateError.style.display).toBe('block');
        expect(stateError.textContent).toContain('caracteres inválidos');
    });

    test('deve aceitar caracteres válidos como acentos e hífens', () => {
        const form = document.getElementById('airQualityForm');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        
        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'Minas-Gerais' } });
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');
        
        expect(cityError.style.display).toBe('none');
        expect(stateError.style.display).toBe('none');
    });
});
