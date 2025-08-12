/**
 * CacheService - Gerenciamento inteligente de cache para dados de API
 * Implementa cache em memória e LocalStorage com TTL e limpeza automática
 */
class CacheService {
    constructor(options = {}) {
        this.config = {
            defaultTTL: 15 * 60 * 1000, // 15 minutos padrão
            maxMemoryItems: 100,         // Máximo de items em memória
            storagePrefix: 'air_quality_cache_',
            enableLocalStorage: true,
            enableMemoryCache: true,
            autoCleanup: true,
            cleanupInterval: 5 * 60 * 1000, // Limpeza a cada 5 minutos
            ...options
        };

        // Cache em memória (mais rápido)
        this.memoryCache = new Map();
        
        // Inicialização
        this._initializeCache();
        
        if (this.config.autoCleanup) {
            this._startAutoCleanup();
        }
    }

    /**
     * Armazena dados no cache
     * @param {string} key - Chave única para o cache
     * @param {*} data - Dados a serem armazenados
     * @param {number} ttl - Time to Live em milissegundos (opcional)
     * @returns {Promise<boolean>} True se armazenado com sucesso
     */
    async set(key, data, ttl = null) {
        try {
            const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
            const cacheItem = {
                key,
                data,
                createdAt: Date.now(),
                expiresAt,
                accessCount: 0,
                lastAccessed: Date.now()
            };

            // Cache em memória
            if (this.config.enableMemoryCache) {
                // Remove itens antigos se necessário
                if (this.memoryCache.size >= this.config.maxMemoryItems) {
                    this._evictLeastRecentlyUsed();
                }
                this.memoryCache.set(key, cacheItem);
            }

            // Cache no LocalStorage
            if (this.config.enableLocalStorage) {
                try {
                    const storageKey = this.config.storagePrefix + key;
                    localStorage.setItem(storageKey, JSON.stringify(cacheItem));
                } catch (storageError) {
                    console.warn('⚠️ CacheService: LocalStorage write failed', {
                        key,
                        error: storageError.message
                    });
                    // Continua operação mesmo se LocalStorage falhar
                }
            }

            console.log(`💾 CacheService: Cached data for key '${key}'`, {
                expiresIn: ttl || this.config.defaultTTL,
                size: this.memoryCache.size
            });

            return true;

        } catch (error) {
            console.error('❌ CacheService: Error setting cache', {
                key,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Recupera dados do cache
     * @param {string} key - Chave do cache
     * @returns {Promise<*|null>} Dados do cache ou null se não encontrado/expirado
     */
    async get(key) {
        try {
            let cacheItem = null;

            // Tenta cache em memória primeiro (mais rápido)
            if (this.config.enableMemoryCache && this.memoryCache.has(key)) {
                cacheItem = this.memoryCache.get(key);
            }
            // Fallback para LocalStorage
            else if (this.config.enableLocalStorage) {
                const storageKey = this.config.storagePrefix + key;
                const stored = localStorage.getItem(storageKey);
                
                if (stored) {
                    try {
                        cacheItem = JSON.parse(stored);
                        // Recarrega no cache em memória se válido
                        if (this.config.enableMemoryCache && cacheItem && !this._isExpired(cacheItem)) {
                            this.memoryCache.set(key, cacheItem);
                        }
                    } catch (parseError) {
                        console.warn('⚠️ CacheService: Invalid cache data in localStorage', { key });
                        localStorage.removeItem(storageKey);
                    }
                }
            }

            // Verifica se item existe e não expirou
            if (!cacheItem || this._isExpired(cacheItem)) {
                if (cacheItem) {
                    console.log(`⏰ CacheService: Cache expired for key '${key}'`);
                    await this.delete(key); // Remove item expirado
                }
                return null;
            }

            // Atualiza estatísticas de acesso
            cacheItem.accessCount++;
            cacheItem.lastAccessed = Date.now();

            console.log(`✅ CacheService: Cache hit for key '${key}'`, {
                age: Date.now() - cacheItem.createdAt,
                accessCount: cacheItem.accessCount
            });

            return cacheItem.data;

        } catch (error) {
            console.error('❌ CacheService: Error getting cache', {
                key,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Remove item específico do cache
     * @param {string} key - Chave do cache
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    async delete(key) {
        try {
            let removed = false;

            // Remove do cache em memória
            if (this.config.enableMemoryCache && this.memoryCache.has(key)) {
                this.memoryCache.delete(key);
                removed = true;
            }

            // Remove do LocalStorage
            if (this.config.enableLocalStorage) {
                const storageKey = this.config.storagePrefix + key;
                if (localStorage.getItem(storageKey)) {
                    localStorage.removeItem(storageKey);
                    removed = true;
                }
            }

            if (removed) {
                console.log(`🗑️ CacheService: Deleted cache for key '${key}'`);
            }

            return removed;

        } catch (error) {
            console.error('❌ CacheService: Error deleting cache', {
                key,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Limpa todo o cache
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            // Limpa cache em memória
            const memoryCacheSize = this.memoryCache.size;
            this.memoryCache.clear();

            // Limpa LocalStorage
            let localStorageCount = 0;
            if (this.config.enableLocalStorage) {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.config.storagePrefix)) {
                        keys.push(key);
                    }
                }
                keys.forEach(key => localStorage.removeItem(key));
                localStorageCount = keys.length;
            }

            console.log(`🧹 CacheService: Cleared all cache`, {
                memoryItems: memoryCacheSize,
                localStorageItems: localStorageCount
            });

        } catch (error) {
            console.error('❌ CacheService: Error clearing cache', error);
        }
    }

    /**
     * Verifica se um item expirou
     * @param {Object} cacheItem - Item do cache
     * @returns {boolean} True se expirado
     */
    _isExpired(cacheItem) {
        return Date.now() > cacheItem.expiresAt;
    }

    /**
     * Remove item menos recentemente usado (LRU eviction)
     */
    _evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, item] of this.memoryCache.entries()) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            console.log(`🔄 CacheService: Evicted LRU item '${oldestKey}'`);
        }
    }

    /**
     * Limpeza automática de itens expirados
     */
    async _cleanupExpired() {
        try {
            let cleaned = 0;

            // Limpa cache em memória
            for (const [key, item] of this.memoryCache.entries()) {
                if (this._isExpired(item)) {
                    this.memoryCache.delete(key);
                    cleaned++;
                }
            }

            // Limpa LocalStorage
            if (this.config.enableLocalStorage) {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.config.storagePrefix)) {
                        try {
                            const item = JSON.parse(localStorage.getItem(key));
                            if (this._isExpired(item)) {
                                keys.push(key);
                                cleaned++;
                            }
                        } catch (error) {
                            // Item corrompido, remove também
                            keys.push(key);
                            cleaned++;
                        }
                    }
                }
                keys.forEach(key => localStorage.removeItem(key));
            }

            if (cleaned > 0) {
                console.log(`🧹 CacheService: Auto-cleanup removed ${cleaned} expired items`);
            }

        } catch (error) {
            console.error('❌ CacheService: Error during auto-cleanup', error);
        }
    }

    /**
     * Inicializa timers de limpeza automática
     */
    _startAutoCleanup() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
        }

        this._cleanupTimer = setInterval(() => {
            this._cleanupExpired();
        }, this.config.cleanupInterval);

        console.log(`🔄 CacheService: Auto-cleanup started (${this.config.cleanupInterval / 1000}s interval)`);
    }

    /**
     * Inicialização do cache
     */
    _initializeCache() {
        console.log('💾 CacheService: Initialized', {
            memoryCache: this.config.enableMemoryCache,
            localStorage: this.config.enableLocalStorage,
            defaultTTL: this.config.defaultTTL / 1000 + 's',
            maxItems: this.config.maxMemoryItems
        });
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Promise<Object>} Estatísticas detalhadas
     */
    async getStats() {
        const stats = {
            memoryCache: {
                size: this.memoryCache.size,
                maxSize: this.config.maxMemoryItems,
                items: []
            },
            localStorage: {
                size: 0,
                totalSize: 0,
                items: []
            },
            config: this.config
        };

        // Estatísticas do cache em memória
        for (const [key, item] of this.memoryCache.entries()) {
            stats.memoryCache.items.push({
                key,
                age: Date.now() - item.createdAt,
                expiresIn: item.expiresAt - Date.now(),
                accessCount: item.accessCount,
                expired: this._isExpired(item)
            });
        }

        // Estatísticas do LocalStorage
        if (this.config.enableLocalStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.config.storagePrefix)) {
                    try {
                        const value = localStorage.getItem(key);
                        const item = JSON.parse(value);
                        const size = value.length;
                        
                        stats.localStorage.size++;
                        stats.localStorage.totalSize += size;
                        stats.localStorage.items.push({
                            key: key.replace(this.config.storagePrefix, ''),
                            age: Date.now() - item.createdAt,
                            expiresIn: item.expiresAt - Date.now(),
                            size,
                            expired: this._isExpired(item)
                        });
                    } catch (error) {
                        // Item corrompido
                        stats.localStorage.items.push({
                            key: key.replace(this.config.storagePrefix, ''),
                            corrupted: true
                        });
                    }
                }
            }
        }

        return stats;
    }

    /**
     * Testa funcionalidade do cache
     * @returns {Promise<boolean>} True se funcionando corretamente
     */
    async healthCheck() {
        try {
            const testKey = 'health_check_test';
            const testData = { test: true, timestamp: Date.now() };
            
            // Testa escrita
            await this.set(testKey, testData, 1000); // 1 segundo TTL
            
            // Testa leitura
            const retrieved = await this.get(testKey);
            
            // Testa remoção
            await this.delete(testKey);
            
            return retrieved && retrieved.test === true;

        } catch (error) {
            console.error('❌ CacheService: Health check failed', error);
            return false;
        }
    }

    /**
     * Destrutor - limpa recursos
     */
    destroy() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
        console.log('💾 CacheService: Destroyed');
    }
}

export default CacheService;
