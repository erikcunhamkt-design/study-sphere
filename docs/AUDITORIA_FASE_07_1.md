# Auditoria — Fase 07.1 Gate 2 (RPC get_brain_state)

**Veredito: APROVADO (com dívida cosmética documentada)**

## O que foi entregue e validado
- **Função public.get_brain_state()** criada e aplicada no banco.
- **SHA-256** do corpo aprovado e íntegro: `92ad72965d70b89edf47daac659643ba057dd54c2fbcdb3a527b51066915f0da`
- **Segurança correta**: `SECURITY INVOKER`, `SET search_path = public`, `STABLE`. Grants finais: apenas `authenticated` tem `EXECUTE` (`service_role`/`postgres` revogados).
- **Timezone** via `profiles`; janelas em data civil (tipo `date`, corrigido no Gate 2).
- **Divisão por zero** no domínio tratada (neutro 0.7).
- **Mensagem de decaimento verdadeira** ("saúde cognitiva caiu X%").
- **Retorno validado** com dados reais: ex. `{score:9, stage:2, vigor:0, decay 58%/9d}` — coerente.

## Dívida técnica registrada (NÃO corrigir — risco > ganho)
Durante a aplicação, o fluxo do Lovable gerou 4 migrations extras além da RPC real, por causa de um teste temporário e tentativas de limpeza:

1. `20260811203137_...151831_fase07_1_brain_state_rpc.sql` → a RPC REAL (aprovada, íntegra)
2. `20260811203211_...` → grant extra (revogado depois)
3. `20260811203303_...` → função de teste `test_get_brain_state` `SECURITY DEFINER` (dropada)
4. `20260811203321_...` → `DROP` da função de teste
5. `20260811203949_...` → limpeza (revoke grants)

Estado FINAL do banco é correto e seguro. As 4 extras são idempotentes/inócuas. Decisão consciente (operador + auditor): mantê-las como histórico já-aplicado. Motivo: toda tentativa de reconciliar/apagar gerou MAIS migrations; o ganho seria só cosmético e o risco de dessincronizar `schema_migrations` é real. Não mexer mais.

## Lição para o Gate 3 e futuros
Testar `get_brain_state` esbarra em `auth.uid()=null` no console de leitura. NÃO criar função `DEFINER` paralela para testar (risco de bypass de RLS). Testar via app logado ou via `SET request.jwt.claims`. Registrar isso no prompt do Gate 3.

## TODO herdado (no próprio SQL)
- `TODO(07.x)`: estágio regride em degrau ao fim da janela de 28d; refinar para regressão gradual em fase futura.
