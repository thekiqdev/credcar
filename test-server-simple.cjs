const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Configuração do Supabase
const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MjQ4MDAsImV4cCI6MjA0OTIwMDgwMH0.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), port: 3001 });
});

// Teste: Verificar faturas do contrato 48
app.get('/api/test/invoices/48', async (req, res) => {
  try {
    console.log('🧪 [TEST] Verificando faturas do contrato 48');
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, due_date, status, next_invoice_date')
      .eq('contract_id', 48)
      .order('installment_number');

    if (error) {
      throw new Error(`Erro ao buscar faturas: ${error.message}`);
    }

    console.log(`📋 [TEST] Encontradas ${invoices?.length || 0} faturas`);

    res.json({
      success: true,
      contractId: 48,
      invoices: invoices || [],
      count: invoices?.length || 0
    });

  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste: Verificar faixa de crédito 121
app.get('/api/test/credit-range/121', async (req, res) => {
  try {
    console.log('🧪 [TEST] Verificando faixa de crédito 121');
    
    const { data: creditRange, error } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_primeira_parcela, valor_parcelas_restantes, numero_total_parcelas')
      .eq('id', 121)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar faixa de crédito: ${error.message}`);
    }

    console.log(`📋 [TEST] Faixa de crédito encontrada`);

    res.json({
      success: true,
      creditRange: creditRange
    });

  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste: Verificar parcelas personalizadas
app.get('/api/test/custom-installments/121', async (req, res) => {
  try {
    console.log('🧪 [TEST] Verificando parcelas personalizadas da faixa 121');
    
    const { data: customInstallments, error } = await supabase
      .from('condicoes_parcelas')
      .select('numero_parcela, valor_parcela')
      .eq('faixa_credito_id', 121)
      .order('numero_parcela');

    if (error) {
      throw new Error(`Erro ao buscar parcelas personalizadas: ${error.message}`);
    }

    console.log(`📋 [TEST] Encontradas ${customInstallments?.length || 0} parcelas personalizadas`);

    res.json({
      success: true,
      customInstallments: customInstallments || [],
      count: customInstallments?.length || 0
    });

  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Teste: Simular criação da fatura 4
app.get('/api/test/simulate-invoice-4', async (req, res) => {
  try {
    console.log('🧪 [TEST] Simulando criação da fatura 4');
    
    // 1. Buscar faturas existentes
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, due_date, status, next_invoice_date')
      .eq('contract_id', 48)
      .order('installment_number');

    if (invoicesError) {
      throw new Error(`Erro ao buscar faturas: ${invoicesError.message}`);
    }

    // 2. Buscar faixa de crédito
    const { data: creditRange, error: creditError } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_primeira_parcela, valor_parcelas_restantes, numero_total_parcelas')
      .eq('id', 121)
      .single();

    if (creditError) {
      throw new Error(`Erro ao buscar faixa de crédito: ${creditError.message}`);
    }

    // 3. Buscar parcelas personalizadas
    const { data: customInstallments, error: customError } = await supabase
      .from('condicoes_parcelas')
      .select('numero_parcela, valor_parcela')
      .eq('faixa_credito_id', 121)
      .order('numero_parcela');

    if (customError) {
      console.warn(`⚠️ Erro ao buscar parcelas personalizadas: ${customError.message}`);
    }

    // 4. Determinar valor da parcela 4
    let parcel4Value = creditRange.valor_parcelas_restantes;
    let parcel4Type = 'restante';

    if (customInstallments && customInstallments.length > 0) {
      const customParcel4 = customInstallments.find(inst => inst.numero_parcela === 4);
      if (customParcel4) {
        parcel4Value = customParcel4.valor_parcela;
        parcel4Type = 'personalizada';
      }
    }

    // 5. Calcular data de vencimento
    const firstInvoice = invoices?.find(inv => inv.installment_number === 1);
    let dueDateStr = null;
    
    if (firstInvoice) {
      const firstDueDate = new Date(firstInvoice.due_date);
      const parcel4DueDate = new Date(firstDueDate);
      parcel4DueDate.setMonth(parcel4DueDate.getMonth() + 3); // 4ª parcela = 1ª + 3 meses
      dueDateStr = parcel4DueDate.toISOString().split('T')[0];
    }

    // 6. Verificar se já existe
    const existingParcel4 = invoices?.find(inv => inv.installment_number === 4);

    console.log(`✅ [TEST] Simulação concluída`);

    res.json({
      success: true,
      simulation: {
        contractId: 48,
        creditRange: creditRange,
        customInstallments: customInstallments || [],
        existingInvoices: invoices || [],
        parcel4: {
          value: parcel4Value,
          type: parcel4Type,
          dueDate: dueDateStr,
          exists: !!existingParcel4,
          existingData: existingParcel4
        }
      }
    });

  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 Servidor de teste rodando na porta ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Faturas contrato 48: http://localhost:${PORT}/api/test/invoices/48`);
  console.log(`🔗 Faixa crédito 121: http://localhost:${PORT}/api/test/credit-range/121`);
  console.log(`🔗 Parcelas personalizadas: http://localhost:${PORT}/api/test/custom-installments/121`);
  console.log(`🔗 Simular fatura 4: http://localhost:${PORT}/api/test/simulate-invoice-4`);
});
