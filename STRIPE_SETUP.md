# Configuração do Stripe

Este documento explica como configurar o sistema de assinaturas com Stripe.

## Pré-requisitos

1. Conta no Stripe (https://stripe.com)
2. Acesso ao Dashboard do Stripe

## Passo a Passo

### 1. Criar Produtos e Preços no Stripe

1. Acesse o Dashboard do Stripe: https://dashboard.stripe.com
2. Vá em **Products** > **Add product**
3. Crie 3 produtos (ou 1 produto com 3 preços):

#### Produto Mensal
- Nome: "MyFinanceApp - Mensal"
- Preço: R$ 29,90
- Periodicidade: Mensal (Monthly)
- Copie o **Price ID** (começa com `price_`)

#### Produto Semestral
- Nome: "MyFinanceApp - Semestral"
- Preço: R$ 149,90
- Periodicidade: A cada 6 meses
- Copie o **Price ID**

#### Produto Anual
- Nome: "MyFinanceApp - Anual"
- Preço: R$ 249,90
- Periodicidade: Anual (Yearly)
- Copie o **Price ID**

### 2. Obter Chaves da API

1. No Dashboard do Stripe, vá em **Developers** > **API keys**
2. Copie a **Publishable key** (começa com `pk_test_` ou `pk_live_`)
3. Copie a **Secret key** (começa com `sk_test_` ou `sk_live_`)

### 3. Configurar Webhook

1. No Dashboard do Stripe, vá em **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. URL do endpoint: `https://seu-dominio.com/api/subscriptions/webhook`
   - Para desenvolvimento local, use o Stripe CLI (veja abaixo)
4. Selecione os eventos a serem ouvidos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copie o **Signing secret** (começa com `whsec_`)

### 4. Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env.local` com as seguintes variáveis:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_sua_chave_secreta_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Price IDs
STRIPE_PRICE_ID_MONTHLY=price_seu_price_id_mensal_aqui
STRIPE_PRICE_ID_SEMIANNUAL=price_seu_price_id_semestral_aqui
STRIPE_PRICE_ID_ANNUAL=price_seu_price_id_anual_aqui
```

### 5. Testar Webhook Localmente (Opcional)

Para testar webhooks localmente durante o desenvolvimento:

1. Instale o Stripe CLI: https://stripe.com/docs/stripe-cli
2. Execute: `stripe listen --forward-to localhost:3000/api/subscriptions/webhook`
3. Copie o webhook secret fornecido e use no `.env.local`

## Funcionalidades Implementadas

- ✅ Criação de checkout session
- ✅ Verificação de assinatura ativa
- ✅ Bloqueio de criação de recursos sem assinatura
- ✅ Gerenciamento de assinatura (cancelar/reativar)
- ✅ Portal de gerenciamento do Stripe
- ✅ Histórico de pagamentos
- ✅ Webhook para sincronização automática
- ✅ Modal de assinatura para usuários não assinantes
- ✅ Página de gerenciamento de assinatura

## Planos Disponíveis

1. **Mensal**: R$ 29,90/mês
2. **Semestral**: R$ 149,90/semestre (economia de 16%)
3. **Anual**: R$ 249,90/ano (economia de 30%)

## Notas Importantes

- Use chaves de teste (`test`) durante o desenvolvimento
- Use chaves de produção (`live`) apenas em produção
- O webhook deve ser configurado corretamente para sincronização automática
- Os preços podem ser ajustados no código em `src/components/SubscriptionModal.tsx`


