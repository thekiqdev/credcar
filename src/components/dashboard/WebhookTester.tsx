/**
 * Componente para Teste de Webhooks ASAAS
 * Permite testar a integração de webhooks localmente
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Webhook, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WebhookTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

const WebhookTester: React.FC = () => {
  const [testResults, setTestResults] = useState<WebhookTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testPaymentId, setTestPaymentId] = useState('');

  // Simular evento de webhook PAYMENT_RECEIVED
  const simulatePaymentReceived = async () => {
    setIsLoading(true);
    
    try {
      const mockWebhookEvent = {
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: testPaymentId || 'pay_test_123456',
          customer: 'cus_test_123456',
          value: 8832.00,
          netValue: 8832.00,
          originalValue: 8832.00,
          interestValue: 0,
          description: 'Parcela 1 - primeira',
          billingType: 'PIX',
          status: 'RECEIVED',
          dueDate: '2025-10-15',
          originalDueDate: '2025-10-15',
          paymentDate: new Date().toISOString().split('T')[0],
          clientPaymentDate: new Date().toISOString().split('T')[0],
          installmentNumber: 1,
          invoiceUrl: 'https://sandbox.asaas.com/i/test123',
          invoiceNumber: '11550093',
          externalReference: testPaymentId || '110', // ID da fatura local
          deleted: false,
          anticipated: false,
          anticipable: true,
          creditDate: new Date().toISOString().split('T')[0],
          estimatedCreditDate: new Date().toISOString().split('T')[0],
          transactionReceiptUrl: 'https://sandbox.asaas.com/receipt/test123',
          nossoNumero: '123456789',
          bankSlipUrl: 'https://sandbox.asaas.com/bankSlip/test123',
          pixTransaction: {
            id: 'pix_test_123',
            status: 'CONFIRMED',
            qrCode: '00020126360014BR.GOV.BCB.PIX0114+55119999999995204000053039865408832.005802BR5913Teste Pagamento6008Brasilia62070503***6304',
            endToEndIdentifier: 'E12345678202501061234567890'
          }
        }
      };

      console.log('🧪 Simulando webhook PAYMENT_RECEIVED:', mockWebhookEvent);

      // Chamar a API de webhook localmente
      const response = await fetch('/api/webhooks/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'asaas-signature': 'test_signature' // Para teste, não validamos assinatura
        },
        body: JSON.stringify(mockWebhookEvent)
      });

      const result = await response.json();
      
      setTestResults(prev => [{
        success: response.ok,
        message: response.ok ? 'Webhook PAYMENT_RECEIVED processado com sucesso' : 'Erro ao processar webhook',
        details: result,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      setTestResults(prev => [{
        success: false,
        message: `Erro ao testar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: error,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simular evento de webhook PAYMENT_OVERDUE
  const simulatePaymentOverdue = async () => {
    setIsLoading(true);
    
    try {
      const mockWebhookEvent = {
        event: 'PAYMENT_OVERDUE',
        payment: {
          id: testPaymentId || 'pay_test_123456',
          customer: 'cus_test_123456',
          value: 8832.00,
          netValue: 8832.00,
          originalValue: 8832.00,
          interestValue: 0,
          description: 'Parcela 1 - primeira',
          billingType: 'PIX',
          status: 'OVERDUE',
          dueDate: '2025-10-15',
          originalDueDate: '2025-10-15',
          installmentNumber: 1,
          invoiceUrl: 'https://sandbox.asaas.com/i/test123',
          invoiceNumber: '11550093',
          externalReference: testPaymentId || '110',
          deleted: false,
          anticipated: false,
          anticipable: true
        }
      };

      console.log('🧪 Simulando webhook PAYMENT_OVERDUE:', mockWebhookEvent);

      const response = await fetch('/api/webhooks/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'asaas-signature': 'test_signature'
        },
        body: JSON.stringify(mockWebhookEvent)
      });

      const result = await response.json();
      
      setTestResults(prev => [{
        success: response.ok,
        message: response.ok ? 'Webhook PAYMENT_OVERDUE processado com sucesso' : 'Erro ao processar webhook',
        details: result,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      setTestResults(prev => [{
        success: false,
        message: `Erro ao testar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: error,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar status de uma fatura específica
  const checkInvoiceStatus = async () => {
    if (!testPaymentId) {
      setTestResults(prev => [{
        success: false,
        message: 'Digite um ID de fatura para verificar',
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', testPaymentId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar fatura: ${error.message}`);
      }

      setTestResults(prev => [{
        success: true,
        message: `Fatura ${testPaymentId} encontrada`,
        details: {
          id: invoice.id,
          status: invoice.status,
          due_date: invoice.due_date,
          paid_at: invoice.paid_at,
          invoice_code: invoice.invoice_code
        },
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);

    } catch (error) {
      console.error('Erro ao verificar fatura:', error);
      setTestResults(prev => [{
        success: false,
        message: `Erro ao verificar fatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: error,
        timestamp: new Date().toLocaleString('pt-BR')
      }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  // Limpar resultados
  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Teste de Webhooks ASAAS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input para ID da fatura */}
        <div>
          <Label htmlFor="test-payment-id">ID da Fatura (opcional)</Label>
          <Input
            id="test-payment-id"
            value={testPaymentId}
            onChange={(e) => setTestPaymentId(e.target.value)}
            placeholder="Ex: 110 (ID da fatura local)"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Deixe vazio para usar valores padrão de teste
          </p>
        </div>

        {/* Botões de teste */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={simulatePaymentReceived}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Simular Pagamento Recebido
          </Button>
          
          <Button
            onClick={simulatePaymentOverdue}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Simular Pagamento Vencido
          </Button>
          
          <Button
            onClick={checkInvoiceStatus}
            disabled={isLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Verificar Status da Fatura
          </Button>
          
          <Button
            onClick={clearResults}
            variant="ghost"
            className="flex items-center gap-2"
          >
            Limpar Resultados
          </Button>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Processando...
          </div>
        )}

        {/* Resultados dos testes */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Resultados dos Testes:</h4>
            {testResults.map((result, index) => (
              <Alert key={index} className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.message}</span>
                      <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                        {result.timestamp}
                      </Badge>
                    </div>
                    {result.details && (
                      <AlertDescription className="text-xs">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </AlertDescription>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Informações sobre webhooks */}
        <Alert>
          <Webhook className="h-4 w-4" />
          <AlertDescription>
            <strong>Como usar:</strong><br />
            1. Configure a URL do webhook no ASAAS: <code>/api/webhooks/asaas</code><br />
            2. Use os botões acima para simular eventos<br />
            3. Verifique os logs no console para debug<br />
            4. Os webhooks reais do ASAAS serão processados automaticamente
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default WebhookTester;
