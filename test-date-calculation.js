// Script de teste para verificar cálculo de datas
function testDateCalculation() {
  console.log("🧮 Testando cálculo de datas de faturas...");
  
  // Simular configurações
  const fixedDay = 20;
  const daysAdvance = 7;
  
  // Simular data da primeira fatura (exemplo: 24/10/2025)
  const firstInvoiceDate = new Date('2025-10-24');
  console.log(`📅 Data da primeira fatura: ${firstInvoiceDate.toISOString().split('T')[0]}`);
  
  // Testar cálculo para diferentes parcelas
  for (let installmentNumber = 2; installmentNumber <= 5; installmentNumber++) {
    console.log(`\n🔢 Testando parcela ${installmentNumber}:`);
    
    // Calcular vencimento baseado na primeira fatura
    const dueDate = new Date(firstInvoiceDate);
    dueDate.setMonth(dueDate.getMonth() + (installmentNumber - 1));
    
    const year = dueDate.getFullYear();
    const month = dueDate.getMonth();
    const resultDate = new Date(year, month, fixedDay);
    
    // Se o dia não existe no mês, usar último dia
    if (resultDate.getDate() !== fixedDay) {
      resultDate.setDate(0);
    }
    
    // Calcular data de geração (daysAdvance dias antes)
    const generationDate = new Date(resultDate);
    generationDate.setDate(generationDate.getDate() - daysAdvance);
    
    console.log(`   - Vencimento: ${resultDate.toISOString().split('T')[0]} (dia ${fixedDay})`);
    console.log(`   - Geração: ${generationDate.toISOString().split('T')[0]} (${daysAdvance} dias antes)`);
    console.log(`   - Next Invoice Date: ${generationDate.toISOString().split('T')[0]}`);
  }
  
  // Testar problema específico mencionado
  console.log(`\n🔍 Teste específico - Por que dia 08 ao invés de dia 13?`);
  
  // Se a primeira fatura vence em 24/10/2025
  const firstDue = new Date('2025-10-24');
  console.log(`Primeira fatura vence: ${firstDue.toISOString().split('T')[0]}`);
  
  // Segunda fatura deveria vencer em 20/11/2025
  const secondDue = new Date(firstDue);
  secondDue.setMonth(secondDue.getMonth() + 1);
  secondDue.setDate(fixedDay);
  console.log(`Segunda fatura vence: ${secondDue.toISOString().split('T')[0]}`);
  
  // Geração deveria ser 7 dias antes = 13/11/2025
  const secondGeneration = new Date(secondDue);
  secondGeneration.setDate(secondGeneration.getDate() - daysAdvance);
  console.log(`Segunda fatura gerada em: ${secondGeneration.toISOString().split('T')[0]}`);
  
  console.log(`\n✅ Se está gerando dia 08, há problema no cálculo!`);
}

testDateCalculation();
