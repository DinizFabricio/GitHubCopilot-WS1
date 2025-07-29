// __tests__/air-quality.test.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { screen, fireEvent, waitFor } = require('@testing-library/dom');
require('@testing-library/jest-dom');

// Carrega o HTML e configura o DOM
function setupDOM() {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'dangerously' });
    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;
}

// Mock das respostas das APIs
const mockGeocodingResponse = [
    {
        lat: "-23.5505",
        lon: "-46.6333",
        display_name: "São Paulo, SP, Brasil"
    }
];

const mockAirQualityResponse = {
    hourly: {
        time: ["2025-07-29T12:00"],
        us_aqi: [75],
        dominant_pollutant: ["pm2_5"]
    }
};

describe('Verificador de Qualidade do Ar - Testes Unitários', () => {
    beforeEach(() => {
        setupDOM();
    });

    test('deve validar campos obrigatórios do formulário', () => {
        // Tenta enviar formulário vazio
        const form = document.getElementById('locationForm');
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');

        expect(cityError.style.display).toBe('block');
        expect(stateError.style.display).toBe('block');
    });

    test('deve aceitar formulário com campos preenchidos', () => {
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');

        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'SP' } });

        const form = document.getElementById('locationForm');
        fireEvent.submit(form);

        const cityError = document.getElementById('cityError');
        const stateError = document.getElementById('stateError');

        expect(cityError.style.display).toBe('none');
        expect(stateError.style.display).toBe('none');
    });

    test('deve calcular corretamente o nível de saúde', () => {
        const { getHealthLevel } = window;

        expect(getHealthLevel(30)).toEqual({ 
            level: 'good', 
            text: 'Boa qualidade do ar' 
        });
        expect(getHealthLevel(90)).toEqual({ 
            level: 'moderate', 
            text: 'Qualidade do ar moderada' 
        });
        expect(getHealthLevel(160)).toEqual({ 
            level: 'unhealthy', 
            text: 'Insalubre' 
        });
    });
});

describe('Verificador de Qualidade do Ar - Testes de Integração', () => {
    beforeEach(() => {
        setupDOM();
        // Mock do fetch
        global.fetch = jest.fn();
    });

    test('deve buscar e exibir dados de qualidade do ar', async () => {
        // Mock das respostas das APIs
        global.fetch
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockGeocodingResponse)
            }))
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockAirQualityResponse)
            }));

        // Preenche e envia o formulário
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const form = document.getElementById('locationForm');

        fireEvent.change(cityInput, { target: { value: 'São Paulo' } });
        fireEvent.change(stateInput, { target: { value: 'SP' } });
        fireEvent.submit(form);

        // Espera o resultado ser exibido
        await waitFor(() => {
            const result = document.getElementById('result');
            expect(result.style.display).toBe('block');
            expect(result.textContent).toContain('São Paulo, SP');
            expect(result.textContent).toContain('75');
            expect(result.textContent).toContain('pm2_5');
        });
    });

    test('deve tratar erro na busca de coordenadas', async () => {
        // Mock de erro na API de geocodificação
        global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Localização não encontrada')));

        // Preenche e envia o formulário
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const form = document.getElementById('locationForm');

        fireEvent.change(cityInput, { target: { value: 'Cidade Inexistente' } });
        fireEvent.change(stateInput, { target: { value: 'XX' } });
        fireEvent.submit(form);

        // Espera a mensagem de erro ser exibida
        await waitFor(() => {
            const result = document.getElementById('result');
            expect(result.classList.contains('result-error')).toBe(true);
            expect(result.textContent).toContain('Localização não encontrada');
        });
    });
});
