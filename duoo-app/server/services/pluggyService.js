const axios = require('axios');
require('dotenv').config();

const PLUGGY_API_URL = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

class PluggyService {
    constructor() {
        this.apiKey = null;
        this.apiKeyExpiration = null;
    }

    /**
     * Get or refresh API Key
     */
    async getApiKey() {
        // Check if we have a valid API key
        if (this.apiKey && this.apiKeyExpiration && Date.now() < this.apiKeyExpiration) {
            return this.apiKey;
        }

        try {
            const response = await axios.post(
                `${PLUGGY_API_URL}/auth`,
                {
                    clientId: PLUGGY_CLIENT_ID,
                    clientSecret: PLUGGY_CLIENT_SECRET
                }
            );

            this.apiKey = response.data.apiKey;
            // API keys expire in 24 hours, refresh 1 hour before
            this.apiKeyExpiration = Date.now() + (23 * 60 * 60 * 1000);

            return this.apiKey;
        } catch (error) {
            console.error('Failed to get Pluggy API key:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Pluggy');
        }
    }

    /**
     * Create a Connect Token for the user
     */
    async createConnectToken(userId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.post(
                `${PLUGGY_API_URL}/connect_token`,
                {
                    clientUserId: userId.toString()
                },
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.accessToken;
        } catch (error) {
            console.error('Failed to create connect token:', error.response?.data || error.message);
            throw new Error('Failed to create connect token');
        }
    }

    /**
     * Get Item details
     */
    async getItem(itemId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/items/${itemId}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Failed to get item:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get all accounts for an item
     */
    async getAccounts(itemId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/accounts?itemId=${itemId}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get accounts:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get transactions for an account
     */
    async getTransactions(accountId, params = {}) {
        const apiKey = await this.getApiKey();

        try {
            const queryParams = new URLSearchParams({
                accountId,
                pageSize: params.pageSize || 500,
                ...params
            });

            const response = await axios.get(
                `${PLUGGY_API_URL}/transactions?${queryParams}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get transactions:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get investments for an item (Caixinhas, Poupanças, etc)
     */
    async getInvestments(itemId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/investments?itemId=${itemId}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get investments:', error.response?.data || error.message);
            // Don't throw - investments might not be available for all connectors
            return [];
        }
    }

    /**
     * Get credit cards for an item
     */
    async getCreditCards(itemId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/accounts?itemId=${itemId}&type=CREDIT`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get credit cards:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Get credit card transactions
     */
    async getCreditCardTransactions(accountId, params = {}) {
        const apiKey = await this.getApiKey();

        try {
            const queryParams = new URLSearchParams({
                accountId,
                pageSize: params.pageSize || 500,
                ...params
            });

            const response = await axios.get(
                `${PLUGGY_API_URL}/transactions?${queryParams}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get credit card transactions:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Get identity data
     */
    async getIdentity(itemId) {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/identity/${itemId}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Failed to get identity:', error.response?.data || error.message);
            return null; // Identity might not be available for all items
        }
    }

    /**
     * Get available connectors (banks)
     */
    async getConnectors() {
        const apiKey = await this.getApiKey();

        try {
            const response = await axios.get(
                `${PLUGGY_API_URL}/connectors`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return response.data.results || [];
        } catch (error) {
            console.error('Failed to get connectors:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Delete an item
     */
    async deleteItem(itemId) {
        const apiKey = await this.getApiKey();

        try {
            await axios.delete(
                `${PLUGGY_API_URL}/items/${itemId}`,
                {
                    headers: {
                        'X-API-KEY': apiKey
                    }
                }
            );

            return true;
        } catch (error) {
            console.error('Failed to delete item:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new PluggyService();
