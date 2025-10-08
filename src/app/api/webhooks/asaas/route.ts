/**
 * API Route para Webhooks ASAAS
 * Recebe notificações automáticas de mudanças de status de pagamento
 */

import { NextRequest, NextResponse } from 'next/server';
import { asaasWebhookService, AsaasWebhookEvent } from '../../lib/asaas-webhook.service';
import { systemConfigService } from '../../lib/system-config.service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook ASAAS recebido');
    
    // Obter o corpo da requisição
    const body = await request.text();
    const signature = request.headers.get('asaas-signature') || '';
    
    console.log('📋 Headers recebidos:', Object.fromEntries(request.headers.entries()));
    console.log('📋 Signature:', signature);
    console.log('📋 Body length:', body.length);

    // Buscar configuração do ASAAS para validar assinatura
    const asaasConfig = await systemConfigService.getAsaasConfig();
    const webhookSecret = asaasConfig.webhookSecret;

    if (!webhookSecret) {
      console.error('❌ Webhook secret não configurado');
      return NextResponse.json(
        { error: 'Webhook secret não configurado' },
        { status: 500 }
      );
    }

    // Validar assinatura do webhook
    const isValidSignature = asaasWebhookService.validateSignature(body, signature, webhookSecret);
    
    if (!isValidSignature) {
      console.error('❌ Assinatura do webhook inválida');
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 401 }
      );
    }

    console.log('✅ Assinatura do webhook válida');

    // Parse do JSON
    let webhookEvent: AsaasWebhookEvent;
    try {
      webhookEvent = JSON.parse(body);
    } catch (error) {
      console.error('❌ Erro ao fazer parse do JSON:', error);
      return NextResponse.json(
        { error: 'JSON inválido' },
        { status: 400 }
      );
    }

    console.log('📋 Evento recebido:', webhookEvent.event);
    console.log('📋 Payment ID:', webhookEvent.payment?.id);

    // Processar o evento
    const result = await asaasWebhookService.processWebhookEvent(webhookEvent);

    if (result.success) {
      console.log('✅ Webhook processado com sucesso');
      return NextResponse.json({
        success: true,
        message: 'Webhook processado com sucesso',
        invoiceId: result.invoiceId,
        status: result.status
      });
    } else {
      console.error('❌ Erro ao processar webhook:', result.errors);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erro ao processar webhook',
          details: result.errors
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erro geral no webhook:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Método GET para teste/verificação
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook ASAAS endpoint ativo',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}
