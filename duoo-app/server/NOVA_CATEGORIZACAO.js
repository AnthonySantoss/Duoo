/**
 * SUPER CATEGORIZAÇÃO INTELIGENTE
 * Copie este código e substitua a função mapCategory() no pluggyController.js
 */

function mapCategory(description, pluggyCategory) {
    // Try Pluggy category first
    if (pluggyCategory) {
        const categoryMap = {
            'Food and Drink': 'Alimentação',
            'Shopping': 'Compras',
            'Entertainment': 'Lazer',
            'Transportation': 'Transporte',
            'Healthcare': 'Saúde',
            'Bills and Utilities': 'Contas',
            'Home': 'Moradia',
            'Education': 'Educação',
            'Transfer': 'Transferência',
            'Income': 'Receita',
            'Investment': 'Investimento'
        };

        if (categoryMap[pluggyCategory]) {
            return categoryMap[pluggyCategory];
        }
    }

    if (!description) return 'Outros';
    const desc = description.toLowerCase();

    // PIX e Transferências
    if (desc.match(/pix\s*(enviado|recebido|transfer)/i) || desc.match(/transf|ted|doc/i)) {
        return 'Transferência';
    }

    // Receitas (income)
    if (desc.match(/salario|sal[aá]rio|pagamento\s*recebido|deposito|dep[oó]sito|rendimento|dividendo|cashback|estorno|reembolso|cr[eé]dito\s*em\s*conta/i)) {
        return 'Receita';
    }

    // Alimentação - MUITO EXPANDIDO
    const foodKeywords = /mercado|supermercado|supermerc|mercadinho|minibox|padaria|panificadora|a[cç]ougue|hortifrut|feira|feirante|restaurante|lanchonete|pizzaria|hamburgu|burguer|mc\s*donald|burger\s*king|subway|ifood|rappi|uber\s*eats|99\s*food|sushi|churrascaria|buffet|comida|food|bebida|cerveja|bar\s+|cafe\s+|cafeteria|starbucks|pao\s*de\s*acucar|carrefour|extra|walmart|atacadao/i;
    if (desc.match(foodKeywords)) {
        return 'Alimentação';
    }

    // Transporte - MUITO EXPANDIDO
    const transportKeywords = /uber|99|cabify|taxi|onibus|metro|trem|estacionamento|combustivel|gasolina|etanol|posto\s*|shell|ipiranga|ped[aá]gio|multa|detran|ipva|seguro\s*auto|moto\s*|carro|lavagem/i;
    if (desc.match(transportKeywords)) {
        return 'Transporte';
    }

    // Lazer - MUITO EXPANDIDO  
    const entertainmentKeywords = /cinema|teatro|show|netflix|spotify|amazon\s*prime|disney|hbo|streaming|youtube|game|playstation|xbox|parque|festa|museu|livro|livraria|revista/i;
    if (desc.match(entertainmentKeywords)) {
        return 'Lazer';
    }

    // Moradia - MUITO EXPANDIDO
    const homeKeywords = /aluguel|condominio|iptu|energia|luz|[aá]gua|esgoto|gas|internet\s*residen|limpeza|faxina|reparo|reforma|m[oó]vel|eletrodom[eé]stico/i;
    if (desc.match(homeKeywords)) {
        return 'Moradia';
    }

    // Saúde - MUITO EXPANDIDO
    const healthKeywords = /farm[aá]cia|drogaria|drogasil|pacheco|medicamento|hospital|cl[íi]nica|m[eé]dico|doutor|exame|consulta|dentista|psic[oó]logo|fisio|plano\s*sa[uú]de|unimed|amil|sulamerica/i;
    if (desc.match(healthKeywords)) {
        return 'Saúde';
    }

    // Contas - com exclusões
    const billsKeywords = /fatura|cart[aã]o\s*cr[eé]dito|anuidade|boleto|telefone|vivo|tim|claro|seguro|taxa/i;
    const billsExclusions = /mercado|restaurante|farmacia|posto/i;
    if (desc.match(billsKeywords) && !desc.match(billsExclusions)) {
        return 'Contas';
    }

    // Educação
    const educationKeywords = /escola|faculdade|curso|livro|apostila|mensalidade\s*escolar/i;
    if (desc.match(educationKeywords)) {
        return 'Educação';
    }

    return 'Outros';
}
