const { Transaction } = require('./models');
const { Op } = require('sequelize');

/**
 * Recategoriza transações baseado na nova lógica
 */
function mapCategory(description, pluggyCategory) {
    if (!description) return 'Outros';
    const desc = description.toLowerCase();

    // Investimentos (aplicação, resgate, RDB, CDB, etc) - PRIORIDADE
    if (desc.match(/aplicacao|aplica[cç][aã]o|resgate|rdb|cdb|lci|lca|tesouro|fundo|cdi|poupanca|poupan[cç]a|investimento|renda\s*fixa|corretora|xp|btg|rico|nuinvest/i)) {
        return 'Investimento';
    }

    // PIX e Transferências - MELHORADO
    if (desc.match(/^pix|^transf|^ted|^doc|transferência|valor\s*adicionado/i) && !desc.match(/uber|99|raizen|shell|ipiranga/i)) {
        return 'Transferência';
    }

    // Receitas
    if (desc.match(/salario|sal[aá]rio|pagamento\s*recebido|rendimento|dividendo|cashback|estorno|reembolso/i)) return 'Receita';

    // Alimentação - MUITO MELHORADO
    if (desc.match(/mercado|supermercado|padaria|a[cç]ougue|feira|restaurante|lanchonete|pizzaria|hamburgu|mc\s*donald|burger|bk\s|bk$|\sbk\s|filial\s*bk|ifood|rappi|uber\s*eats|99\s*food|sushi|bar\s+|cafe\s+|cafeteria|starbucks|pao\s*de\s*acucar|carrefour|extra|walmart|atacadao|barreto|anchietao|compreaki|dogao|sorvete|lanches|pizz|hambur/i)) return 'Alimentação';

    // Transporte
    if (desc.match(/uber|99|cabify|taxi|onibus|metro|trem|estacionamento|combustivel|gasolina|etanol|posto|shell|ipiranga|ped[aá]gio|multa|detran|ipva|seguro\s*auto|carro/i)) return 'Transporte';

    // Lazer
    if (desc.match(/cinema|teatro|show|netflix|spotify|amazon\s*prime|disney|hbo|youtube|game|playstation|xbox|parque|festa|livro|livraria/i)) return 'Lazer';

    // Moradia
    if (desc.match(/aluguel|condominio|iptu|energia|luz|[aá]gua|esgoto|gas|limpeza|reparo|reforma|m[oó]vel|eletrodom[eé]stico/i)) return 'Moradia';

    // Saúde
    if (desc.match(/farm[aá]cia|drogaria|medicamento|hospital|cl[íi]nica|m[eé]dico|doutor|exame|consulta|dentista|psic|fisio|plano\s*sa[uú]de|unimed|amil/i)) return 'Saúde';

    // Contas
    if (desc.match(/fatura|cart[aã]o\s*cr[eé]dito|anuidade|boleto|telefone|vivo|tim|claro|seguro|taxa/i) && !desc.match(/mercado|restaurante|farmacia/i)) return 'Contas';

    // Educação
    if (desc.match(/escola|faculdade|curso|apostila|mensalidade\s*escolar/i)) return 'Educação';

    return 'Outros';
}

async function recategorizeTransactions() {
    try {
        console.log('🔄 Iniciando recategorização de transações...\n');

        // Buscar todas as transações
        const transactions = await Transaction.findAll({
            where: {
                pluggy_transaction_id: { [Op.ne]: null }
            }
        });

        console.log(`📊 Encontradas ${transactions.length} transações do Pluggy\n`);

        let updated = 0;
        let deleted = 0;

        for (const trans of transactions) {
            const newCategory = mapCategory(trans.title, null);

            // Se for investimento, deletar a transação
            if (newCategory === 'Investimento') {
                console.log(`🗑️  Deletando investimento: ${trans.title}`);
                await trans.destroy();
                deleted++;
                continue;
            }

            // Se a categoria mudou, atualizar
            if (trans.category !== newCategory) {
                console.log(`📝 ${trans.title}`);
                console.log(`   Antes: ${trans.category} → Agora: ${newCategory}`);

                await trans.update({ category: newCategory });
                updated++;
            }
        }

        console.log(`\n✅ Recategorização concluída!`);
        console.log(`   - ${updated} transações atualizadas`);
        console.log(`   - ${deleted} investimentos removidos`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

recategorizeTransactions();
