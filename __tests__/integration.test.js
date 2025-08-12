/**
 * Integration Tests for Modern Air Quality App
 * Testa a integração entre todos os componentes da nova arquitetura
 */

import ModernAirQualityApp from '../src/js/main.js';
import EventManager from '../src/js/utils/EventManager.js';

// Mock DOM environment for tests
const mockDOM = () => {
    // Create mock elements
    const mockElements = {
        formComponent: document.createElement('div'),
        loadingComponent: document.createElement('div'),
        aqiDisplayComponent: document.createElement('div'),
        city: document.createElement('input'),
        state: document.createElement('input'),
        country: document.createElement('input'),
        airQualityForm: document.createElement('form')
    };

    // Set IDs
    Object.entries(mockElements).forEach(([key, element]) => {
        element.id = key;
        document.body.appendChild(element);
    });

    return mockElements;
};

describe('Modern Air Quality App Integration', () => {
    let app;
    let mockElements;

    beforeEach(() => {
        // Setup mock DOM
        mockElements = mockDOM();
        
        // Create app instance
        app = new ModernAirQualityApp();
    });

    afterEach(() => {
        // Cleanup
        if (app && app.destroy) {
            app.destroy();
        }
        
        // Remove mock elements
        Object.values(mockElements).forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    });

    test('should initialize all core systems', async () => {
        await app.initialize();
        
        expect(app.eventManager).toBeDefined();
        expect(app.cacheService).toBeDefined();
        expect(app.apiFacade).toBeDefined();
        expect(app.componentFactory).toBeDefined();
        expect(app.viewManager).toBeDefined();
        expect(app.controller).toBeDefined();
        expect(app.state.isInitialized).toBe(true);
    });

    test('should create UI components', async () => {
        await app.initialize();
        
        expect(app.components.form).toBeDefined();
        expect(app.components.loading).toBeDefined();
        expect(app.components.aqiDisplay).toBeDefined();
    });

    test('should handle form submission flow', async () => {
        await app.initialize();
        
        const formData = {
            city: 'São Paulo',
            state: 'SP',
            country: 'Brasil'
        };

        // Mock API responses
        const mockGeocodingResponse = {
            lat: -23.5505,
            lon: -46.6333,
            displayName: 'São Paulo, SP, Brasil'
        };

        const mockAQIResponse = {
            aqi: { value: 75 },
            pollutants: { 'pm2.5': 25, 'pm10': 45 },
            timestamp: new Date().toISOString()
        };

        // Spy on controller method
        const searchSpy = jest.spyOn(app.controller, 'searchAirQuality').mockResolvedValue(mockAQIResponse);

        // Trigger form submission
        await app.handleFormSubmit(formData);

        expect(searchSpy).toHaveBeenCalledWith(formData);
        expect(app.state.lastQuery).toEqual(formData);
    });

    test('should handle errors gracefully', async () => {
        await app.initialize();
        
        const error = new Error('Test error');
        
        // Trigger error
        app.handleGlobalError({ error, context: 'test' });
        
        expect(app.components.aqiDisplay.state.error).toBeDefined();
    });

    test('should detect responsive strategy correctly', () => {
        // Mock window width
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 500,
        });
        
        expect(app.detectViewStrategy()).toBe('mobile');
        
        window.innerWidth = 800;
        expect(app.detectViewStrategy()).toBe('tablet');
        
        window.innerWidth = 1200;
        expect(app.detectViewStrategy()).toBe('desktop');
    });

    test('should manage loading states', async () => {
        await app.initialize();
        
        // Show loading
        app.showLoading('Test loading');
        expect(app.components.loading.state.isActive).toBe(true);
        
        // Hide loading
        app.hideLoading();
        expect(app.components.loading.state.isActive).toBe(false);
    });

    test('should publish and subscribe to events', async () => {
        await app.initialize();
        
        let eventReceived = false;
        
        app.eventManager.subscribe('test:event', () => {
            eventReceived = true;
        });
        
        app.eventManager.publish('test:event');
        
        expect(eventReceived).toBe(true);
    });
});

/**
 * Component Integration Tests
 */
describe('Component Integration', () => {
    let eventManager;

    beforeEach(() => {
        eventManager = new EventManager();
    });

    test('should integrate FormComponent with EventManager', () => {
        const mockFormElement = document.createElement('form');
        const FormComponent = require('../src/js/views/components/FormComponent.js').default;
        
        const formComponent = new FormComponent(mockFormElement, {
            eventManager
        });

        let eventReceived = false;
        
        eventManager.subscribe('form:submit', () => {
            eventReceived = true;
        });

        // Simulate form submission
        const submitEvent = new Event('submit');
        mockFormElement.dispatchEvent(submitEvent);
        
        expect(eventReceived).toBe(true);
    });

    test('should integrate LoadingComponent with different types', () => {
        const mockLoadingElement = document.createElement('div');
        const LoadingComponent = require('../src/js/views/components/LoadingComponent.js').default;
        
        const loadingComponent = new LoadingComponent(mockLoadingElement, {
            eventManager,
            type: 'spinner'
        });

        loadingComponent.show({ message: 'Test loading' });
        expect(loadingComponent.isActive()).toBe(true);
        
        loadingComponent.setType('dots');
        expect(loadingComponent.config.type).toBe('dots');
        
        loadingComponent.hide();
        expect(loadingComponent.isActive()).toBe(false);
    });

    test('should integrate AQIDisplayComponent with data updates', () => {
        const mockDisplayElement = document.createElement('div');
        const AQIDisplayComponent = require('../src/js/views/components/AQIDisplayComponent.js').default;
        
        const aqiComponent = new AQIDisplayComponent(mockDisplayElement, {
            eventManager
        });

        const testData = {
            location: { city: 'Test City', state: 'Test State' },
            aqi: { value: 50 },
            pollutants: { 'pm2.5': 12, 'pm10': 25 },
            timestamp: new Date().toISOString()
        };

        aqiComponent.updateDisplay(testData);
        
        expect(aqiComponent.state.currentData).toEqual(testData);
        expect(aqiComponent.state.error).toBeNull();
    });
});

/**
 * Service Integration Tests
 */
describe('Service Integration', () => {
    test('should integrate services with APIFacade', () => {
        const eventManager = new EventManager();
        const APIFacade = require('../src/js/utils/APIFacade.js').default;
        const GeocodingService = require('../src/js/services/GeocodingService.js').default;
        
        const apiFacade = new APIFacade({ eventManager });
        const geocodingService = new GeocodingService({ eventManager });
        
        apiFacade.registerService('geocoding', geocodingService);
        
        expect(apiFacade.services.geocoding).toBeDefined();
        expect(apiFacade.getServiceStatus('geocoding')).toBe('ready');
    });
});

/**
 * Error Handling Tests
 */
describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
        // Mock a critical error during initialization
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Force an error by providing invalid DOM
        document.body.innerHTML = ''; // Remove all elements
        
        const app = new ModernAirQualityApp();
        
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });

    test('should fall back to legacy app when needed', () => {
        // Mock legacy AirQualityApp
        window.AirQualityApp = jest.fn();
        
        const app = new ModernAirQualityApp();
        app.handleInitializationError(new Error('Test error'));
        
        expect(window.AirQualityApp).toHaveBeenCalled();
    });
});

/**
 * Performance Tests
 */
describe('Performance', () => {
    test('should initialize within reasonable time', async () => {
        const startTime = performance.now();
        
        const app = new ModernAirQualityApp();
        await app.initialize();
        
        const endTime = performance.now();
        const initTime = endTime - startTime;
        
        // Should initialize within 1 second
        expect(initTime).toBeLessThan(1000);
    });

    test('should handle multiple rapid form submissions', async () => {
        const app = new ModernAirQualityApp();
        await app.initialize();
        
        const formData = { city: 'Test', state: 'Test' };
        
        // Submit multiple times rapidly
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(app.handleFormSubmit(formData));
        }
        
        // Should handle all without errors
        await expect(Promise.all(promises)).resolves.toBeDefined();
    });
});

export default {
    ModernAirQualityApp,
    EventManager
};
