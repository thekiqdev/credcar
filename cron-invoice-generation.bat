@echo off
REM Script para execução do cronjob de geração automática de faturas (Windows)
REM Arquivo: cron-invoice-generation.bat
REM Descrição: Executa o cronjob diariamente para criar faturas agendadas

setlocal enabledelayedexpansion

REM Configurações
set SCRIPT_DIR=%~dp0
set LOG_FILE=%SCRIPT_DIR%logs\cron-invoice-generation.log
set ERROR_LOG=%SCRIPT_DIR%logs\cron-invoice-generation-error.log
set CRON_AUTH_TOKEN=%CRON_AUTH_TOKEN%
if "%CRON_AUTH_TOKEN%"=="" set CRON_AUTH_TOKEN=credcar-cron-token-2025

REM URLs (ajustar conforme ambiente)
if "%NODE_ENV%"=="production" (
    set CRON_URL=https://sistema.credcarmultimarcas.com.br/api/cron/generate-invoices
) else (
    set CRON_URL=http://localhost:3001/api/cron/generate-invoices
)

REM Criar diretório de logs se não existir
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"

REM Função para log
:log
echo [%date% %time%] %~1 >> "%LOG_FILE%"
echo [%date% %time%] %~1
goto :eof

REM Função para log de erro
:log_error
echo [%date% %time%] ERROR: %~1 >> "%ERROR_LOG%"
echo [%date% %time%] ERROR: %~1
goto :eof

REM Função principal
:main
call :log "🚀 Iniciando execução do cronjob de geração de faturas"
call :log "📡 URL: %CRON_URL%"

REM Verificar se o servidor está rodando
if "%NODE_ENV%"=="production" (
    curl -s -f "%CRON_URL%" >nul 2>&1
    if errorlevel 1 (
        call :log_error "Servidor não está respondendo em %CRON_URL%"
        exit /b 1
    )
) else (
    tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq upload-server.js" >nul 2>&1
    if errorlevel 1 (
        call :log_error "Servidor upload-server.js não está rodando"
        exit /b 1
    )
)

REM Executar o cronjob
call :log "⏰ Executando cronjob..."

curl -s -H "Authorization: Bearer %CRON_AUTH_TOKEN%" -H "Content-Type: application/json" "%CRON_URL%" > "%TEMP%\cron_response.json" 2>&1
set CURL_EXIT_CODE=%errorlevel%

if %CURL_EXIT_CODE% equ 0 (
    call :log "✅ Cronjob executado com sucesso"
    
    REM Tentar extrair informações da resposta JSON (simplificado)
    call :log "📋 Resposta salva em: %TEMP%\cron_response.json"
    
    REM Mostrar parte da resposta
    type "%TEMP%\cron_response.json" | findstr "success\|created\|failed\|processed" >> "%LOG_FILE%"
    
) else (
    call :log_error "Falha na execução do cronjob (curl exit code: %CURL_EXIT_CODE%)"
    exit /b 1
)

call :log "🏁 Execução do cronjob concluída"
goto :eof

REM Função de teste
:test_cron
call :log "🧪 Executando teste do cronjob"

set TEST_URL=%CRON_URL:generate-invoices=test-generate-invoices%

curl -s -H "Content-Type: application/json" "%TEST_URL%" > "%TEMP%\cron_test_response.json" 2>&1
set CURL_EXIT_CODE=%errorlevel%

if %CURL_EXIT_CODE% equ 0 (
    call :log "✅ Teste executado com sucesso"
    call :log "📋 Resposta salva em: %TEMP%\cron_test_response.json"
) else (
    call :log_error "Falha no teste (curl exit code: %CURL_EXIT_CODE%)"
)
goto :eof

REM Função de ajuda
:show_help
echo Uso: %~nx0 [opção]
echo.
echo Opções:
echo   (sem opção)  Executar cronjob normalmente
echo   test         Executar teste do cronjob
echo   help         Mostrar esta ajuda
echo.
echo Variáveis de ambiente:
echo   CRON_AUTH_TOKEN  Token de autorização (padrão: credcar-cron-token-2025)
echo   NODE_ENV         Ambiente (production/development)
echo.
echo Exemplos:
echo   %~nx0                    # Executar cronjob
echo   %~nx0 test              # Testar cronjob
echo   set CRON_AUTH_TOKEN=meu_token ^& %~nx0  # Com token customizado
goto :eof

REM Processar argumentos
if "%1"=="test" (
    call :test_cron
) else if "%1"=="help" (
    call :show_help
) else if "%1"=="-h" (
    call :show_help
) else if "%1"=="--help" (
    call :show_help
) else if "%1"=="" (
    call :main
) else (
    echo Opção inválida: %1
    call :show_help
    exit /b 1
)

endlocal
