// Teste de validação dos cálculos de parcelas
// Arquivo: test-parcelas-calculo.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testParcelasCalculo() {
  console.log('🧪 TESTE DE VALIDAÇÃO DOS CÁLCULOS DE PARCELAS');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar dados reais do banco
    console.log('\n📊 1. BUSCANDO DADOS REAIS DO BANCO...');
    
    const { data: planos, error: planosError } = await supabase
      .from('planos')
      .select('*')
      .limit(5);

    if (planosError) {
      console.error('❌ Erro ao buscar planos:', planosError);
      return;
    }

    console.log(`✅ Encontrados ${planos.length} planos:`);
    planos.forEach(plano => {
      console.log(`   - ${plano.nome}: ${plano.descricao}`);
    });

    // 2. Buscar faixas de crédito
    console.log('\n💰 2. BUSCANDO FAIXAS DE CRÉDITO...');
    
    const { data: faixas, error: faixasError } = await supabase
      .from('faixas_de_credito')
      .select(`
        *,
        planos!inner (nome, descricao)
      `)
      .limit(10);

    if (faixasError) {
      console.error('❌ Erro ao buscar faixas:', faixasError);
      return;
    }

    console.log(`✅ Encontradas ${faixas.length} faixas de crédito:`);
    faixas.forEach(faixa => {
      console.log(`   - ${faixa.planos.nome}: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      console.log(`     1ª Parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`     Parcelas Restantes: R$ ${faixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`     Total Parcelas: ${faixa.numero_total_parcelas}`);
    });

    // 3. Buscar parcelas personalizadas
    console.log('\n🎯 3. BUSCANDO PARCELAS PERSONALIZADAS...');
    
    const { data: parcelasPersonalizadas, error: parcelasError } = await supabase
      .from('condicoes_parcelas')
      .select(`
        *,
        faixas_de_credito!inner (
          valor_credito,
          planos!inner (nome)
        )
      `)
      .limit(20);

    if (parcelasError) {
      console.error('❌ Erro ao buscar parcelas personalizadas:', parcelasError);
      return;
    }

    console.log(`✅ Encontradas ${parcelasPersonalizadas.length} parcelas personalizadas:`);
    parcelasPersonalizadas.forEach(parcela => {
      console.log(`   - ${parcela.faixas_de_credito.planos.nome}: Parcela ${parcela.numero_parcela} = R$ ${parcela.valor_parcela.toLocaleString('pt-BR')}`);
    });

    // 4. Validar cálculos matemáticos
    console.log('\n🧮 4. VALIDANDO CÁLCULOS MATEMÁTICOS...');
    
    for (const faixa of faixas) {
      console.log(`\n📋 Analisando: ${faixa.planos.nome} - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      
      // Buscar parcelas personalizadas para esta faixa
      const parcelasCustom = parcelasPersonalizadas.filter(p => 
        p.faixas_de_credito.valor_credito === faixa.valor_credito
      );
      
      // Calcular total
      let totalCalculado = 0;
      let detalhesCalculo = [];
      
      // 1ª Parcela
      totalCalculado += faixa.valor_primeira_parcela;
      detalhesCalculo.push(`1ª Parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      
      // Parcelas personalizadas
      if (parcelasCustom.length > 0) {
        parcelasCustom.forEach(parcela => {
          totalCalculado += parcela.valor_parcela;
          detalhesCalculo.push(`Parcela ${parcela.numero_parcela}: R$ ${parcela.valor_parcela.toLocaleString('pt-BR')}`);
        });
      }
      
      // Parcelas restantes
      const parcelasRestantes = faixa.numero_total_parcelas - 1 - parcelasCustom.length;
      if (parcelasRestantes > 0) {
        const valorRestantes = parcelasRestantes * faixa.valor_parcelas_restantes;
        totalCalculado += valorRestantes;
        detalhesCalculo.push(`Parcelas Restantes (${parcelasRestantes}x): R$ ${valorRestantes.toLocaleString('pt-BR')}`);
      }
      
      // Exibir resultado
      console.log(`   📊 Detalhes do Cálculo:`);
      detalhesCalculo.forEach(detalhe => console.log(`      ${detalhe}`));
      console.log(`   💰 Total Calculado: R$ ${totalCalculado.toLocaleString('pt-BR')}`);
      console.log(`   🎯 Valor do Crédito: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      
      const diferenca = Math.abs(totalCalculado - faixa.valor_credito);
      const percentualDiferenca = (diferenca / faixa.valor_credito) * 100;
      
      if (diferenca < 0.01) {
        console.log(`   ✅ CÁLCULO CORRETO! (Diferença: R$ ${diferenca.toFixed(2)})`);
      } else {
        console.log(`   ❌ CÁLCULO INCORRETO! (Diferença: R$ ${diferenca.toFixed(2)} - ${percentualDiferenca.toFixed(2)}%)`);
      }
    }

    // 5. Testar função existente
    console.log('\n🔧 5. TESTANDO FUNÇÃO EXISTENTE...');
    
    const testFaixa = faixas[0];
    console.log(`📋 Testando com: ${testFaixa.planos.nome} - R$ ${testFaixa.valor_credito.toLocaleString('pt-BR')}`);
    
    // Simular função existente
    const installments = [];
    
    // First installment
    installments.push({
      numero_parcela: 1,
      valor_parcela: testFaixa.valor_primeira_parcela,
      vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });

    // Remaining installments
    for (let i = 2; i <= testFaixa.numero_total_parcelas; i++) {
      installments.push({
        numero_parcela: i,
        valor_parcela: testFaixa.valor_parcelas_restantes,
        vencimento: new Date(new Date().setMonth(new Date().getMonth() + i)),
      });
    }
    
    const totalFuncaoExistente = installments.reduce((sum, inst) => sum + inst.valor_parcela, 0);
    console.log(`   📊 Total da Função Existente: R$ ${totalFuncaoExistente.toLocaleString('pt-BR')}`);
    console.log(`   🎯 Valor do Crédito: R$ ${testFaixa.valor_credito.toLocaleString('pt-BR')}`);
    
    const diferencaFuncao = Math.abs(totalFuncaoExistente - testFaixa.valor_credito);
    if (diferencaFuncao < 0.01) {
      console.log(`   ✅ FUNÇÃO EXISTENTE CORRETA!`);
    } else {
      console.log(`   ❌ FUNÇÃO EXISTENTE INCORRETA! (Diferença: R$ ${diferencaFuncao.toFixed(2)})`);
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Dados do banco carregados com sucesso');
    console.log('✅ Estrutura de parcelas identificada');
    console.log('✅ Cálculos validados');
    console.log('✅ Função existente testada');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Implementar lógica para parcelas personalizadas');
    console.log('2. Criar serviço de análise de contratos');
    console.log('3. Validar com dados reais de contratos');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testParcelasCalculo();