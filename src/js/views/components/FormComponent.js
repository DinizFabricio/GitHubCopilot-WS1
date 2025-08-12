/**
 * FormComponent - Componente para gerenciamento do formulário de busca
 * Implementa validação em tempo real e controle de eventos
 */
import BaseComponent from './BaseComponent.js';

class FormComponent extends BaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        // Configurações padrão
        this.config = {
            validation: true,
            realTimeValidation: true,
            submitOnEnter: true,
            autoFocus: true,
            clearOnSubmit: false,
            ...options
        };

        // Estado do formulário
        this.state = {
            isValid: true,
            isDirty: false,
            isSubmitting: false,
            values: {},
            errors: {},
            touchedFields: new Set()
        };

        // Cache de elementos
        this.fields = {};
        this.errorElements = {};

        // Inicialização
        this._initializeForm();
        this._setupEventListeners();
        
        console.log('📝 FormComponent: Initialized');
    }

    /**
     * Inicializa campos e elementos do formulário
     */
    _initializeForm() {
        // Cacheia campos principais
        this.fields = {
            city: this.element.querySelector('#city, input[name="city"]'),
            state: this.element.querySelector('#state, input[name="state"]'),
            country: this.element.querySelector('#country, input[name="country"]'),
            submit: this.element.querySelector('button[type="submit"], #submitButton')
        };

        // Cacheia elementos de erro
        this.errorElements = {
            city: this.element.querySelector('#cityError, .city-error'),
            state: this.element.querySelector('#stateError, .state-error'),
            country: this.element.querySelector('#countryError, .country-error')
        };

        // Define valores iniciais
        Object.entries(this.fields).forEach(([key, field]) => {
            if (field && field.value !== undefined) {
                this.state.values[key] = field.value;
            }
        });

        // Auto-focus no primeiro campo
        if (this.config.autoFocus && this.fields.city) {
            this.fields.city.focus();
        }
    }

    /**
     * Configura event listeners do formulário
     */
    _setupEventListeners() {
        // Submit do formulário
        this.element.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });

        // Validação em tempo real
        if (this.config.realTimeValidation) {
            Object.entries(this.fields).forEach(([key, field]) => {
                if (field && field.type !== 'submit') {
                    // Input events
                    field.addEventListener('input', () => {
                        this._handleFieldInput(key, field);
                    });

                    field.addEventListener('blur', () => {
                        this._handleFieldBlur(key, field);
                    });

                    field.addEventListener('focus', () => {
                        this._handleFieldFocus(key, field);
                    });
                }
            });
        }

        // Enter para submit
        if (this.config.submitOnEnter) {
            this.element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                    e.preventDefault();
                    this._handleSubmit();
                }
            });
        }

        // Eventos de limpeza
        this.eventManager?.subscribe('form:clear', () => {
            this.clear();
        });

        this.eventManager?.subscribe('form:reset', () => {
            this.reset();
        });
    }

    /**
     * Manipula input em campo
     * @param {string} fieldName - Nome do campo
     * @param {HTMLElement} field - Elemento do campo
     */
    _handleFieldInput(fieldName, field) {
        const value = field.value;
        const previousValue = this.state.values[fieldName];
        
        // Atualiza estado
        this.state.values[fieldName] = value;
        this.state.isDirty = true;
        this.state.touchedFields.add(fieldName);

        // Limpa erro se campo estava inválido
        if (this.state.errors[fieldName]) {
            this._clearFieldError(fieldName);
        }

        // Valida campo se tem validação em tempo real
        if (this.config.realTimeValidation && value !== previousValue) {
            this._validateField(fieldName, value);
        }

        // Notifica mudança
        this._notifyFieldChange(fieldName, value, previousValue);
    }

    /**
     * Manipula blur de campo
     * @param {string} fieldName - Nome do campo
     * @param {HTMLElement} field - Elemento do campo
     */
    _handleFieldBlur(fieldName, field) {
        this.state.touchedFields.add(fieldName);
        
        // Validação completa no blur
        this._validateField(fieldName, field.value);
        
        this.eventManager?.publish('form:field:blur', {
            field: fieldName,
            value: field.value
        });
    }

    /**
     * Manipula focus de campo
     * @param {string} fieldName - Nome do campo
     * @param {HTMLElement} field - Elemento do campo
     */
    _handleFieldFocus(fieldName, field) {
        // Limpa erro quando usuário foca no campo
        this._clearFieldError(fieldName);
        
        this.eventManager?.publish('form:field:focus', {
            field: fieldName
        });
    }

    /**
     * Manipula submissão do formulário
     */
    async _handleSubmit() {
        if (this.state.isSubmitting) {
            return; // Previne múltiplas submissões
        }

        console.log('📝 FormComponent: Handling form submission');

        try {
            this.state.isSubmitting = true;
            this._setSubmitButtonState(true);

            // Coleta dados do formulário
            const formData = this._collectFormData();
            
            // Valida formulário completo
            const validation = await this._validateForm(formData);
            
            if (validation.isValid) {
                // Notifica sucesso da validação
                this.eventManager?.publish('form:validation:success', formData);
                
                // Emite evento de submissão
                this.eventManager?.publish('form:submit', formData);
                
                // Limpa formulário se configurado
                if (this.config.clearOnSubmit) {
                    this.clear();
                }
                
                console.log('✅ FormComponent: Form submitted successfully', formData);
            } else {
                // Exibe erros de validação
                this._displayValidationErrors(validation.errors);
                
                // Notifica erro de validação
                this.eventManager?.publish('form:validation:error', validation);
                
                // Foca no primeiro campo com erro
                this._focusFirstErrorField();
                
                console.warn('⚠️ FormComponent: Form validation failed', validation.errors);
            }

        } catch (error) {
            console.error('❌ FormComponent: Form submission error', error);
            this.eventManager?.publish('form:error', { error });
        } finally {
            this.state.isSubmitting = false;
            this._setSubmitButtonState(false);
        }
    }

    /**
     * Coleta dados do formulário
     * @returns {Object} Dados do formulário
     */
    _collectFormData() {
        const formData = {};
        
        Object.entries(this.fields).forEach(([key, field]) => {
            if (field && field.type !== 'submit') {
                formData[key] = field.value?.trim() || '';
            }
        });

        return formData;
    }

    /**
     * Valida formulário completo
     * @param {Object} formData - Dados para validar
     * @returns {Object} Resultado da validação
     */
    async _validateForm(formData) {
        const errors = {};
        let isValid = true;

        // Validação de cidade
        const cityValidation = this._validateField('city', formData.city);
        if (!cityValidation.isValid) {
            errors.city = cityValidation.errors;
            isValid = false;
        }

        // Validação de estado
        const stateValidation = this._validateField('state', formData.state);
        if (!stateValidation.isValid) {
            errors.state = stateValidation.errors;
            isValid = false;
        }

        // Validação de país (opcional)
        if (formData.country) {
            const countryValidation = this._validateField('country', formData.country);
            if (!countryValidation.isValid) {
                errors.country = countryValidation.errors;
                isValid = false;
            }
        }

        return { isValid, errors, formData };
    }

    /**
     * Valida campo individual
     * @param {string} fieldName - Nome do campo
     * @param {string} value - Valor do campo
     * @returns {Object} Resultado da validação
     */
    _validateField(fieldName, value) {
        const errors = [];
        
        switch (fieldName) {
            case 'city':
            case 'state':
                // Campos obrigatórios
                if (!value || value.length === 0) {
                    errors.push(`${fieldName === 'city' ? 'Cidade' : 'Estado'} é obrigatório`);
                } else if (value.length < 2) {
                    errors.push(`${fieldName === 'city' ? 'Cidade' : 'Estado'} deve ter pelo menos 2 caracteres`);
                } else if (this._hasInvalidCharacters(value)) {
                    errors.push(`${fieldName === 'city' ? 'Cidade' : 'Estado'} contém caracteres inválidos`);
                }
                break;
                
            case 'country':
                // Campo opcional
                if (value && value.length > 0) {
                    if (value.length < 2) {
                        errors.push('País deve ter pelo menos 2 caracteres');
                    } else if (this._hasInvalidCharacters(value)) {
                        errors.push('País contém caracteres inválidos');
                    }
                }
                break;
        }

        const isValid = errors.length === 0;
        
        // Atualiza estado
        if (isValid) {
            delete this.state.errors[fieldName];
        } else {
            this.state.errors[fieldName] = errors;
        }

        // Atualiza UI se campo foi tocado
        if (this.state.touchedFields.has(fieldName)) {
            if (isValid) {
                this._clearFieldError(fieldName);
            } else {
                this._showFieldError(fieldName, errors[0]);
            }
        }

        return { isValid, errors };
    }

    /**
     * Verifica caracteres inválidos
     * @param {string} value - Valor para verificar
     * @returns {boolean} True se tem caracteres inválidos
     */
    _hasInvalidCharacters(value) {
        // Permite letras, espaços, acentos, hífens e pontos
        const validPattern = /^[a-zA-ZÀ-ÿ\s\-\.]+$/;
        return !validPattern.test(value);
    }

    /**
     * Exibe erro de campo
     * @param {string} fieldName - Nome do campo
     * @param {string} errorMessage - Mensagem de erro
     */
    _showFieldError(fieldName, errorMessage) {
        const errorElement = this.errorElements[fieldName];
        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            errorElement.setAttribute('aria-live', 'polite');
        }

        // Adiciona classe de erro no campo
        const field = this.fields[fieldName];
        if (field) {
            field.classList.add('error', 'is-invalid');
            field.setAttribute('aria-invalid', 'true');
        }
    }

    /**
     * Limpa erro de campo
     * @param {string} fieldName - Nome do campo
     */
    _clearFieldError(fieldName) {
        const errorElement = this.errorElements[fieldName];
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
            errorElement.removeAttribute('aria-live');
        }

        // Remove classe de erro do campo
        const field = this.fields[fieldName];
        if (field) {
            field.classList.remove('error', 'is-invalid');
            field.setAttribute('aria-invalid', 'false');
        }
    }

    /**
     * Exibe erros de validação
     * @param {Object} errors - Objeto com erros por campo
     */
    _displayValidationErrors(errors) {
        Object.entries(errors).forEach(([fieldName, fieldErrors]) => {
            if (fieldErrors && fieldErrors.length > 0) {
                this._showFieldError(fieldName, fieldErrors[0]);
            }
        });
    }

    /**
     * Foca no primeiro campo com erro
     */
    _focusFirstErrorField() {
        const errorFields = Object.keys(this.state.errors);
        if (errorFields.length > 0) {
            const firstErrorField = this.fields[errorFields[0]];
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    }

    /**
     * Define estado do botão de submit
     * @param {boolean} isSubmitting - Se está enviando
     */
    _setSubmitButtonState(isSubmitting) {
        const submitButton = this.fields.submit;
        if (submitButton) {
            submitButton.disabled = isSubmitting;
            submitButton.textContent = isSubmitting ? 
                'Verificando...' : 
                'Verificar Qualidade do Ar';
        }
    }

    /**
     * Notifica mudança de campo
     * @param {string} fieldName - Nome do campo
     * @param {string} newValue - Novo valor
     * @param {string} oldValue - Valor anterior
     */
    _notifyFieldChange(fieldName, newValue, oldValue) {
        this.eventManager?.publish('form:field:change', {
            field: fieldName,
            newValue,
            oldValue,
            isValid: !this.state.errors[fieldName]
        });
    }

    /**
     * Manipula resultado de validação externa
     * @param {Object} validationResult - Resultado da validação
     */
    handleValidation(validationResult) {
        if (validationResult.isValid) {
            this._clearAllErrors();
        } else {
            this._displayValidationErrors(validationResult.errors);
        }
    }

    /**
     * Limpa todos os erros
     */
    _clearAllErrors() {
        Object.keys(this.errorElements).forEach(fieldName => {
            this._clearFieldError(fieldName);
        });
        this.state.errors = {};
    }

    /**
     * Limpa formulário
     */
    clear() {
        // Limpa campos
        Object.entries(this.fields).forEach(([key, field]) => {
            if (field && field.type !== 'submit') {
                field.value = '';
            }
        });

        // Reseta estado
        this.state.values = {};
        this.state.isDirty = false;
        this.state.touchedFields.clear();
        
        // Limpa erros
        this._clearAllErrors();

        // Foca no primeiro campo
        if (this.fields.city) {
            this.fields.city.focus();
        }

        console.log('🧹 FormComponent: Form cleared');
        this.eventManager?.publish('form:cleared');
    }

    /**
     * Reseta formulário para estado inicial
     */
    reset() {
        this.clear();
        this.state = {
            isValid: true,
            isDirty: false,
            isSubmitting: false,
            values: {},
            errors: {},
            touchedFields: new Set()
        };

        console.log('🔄 FormComponent: Form reset');
        this.eventManager?.publish('form:reset');
    }

    /**
     * Define valores do formulário
     * @param {Object} values - Valores para definir
     */
    setValues(values) {
        Object.entries(values).forEach(([key, value]) => {
            const field = this.fields[key];
            if (field) {
                field.value = value;
                this.state.values[key] = value;
            }
        });

        this.state.isDirty = true;
        console.log('📝 FormComponent: Values set', values);
    }

    /**
     * Obtém valores atuais do formulário
     * @returns {Object} Valores do formulário
     */
    getValues() {
        return { ...this.state.values };
    }

    /**
     * Verifica se formulário é válido
     * @returns {boolean} True se válido
     */
    isValid() {
        return Object.keys(this.state.errors).length === 0;
    }

    /**
     * Verifica se formulário foi modificado
     * @returns {boolean} True se modificado
     */
    isDirty() {
        return this.state.isDirty;
    }

    /**
     * Obtém estado atual do formulário
     * @returns {Object} Estado do formulário
     */
    getState() {
        return {
            ...this.state,
            touchedFields: Array.from(this.state.touchedFields)
        };
    }

    /**
     * Renderização (não aplicável para formulário)
     */
    render() {
        // FormComponent não precisa de render explícito
        // A renderização é feita via manipulação direta do DOM
        console.log('📝 FormComponent: Render called (no-op)');
    }

    /**
     * Destrói o componente
     */
    destroy() {
        // Remove event listeners se necessário
        this.element.removeEventListener('submit', this._handleSubmit);
        
        // Limpa referencias
        this.fields = {};
        this.errorElements = {};
        
        super.destroy();
        
        console.log('📝 FormComponent: Destroyed');
    }
}

export default FormComponent;
