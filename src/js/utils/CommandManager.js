/**
 * CommandManager - Implementação do Command Pattern
 * Gerencia comandos executáveis com suporte a undo/redo e histórico
 */

/**
 * Classe base abstrata para comandos
 */
class Command {
    constructor() {
        this.executed = false;
        this.timestamp = Date.now();
        this.id = this._generateId();
    }

    /**
     * Executa o comando
     * @returns {Promise<*>} Resultado da execução
     */
    async execute() {
        throw new Error('Command.execute() must be implemented by subclass');
    }

    /**
     * Desfaz o comando
     * @returns {Promise<void>}
     */
    async undo() {
        throw new Error('Command.undo() must be implemented by subclass');
    }

    /**
     * Verifica se o comando pode ser desfeito
     * @returns {boolean}
     */
    canUndo() {
        return this.executed;
    }

    /**
     * Verifica se o comando pode ser reexecutado
     * @returns {boolean}
     */
    canRedo() {
        return !this.executed;
    }

    /**
     * Gera ID único para o comando
     * @returns {string}
     */
    _generateId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Retorna descrição do comando para logs
     * @returns {string}
     */
    getDescription() {
        return `${this.constructor.name}#${this.id}`;
    }
}

/**
 * Comando para busca de qualidade do ar
 */
class SearchCommand extends Command {
    constructor(searchParams, apiFacade) {
        super();
        this.searchParams = { ...searchParams };
        this.apiFacade = apiFacade;
        this.result = null;
        this.previousResult = null; // Para undo
    }

    /**
     * Executa busca de qualidade do ar
     * @returns {Promise<Object>} Resultado da busca
     */
    async execute() {
        try {
            console.log(`🔧 Executing SearchCommand: ${this.getDescription()}`, this.searchParams);
            
            // Salva resultado anterior se houver
            this.previousResult = this.result;
            
            // Executa busca através do facade
            this.result = await this.apiFacade.getAirQualityData(this.searchParams);
            this.executed = true;
            
            console.log(`✅ SearchCommand executed successfully: ${this.getDescription()}`);
            return this.result;

        } catch (error) {
            console.error(`❌ SearchCommand execution failed: ${this.getDescription()}`, error);
            this.executed = false;
            throw error;
        }
    }

    /**
     * Desfaz a busca (limpa resultados)
     * @returns {Promise<void>}
     */
    async undo() {
        if (!this.canUndo()) {
            throw new Error('Cannot undo command that was not executed');
        }

        console.log(`↩️ Undoing SearchCommand: ${this.getDescription()}`);
        
        // Restaura resultado anterior
        this.result = this.previousResult;
        this.executed = false;
        
        console.log(`✅ SearchCommand undone: ${this.getDescription()}`);
    }

    /**
     * Verifica se este comando é equivalente a outro
     * @param {SearchCommand} other - Outro comando para comparar
     * @returns {boolean}
     */
    isEquivalentTo(other) {
        if (!(other instanceof SearchCommand)) {
            return false;
        }

        const params1 = this.searchParams;
        const params2 = other.searchParams;

        return (
            params1.city?.toLowerCase() === params2.city?.toLowerCase() &&
            params1.state?.toLowerCase() === params2.state?.toLowerCase() &&
            params1.country?.toLowerCase() === params2.country?.toLowerCase()
        );
    }

    /**
     * Retorna descrição detalhada do comando
     * @returns {string}
     */
    getDescription() {
        const { city, state, country } = this.searchParams;
        return `SearchCommand: ${city}, ${state}${country ? ', ' + country : ''}`;
    }

    /**
     * Serializa comando para armazenamento
     * @returns {Object}
     */
    serialize() {
        return {
            type: 'SearchCommand',
            id: this.id,
            searchParams: this.searchParams,
            executed: this.executed,
            timestamp: this.timestamp,
            hasResult: !!this.result
        };
    }

    /**
     * Cria comando a partir de dados serializados
     * @param {Object} data - Dados serializados
     * @param {APIFacade} apiFacade - Instância do API facade
     * @returns {SearchCommand}
     */
    static deserialize(data, apiFacade) {
        const command = new SearchCommand(data.searchParams, apiFacade);
        command.id = data.id;
        command.executed = data.executed;
        command.timestamp = data.timestamp;
        return command;
    }
}

/**
 * Comando para limpar cache
 */
class ClearCacheCommand extends Command {
    constructor(cacheService) {
        super();
        this.cacheService = cacheService;
        this.clearedData = null;
    }

    async execute() {
        console.log(`🔧 Executing ClearCacheCommand: ${this.getDescription()}`);
        
        // Salva estatísticas antes de limpar (para possível undo)
        this.clearedData = await this.cacheService.getStats();
        
        // Limpa cache
        await this.cacheService.clear();
        this.executed = true;
        
        console.log(`✅ ClearCacheCommand executed: cache cleared`);
        return { cleared: true, stats: this.clearedData };
    }

    async undo() {
        // Cache clearing não pode ser desfeito, mas podemos logar
        console.warn(`⚠️ ClearCacheCommand undo: Cache clearing cannot be undone`);
        this.executed = false;
    }

    canUndo() {
        return false; // Cache clearing is irreversible
    }

    getDescription() {
        return 'ClearCacheCommand: Clear all cached data';
    }
}

/**
 * Comando para configurar aplicação
 */
class ConfigureCommand extends Command {
    constructor(newConfig, currentConfig) {
        super();
        this.newConfig = { ...newConfig };
        this.previousConfig = { ...currentConfig };
        this.targetObject = null;
    }

    setTarget(target) {
        this.targetObject = target;
    }

    async execute() {
        if (!this.targetObject) {
            throw new Error('ConfigureCommand: Target object not set');
        }

        console.log(`🔧 Executing ConfigureCommand: ${this.getDescription()}`);
        
        // Aplica nova configuração
        Object.assign(this.targetObject.config, this.newConfig);
        this.executed = true;
        
        console.log(`✅ ConfigureCommand executed: configuration updated`);
        return this.newConfig;
    }

    async undo() {
        if (!this.canUndo() || !this.targetObject) {
            throw new Error('Cannot undo ConfigureCommand');
        }

        console.log(`↩️ Undoing ConfigureCommand: ${this.getDescription()}`);
        
        // Restaura configuração anterior
        Object.assign(this.targetObject.config, this.previousConfig);
        this.executed = false;
        
        console.log(`✅ ConfigureCommand undone: configuration restored`);
    }

    getDescription() {
        const keys = Object.keys(this.newConfig).join(', ');
        return `ConfigureCommand: Update ${keys}`;
    }
}

/**
 * Gerenciador de comandos com histórico
 */
class CommandManager {
    constructor(maxHistorySize = 50) {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = maxHistorySize;
        this.listeners = [];
    }

    /**
     * Executa um comando e o adiciona ao histórico
     * @param {Command} command - Comando para executar
     * @returns {Promise<*>} Resultado da execução
     */
    async executeCommand(command) {
        try {
            const result = await command.execute();
            
            // Remove comandos após o índice atual (branch de histórico)
            this.history = this.history.slice(0, this.currentIndex + 1);
            
            // Adiciona comando ao histórico
            this.history.push(command);
            this.currentIndex = this.history.length - 1;
            
            // Limita tamanho do histórico
            if (this.history.length > this.maxHistorySize) {
                this.history = this.history.slice(-this.maxHistorySize);
                this.currentIndex = this.history.length - 1;
            }
            
            this._notifyListeners('command:executed', { command, result });
            console.log(`📚 Command executed and added to history: ${command.getDescription()}`);
            
            return result;

        } catch (error) {
            this._notifyListeners('command:error', { command, error });
            console.error(`❌ Command execution failed: ${command.getDescription()}`, error);
            throw error;
        }
    }

    /**
     * Desfaz o último comando
     * @returns {Promise<void>}
     */
    async undo() {
        if (!this.canUndo()) {
            throw new Error('No commands to undo');
        }

        const command = this.history[this.currentIndex];
        
        try {
            await command.undo();
            this.currentIndex--;
            
            this._notifyListeners('command:undone', { command });
            console.log(`↩️ Command undone: ${command.getDescription()}`);

        } catch (error) {
            this._notifyListeners('command:undo:error', { command, error });
            console.error(`❌ Command undo failed: ${command.getDescription()}`, error);
            throw error;
        }
    }

    /**
     * Refaz o próximo comando
     * @returns {Promise<void>}
     */
    async redo() {
        if (!this.canRedo()) {
            throw new Error('No commands to redo');
        }

        const command = this.history[this.currentIndex + 1];
        
        try {
            await command.execute();
            this.currentIndex++;
            
            this._notifyListeners('command:redone', { command });
            console.log(`↪️ Command redone: ${command.getDescription()}`);

        } catch (error) {
            this._notifyListeners('command:redo:error', { command, error });
            console.error(`❌ Command redo failed: ${command.getDescription()}`, error);
            throw error;
        }
    }

    /**
     * Verifica se pode desfazer
     * @returns {boolean}
     */
    canUndo() {
        return this.currentIndex >= 0 && 
               this.history[this.currentIndex] && 
               this.history[this.currentIndex].canUndo();
    }

    /**
     * Verifica se pode refazer
     * @returns {boolean}
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1 &&
               this.history[this.currentIndex + 1] &&
               this.history[this.currentIndex + 1].canRedo();
    }

    /**
     * Limpa histórico de comandos
     */
    clearHistory() {
        const clearedCount = this.history.length;
        this.history = [];
        this.currentIndex = -1;
        
        this._notifyListeners('history:cleared', { clearedCount });
        console.log(`🧹 Command history cleared: ${clearedCount} commands removed`);
    }

    /**
     * Obtém estatísticas do histórico
     * @returns {Object}
     */
    getHistoryStats() {
        return {
            totalCommands: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            commands: this.history.map(cmd => ({
                id: cmd.id,
                type: cmd.constructor.name,
                description: cmd.getDescription(),
                executed: cmd.executed,
                timestamp: cmd.timestamp
            }))
        };
    }

    /**
     * Adiciona listener para eventos do manager
     * @param {Function} listener - Função callback
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Remove listener
     * @param {Function} listener - Função callback para remover
     */
    removeListener(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notifica listeners sobre eventos
     * @param {string} event - Nome do evento
     * @param {Object} data - Dados do evento
     */
    _notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('❌ Error in CommandManager listener:', error);
            }
        });
    }

    /**
     * Serializa histórico para armazenamento
     * @returns {Object}
     */
    serialize() {
        return {
            history: this.history.map(cmd => cmd.serialize ? cmd.serialize() : null).filter(Boolean),
            currentIndex: this.currentIndex,
            maxHistorySize: this.maxHistorySize
        };
    }

    /**
     * Restaura histórico de dados serializados
     * @param {Object} data - Dados serializados
     * @param {Object} dependencies - Dependências para reconstruir comandos
     */
    deserialize(data, dependencies = {}) {
        this.maxHistorySize = data.maxHistorySize || this.maxHistorySize;
        this.currentIndex = data.currentIndex || -1;
        
        // Reconstrói comandos (implementação básica)
        this.history = data.history.map(cmdData => {
            switch (cmdData.type) {
                case 'SearchCommand':
                    return SearchCommand.deserialize(cmdData, dependencies.apiFacade);
                default:
                    return null;
            }
        }).filter(Boolean);
        
        console.log(`📚 CommandManager: Deserialized ${this.history.length} commands`);
    }
}

export { 
    Command, 
    SearchCommand, 
    ClearCacheCommand, 
    ConfigureCommand, 
    CommandManager 
};
