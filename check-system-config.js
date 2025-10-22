// Script para verificar configurações do sistema
function checkSystemConfig() {
  console.log("🔍 Verificando configurações do sistema...");
  
  // Simular diferentes cenários de configuração
  const scenarios = [
    {
      name: "Configuração Atual (15 dias)",
      daysAdvance: 15,
      fixedDay: 20
    },
    {
      name: "Configuração Esperada (7 dias)", 
      daysAdvance: 7,
      fixedDay: 20
    },
    {
      name: "Configuração Padrão (15 dias)",
      daysAdvance: 15,
      fixedDay: 20
    }
  ];
  
  // Simular primeira fatura vencendo em 24/10/2025
  const firstInvoiceDate = new Date('2025-10-24');
  
  scenarios.forEach(scenario => {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Dias de Antecedência: ${scenario.daysAdvance}`);
    console.log(`   Dia Fixo: ${scenario.fixedDay}`);
    
    // Calcular segunda fatura
    const secondDue = new Date(firstInvoiceDate);
    secondDue.setMonth(secondDue.getMonth() + 1);
    
    const year = secondDue.getFullYear();
    const month = secondDue.getMonth();
    const resultDate = new Date(year, month, scenario.fixedDay);
    
    if (resultDate.getDate() !== scenario.fixedDay) {
      resultDate.setDate(0);
    }
    
    const generationDate = new Date(resultDate);
    generationDate.setDate(generationDate.getDate() - scenario.daysAdvance);
    
    console.log(`   Segunda fatura vence: ${resultDate.toISOString().split('T')[0]}`);
    console.log(`   Segunda fatura gerada: ${generationDate.toISOString().split('T')[0]}`);
    
    if (generationDate.getDate() === 8) {
      console.log(`   ⚠️  ESTE CENÁRIO GERA DIA 08!`);
    }
    if (generationDate.getDate() === 13) {
      console.log(`   ✅ ESTE CENÁRIO GERA DIA 13!`);
    }
  });
  
  // Verificar se o problema é na configuração
  console.log(`\n🔍 Diagnóstico:`);
  console.log(`Se está gerando dia 08, provavelmente:`);
  console.log(`1. Configuração está com 13 dias de antecedência`);
  console.log(`2. Ou há erro na busca da configuração`);
  console.log(`3. Ou há erro no cálculo da data da primeira fatura`);
  
  // Testar com 13 dias de antecedência
  console.log(`\n🧮 Teste com 13 dias de antecedência:`);
  const testDue = new Date('2025-11-20');
  const testGen = new Date(testDue);
  testGen.setDate(testGen.getDate() - 13);
  console.log(`Vencimento: ${testDue.toISOString().split('T')[0]}`);
  console.log(`Geração (13 dias antes): ${testGen.toISOString().split('T')[0]}`);
  
  if (testGen.getDate() === 8) {
    console.log(`✅ CONFIRMADO: 13 dias de antecedência gera dia 08!`);
  }
}

checkSystemConfig();
