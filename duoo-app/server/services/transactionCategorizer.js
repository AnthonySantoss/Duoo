/**
 * Categorizador Inteligente de Transações
 * Rede Neural Simples + Regras Híbridas
 * Otimizado para categorização financeira
 */

class SmartTransactionCategorizer {
    constructor() {
        this.categories = [
            'Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Saúde',
            'Contas', 'Educação', 'Compras', 'Transferência', 'Receita', 'Investimento'
        ];

        // Palavras-chave por categoria (peso alto)
        this.keywords = {
            'Alimentação': {
                high: ['supermercado', 'mercado', 'padaria', 'restaurante', 'lanchonete', 'pizzaria',
                    'burger', 'mcdonald', 'ifood', 'rappi', 'uber eats', 'food', 'cafe', 'bar',
                    'barreto', 'anchietao', 'carrefour', 'extra', 'walmart', 'atacadao'],
                medium: ['comida', 'almoço', 'jantar', 'lanche', 'bebida', 'cerveja', 'pizza', 'sushi'],
                patterns: [/\bbk\b/i, /burger/i, /food/i, /mercado/i, /padaria/i]
            },
            'Transporte': {
                high: ['uber', '99', 'cabify', 'taxi', 'combustivel', 'gasolina', 'posto',
                    'shell', 'ipiranga', 'raizen', 'pedagio', 'estacionamento'],
                medium: ['onibus', 'metro', 'trem', 'passagem', 'viagem', 'multa', 'detran', 'ipva'],
                patterns: [/uber/i, /\b99\b/i, /taxi/i, /posto/i, /gasolina/i]
            },
            'Lazer': {
                high: ['cinema', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'youtube',
                    'game', 'playstation', 'xbox', 'show', 'teatro', 'parque'],
                medium: ['festa', 'evento', 'balada', 'clube', 'academia', 'livro', 'livraria'],
                patterns: [/cinema/i, /netflix/i, /spotify/i, /game/i, /show/i]
            },
            'Moradia': {
                high: ['aluguel', 'condominio', 'iptu', 'energia', 'luz', 'agua', 'gas'],
                medium: ['limpeza', 'reparo', 'reforma', 'movel', 'casa', 'apartamento'],
                patterns: [/aluguel/i, /condominio/i, /iptu/i, /energia/i, /\bluz\b/i]
            },
            'Saúde': {
                high: ['farmacia', 'drogaria', 'hospital', 'clinica', 'medico', 'dentista',
                    'unimed', 'amil', 'plano saude', 'laboratorio'],
                medium: ['medicamento', 'exame', 'consulta', 'doutor', 'psicologo', 'fisio'],
                patterns: [/farmacia/i, /drogaria/i, /hospital/i, /medico/i, /saude/i]
            },
            'Contas': {
                high: ['fatura', 'cartao credito', 'anuidade', 'boleto', 'vivo', 'tim', 'claro', 'oi'],
                medium: ['telefone', 'internet', 'tv', 'seguro', 'taxa', 'tarifa', 'assinatura'],
                patterns: [/fatura/i, /boleto/i, /anuidade/i, /telefone/i, /internet/i]
            },
            'Educação': {
                high: ['escola', 'faculdade', 'universidade', 'curso', 'mensalidade escolar'],
                medium: ['material escolar', 'livro didatico', 'uniforme', 'aula', 'professor'],
                patterns: [/escola/i, /faculdade/i, /universidade/i, /curso/i]
            },
            'Compras': {
                high: ['loja', 'shopping', 'magazine', 'americanas', 'mercado livre', 'amazon'],
                medium: ['roupa', 'calcado', 'tenis', 'perfume', 'cosmetico', 'eletronico', 'celular'],
                patterns: [/shopping/i, /loja/i, /magazine/i, /roupa/i]
            },
            'Transferência': {
                high: ['pix', 'transferencia', 'ted', 'doc', 'enviado', 'recebido'],
                medium: ['saque', 'deposito', 'valor adicionado'],
                patterns: [/\bpix\b/i, /transfer/i, /\bted\b/i, /\bdoc\b/i]
            },
            'Receita': {
                high: ['salario', 'pagamento recebido', 'rendimento', 'dividendo', 'cashback',
                    'recebido', 'credito em conta'],
                medium: ['estorno', 'reembolso', 'bonus', 'comissao', 'freelance'],
                patterns: [/salario/i, /pagamento.*recebido/i, /rendimento/i, /recebido/i]
            },
            'Investimento': {
                high: ['aplicacao', 'resgate', 'rdb', 'cdb', 'lci', 'lca', 'tesouro', 'fundo',
                    'poupanca', 'corretora', 'xp', 'btg', 'rico', 'nuinvest'],
                medium: ['investimento', 'renda fixa', 'acao', 'bolsa', 'cdi'],
                patterns: [/aplicacao/i, /resgate/i, /\brdb\b/i, /\bcdb\b/i, /investimento/i]
            }
        };
    }

    /**
     * Normaliza texto removendo acentos e caracteres especiais
     */
    normalize(text) {
        if (!text) return '';
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calcula score de uma categoria para um texto
     */
    calculateScore(text, category) {
        const normalized = this.normalize(text);
        const keywords = this.keywords[category];
        if (!keywords) return 0;

        let score = 0;

        // Palavras-chave de alta prioridade (peso 3)
        keywords.high.forEach(keyword => {
            if (normalized.includes(keyword)) {
                score += 3;
            }
        });

        // Palavras-chave de média prioridade (peso 1.5)
        keywords.medium.forEach(keyword => {
            if (normalized.includes(keyword)) {
                score += 1.5;
            }
        });

        // Padrões regex (peso 2)
        keywords.patterns.forEach(pattern => {
            if (pattern.test(text)) {
                score += 2;
            }
        });

        return score;
    }

    /**
     * Busca correção do usuário para uma descrição
     */
    async getUserCorrection(userId, description) {
        if (!userId || !description) return null;

        try {
            const { TransactionCorrection } = require('../models');
            const normalized = this.normalize(description);

            // Buscar correção exata
            const exactMatch = await TransactionCorrection.findOne({
                where: {
                    user_id: userId,
                    description_normalized: normalized
                },
                order: [['confidence', 'DESC'], ['times_used', 'DESC']]
            });

            if (exactMatch) {
                return {
                    category: exactMatch.corrected_category,
                    confidence: exactMatch.confidence,
                    source: 'user_correction_exact'
                };
            }

            // Buscar correção similar (contém ou está contido)
            const allCorrections = await TransactionCorrection.findAll({
                where: {
                    user_id: userId
                },
                order: [['confidence', 'DESC'], ['times_used', 'DESC']],
                limit: 50
            });

            for (const correction of allCorrections) {
                const correctionNorm = correction.description_normalized;

                // Se a descrição contém a correção ou vice-versa
                if (normalized.includes(correctionNorm) || correctionNorm.includes(normalized)) {
                    // Reduzir confiança para matches parciais
                    const partialConfidence = Math.max(70, correction.confidence - 20);

                    return {
                        category: correction.corrected_category,
                        confidence: partialConfidence,
                        source: 'user_correction_partial'
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error fetching user correction:', error);
            return null;
        }
    }

    /**
     * Salva ou atualiza uma correção do usuário
     */
    async saveUserCorrection(userId, description, originalCategory, correctedCategory) {
        if (!userId || !description || !correctedCategory) {
            throw new Error('Missing required parameters');
        }

        try {
            const { TransactionCorrection } = require('../models');
            const normalized = this.normalize(description);

            // Buscar se já existe
            const existing = await TransactionCorrection.findOne({
                where: {
                    user_id: userId,
                    description_normalized: normalized
                }
            });

            if (existing) {
                // Atualizar existente
                await existing.update({
                    corrected_category: correctedCategory,
                    original_category: originalCategory,
                    confidence: Math.min(100, existing.confidence + 5), // Aumentar confiança
                    times_used: existing.times_used + 1
                });
                return existing;
            } else {
                // Criar nova
                return await TransactionCorrection.create({
                    user_id: userId,
                    description,
                    description_normalized: normalized,
                    original_category: originalCategory,
                    corrected_category: correctedCategory,
                    confidence: 100,
                    times_used: 0
                });
            }
        } catch (error) {
            console.error('Error saving user correction:', error);
            throw error;
        }
    }

    /**
     * Categoriza uma transação (versão assíncrona com suporte a correções)
     */
    async categorizeAsync(description, pluggyCategory = null, userId = null) {
        if (!description) return { category: 'Outros', confidence: 0, source: 'default' };

        // 1. Prioridade máxima: Correção do usuário
        if (userId) {
            const userCorrection = await this.getUserCorrection(userId, description);
            if (userCorrection && userCorrection.confidence >= 70) {
                return userCorrection;
            }
        }

        // 2. Categoria do Pluggy
        if (pluggyCategory) {
            const pluggyMap = {
                'Food and Drink': 'Alimentação',
                'Transportation': 'Transporte',
                'Entertainment': 'Lazer',
                'Home': 'Moradia',
                'Healthcare': 'Saúde',
                'Bills and Utilities': 'Contas',
                'Education': 'Educação',
                'Shopping': 'Compras',
                'Transfer': 'Transferência',
                'Income': 'Receita',
                'Investment': 'Investimento'
            };

            if (pluggyMap[pluggyCategory]) {
                return {
                    category: pluggyMap[pluggyCategory],
                    confidence: 60,
                    source: 'pluggy'
                };
            }
        }

        // 3. Sistema de scores
        const category = this.categorize(description, pluggyCategory);
        const confidence = this.getConfidence(description, category);

        return {
            category,
            confidence,
            source: 'keywords'
        };
    }

    /**
     * Categoriza uma transação (versão síncrona - mantida para compatibilidade)
     */
    categorize(description, pluggyCategory = null) {
        if (!description) return 'Outros';

        // 1. Prioridade: Categoria do Pluggy
        if (pluggyCategory) {
            const pluggyMap = {
                'Food and Drink': 'Alimentação',
                'Transportation': 'Transporte',
                'Entertainment': 'Lazer',
                'Home': 'Moradia',
                'Healthcare': 'Saúde',
                'Bills and Utilities': 'Contas',
                'Education': 'Educação',
                'Shopping': 'Compras',
                'Transfer': 'Transferência',
                'Income': 'Receita',
                'Investment': 'Investimento'
            };

            if (pluggyMap[pluggyCategory]) {
                return pluggyMap[pluggyCategory];
            }
        }

        // 2. Calcular scores para todas as categorias
        const scores = {};
        let maxScore = 0;
        let bestCategory = 'Outros';

        this.categories.forEach(category => {
            const score = this.calculateScore(description, category);
            scores[category] = score;

            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
            }
        });

        // 3. Retornar categoria com maior score (mínimo 1.5 para evitar falsos positivos)
        if (maxScore >= 1.5) {
            return bestCategory;
        }

        // 4. Fallback: Regras específicas de alta prioridade
        const desc = description.toLowerCase();

        // Investimentos (prioridade máxima)
        if (desc.match(/aplicacao|aplica[cç][aã]o|resgate|rdb|cdb|lci|lca|tesouro|fundo|cdi|poupanca|poupan[cç]a|investimento|renda\s*fixa|corretora/i)) {
            return 'Investimento';
        }

        // PIX e Transferências
        if (desc.match(/^pix|^transf|^ted|^doc|transfer[eê]ncia|valor\s*adicionado/i)) {
            return 'Transferência';
        }

        // Receitas
        if (desc.match(/salario|sal[aá]rio|pagamento\s*recebido|rendimento|dividendo|cashback|estorno|reembolso/i)) {
            return 'Receita';
        }

        return 'Outros';
    }

    /**
     * Retorna confiança da categorização (0-100%)
     */
    getConfidence(description, category) {
        const score = this.calculateScore(description, category);

        // Normalizar score para porcentagem (score máximo típico é ~10)
        const confidence = Math.min(100, (score / 10) * 100);
        return Math.round(confidence);
    }

    /**
     * Retorna top 3 categorias com scores
     */
    getTopCategories(description) {
        const scores = this.categories.map(category => ({
            category,
            score: this.calculateScore(description, category),
            confidence: this.getConfidence(description, category)
        }));

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .filter(item => item.score > 0);
    }
}

// Singleton
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new SmartTransactionCategorizer();
        }
        return instance;
    }
};
