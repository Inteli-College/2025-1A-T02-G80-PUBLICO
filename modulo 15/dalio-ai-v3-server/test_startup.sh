# Configurações do PostgreSQL para testar
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=dalio_ai_test
export DB_USER=postgres
# Sem senha para teste local

# Testar se o servidor inicia (vai falhar no banco mas deve funcionar sem ele)
pnpm dev
