const categorizerService = require('./services/transactionCategorizer');

const categorizer = categorizerService.getInstance();

// Testes
const testCases = [
    'Supermercado Barreto',
    'Filial Bk Fs Aracaju-A',
    'Uber do Brasil',
    '99 Tecnologia',
    'Netflix',
    'Spotify',
    'Aluguel',
    'Energia Elétrica',
    'Farmacia Drogasil',
    'Faculdade Estacio',
    'Transferência enviada|PIX',
    'Pagamento recebido',
    'Aplicação RDB',
    'Resgate CDB',
    'Shopping Riomar',
    'Cinema Cinemark',
    'Posto Ipiranga',
    'Padaria Pão Quente',
    'Restaurante Outback',
    'iFood',
    'Rappi',
    'Plano de Saúde Unimed',
    'Dentista Dr Silva',
    'Material Escolar',
    'Livro Amazon',
    'Fatura Cartão Nubank',
    'Boleto Vivo',
    'Condomínio',
    'IPTU',
    'Academia Smart Fit',
    'Salário Empresa XYZ'
];

console.log('\n🧪 TESTE DO CATEGORIZADOR INTELIGENTE\n');
console.log('='.repeat(80));

testCases.forEach(description => {
    const category = categorizer.categorize(description);
    const topCategories = categorizer.getTopCategories(description);

    console.log(`\n📝 "${description}"`);
    console.log(`   ✅ Categoria: ${category}`);

    if (topCategories.length > 0) {
        console.log(`   📊 Confiança: ${topCategories[0].confidence}%`);

        if (topCategories.length > 1) {
            console.log(`   Alternativas:`);
            topCategories.slice(1).forEach((alt, i) => {
                console.log(`      ${i + 2}. ${alt.category} (${alt.confidence}%)`);
            });
        }
    }
});

console.log('\n' + '='.repeat(80));
console.log('\n✅ Teste concluído!\n');
