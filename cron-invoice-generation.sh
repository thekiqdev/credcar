#!/bin/bash

# Script para execução do cronjob de geração automática de faturas
# Arquivo: cron-invoice-generation.sh
# Descrição: Executa o cronjob diariamente para criar faturas agendadas

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/cron-invoice-generation.log"
ERROR_LOG="$SCRIPT_DIR/logs/cron-invoice-generation-error.log"
CRON_AUTH_TOKEN="${CRON_AUTH_TOKEN:-credcar-cron-token-2025}"

# URLs (ajustar conforme ambiente)
if [ "$NODE_ENV" = "production" ]; then
    CRON_URL="https://sistema.credcarmultimarcas.com.br/api/cron/generate-invoices"
else
    CRON_URL="http://localhost:3001/api/cron/generate-invoices"
fi

# Criar diretório de logs se não existir
mkdir -p "$SCRIPT_DIR/logs"

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função para log de erro
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
}

# Função principal
main() {
    log "🚀 Iniciando execução do cronjob de geração de faturas"
    log "📡 URL: $CRON_URL"
    
    # Verificar se o servidor está rodando
    if [ "$NODE_ENV" = "production" ]; then
        # Em produção, verificar se o servidor responde
        if ! curl -s -f "$CRON_URL" > /dev/null 2>&1; then
            log_error "Servidor não está respondendo em $CRON_URL"
            exit 1
        fi
    else
        # Em desenvolvimento, verificar se o processo está rodando
        if ! pgrep -f "upload-server.js" > /dev/null; then
            log_error "Servidor upload-server.js não está rodando"
            exit 1
        fi
    fi
    
    # Executar o cronjob
    log "⏰ Executando cronjob..."
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $CRON_AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        "$CRON_URL")
    
    # Separar resposta e código HTTP
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    # Verificar resultado
    if [ "$http_code" -eq 200 ]; then
        log "✅ Cronjob executado com sucesso (HTTP $http_code)"
        
        # Extrair informações da resposta JSON
        if command -v jq > /dev/null 2>&1; then
            processed=$(echo "$response_body" | jq -r '.result.processed // "N/A"')
            created=$(echo "$response_body" | jq -r '.result.created // "N/A"')
            failed=$(echo "$response_body" | jq -r '.result.failed // "N/A"')
            
            log "📊 Resultado: $processed processadas, $created criadas, $failed falharam"
            
            # Log de erros se houver
            errors=$(echo "$response_body" | jq -r '.result.errors[]? // empty')
            if [ -n "$errors" ]; then
                log "⚠️ Erros encontrados:"
                echo "$errors" | while read -r error; do
                    log "   - $error"
                done
            fi
        else
            log "📋 Resposta: $response_body"
        fi
        
    elif [ "$http_code" -eq 401 ]; then
        log_error "Token de autorização inválido (HTTP $http_code)"
        log_error "Verifique a variável CRON_AUTH_TOKEN"
        exit 1
        
    else
        log_error "Falha na execução do cronjob (HTTP $http_code)"
        log_error "Resposta: $response_body"
        exit 1
    fi
    
    log "🏁 Execução do cronjob concluída"
}

# Função de teste
test_cron() {
    log "🧪 Executando teste do cronjob"
    
    # Usar endpoint de teste (sem autenticação)
    test_url="${CRON_URL/generate-invoices/test-generate-invoices}"
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        "$test_url")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log "✅ Teste executado com sucesso (HTTP $http_code)"
        log "📋 Resposta: $response_body"
    else
        log_error "Falha no teste (HTTP $http_code)"
        log_error "Resposta: $response_body"
    fi
}

# Função de ajuda
show_help() {
    echo "Uso: $0 [opção]"
    echo ""
    echo "Opções:"
    echo "  (sem opção)  Executar cronjob normalmente"
    echo "  test         Executar teste do cronjob"
    echo "  help         Mostrar esta ajuda"
    echo ""
    echo "Variáveis de ambiente:"
    echo "  CRON_AUTH_TOKEN  Token de autorização (padrão: credcar-cron-token-2025)"
    echo "  NODE_ENV         Ambiente (production/development)"
    echo ""
    echo "Exemplos:"
    echo "  $0                    # Executar cronjob"
    echo "  $0 test              # Testar cronjob"
    echo "  CRON_AUTH_TOKEN=meu_token $0  # Com token customizado"
}

# Processar argumentos
case "${1:-}" in
    "test")
        test_cron
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        main
        ;;
    *)
        echo "Opção inválida: $1"
        show_help
        exit 1
        ;;
esac
