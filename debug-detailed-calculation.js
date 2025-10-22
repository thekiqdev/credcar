// Script para debug detalhado do cálculo
function debugDetailedCalculation() {
  console.log("🔍 Debug detalhado do cálculo...");
  
  // Simular diferentes cenários
  const scenarios = [
    {
      name: "Cenário 1: Primeira fatura 24/10/2025",
      firstInvoiceDate: new Date('2025-10-24'),
      fixedDay: 20,
      daysAdvance: 7
    },
    {
      name: "Cenário 2: Primeira fatura 22/10/2025", 
      firstInvoiceDate: new Date('2025-10-22'),
      fixedDay: 20,
      daysAdvance: 7
    },
    {
      name: "Cenário 3: Primeira fatura 15/10/2025",
      firstInvoiceDate: new Date('2025-10-15'),
      fixedDay: 20,
      daysAdvance: 7
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Configurações: Dia Fixo ${scenario.fixedDay}, Antecedência ${scenario.daysAdvance}`);
    
    // Calcular segunda fatura
    const secondDue = new Date(scenario.firstInvoiceDate);
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
    
    // Verificar se pode gerar dia 08
    if (generationDate.getDate() === 8) {
      console.log(`   ⚠️  ESTE CENÁRIO GERA DIA 08!`);
    }
  });
  
  // Testar problema específico: por que dia 08?
  console.log(`\n🔍 Investigando por que pode gerar dia 08:`);
  
  // Se a primeira fatura vence em 15/10/2025
  const testDate = new Date('2025-10-15');
  console.log(`Se primeira fatura vence em: ${testDate.toISOString().split('T')[0]}`);
  
  // Segunda fatura: novembro + dia 20
  const secondDue = new Date(testDate);
  secondDue.setMonth(secondDue.getMonth() + 1);
  secondDue.setDate(20);
  console.log(`Segunda fatura vence em: ${secondDue.toISOString().split('T')[0]}`);
  
  // Geração: 7 dias antes
  const generation = new Date(secondDue);
  generation.setDate(generation.getDate() - 7);
  console.log(`Segunda fatura gerada em: ${generation.toISOString().split('T')[0]}`);
  
  // Testar com diferentes dias de antecedência
  console.log(`\n🧮 Testando diferentes dias de antecedência:`);
  for (let days = 5; days <= 15; days++) {
    const testGen = new Date(secondDue);
    testGen.setDate(testGen.getDate() - days);
    console.log(`   ${days} dias antes: ${testGen.toISOString().split('T')[0]}`);
  }
}

debugDetailedCalculation();
