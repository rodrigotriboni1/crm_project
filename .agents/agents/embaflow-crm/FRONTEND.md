# Agente: Frontend (React + Vite)

## Especialidade
SPA em `client/`: React 18, TypeScript, TanStack Query, React Router, Tailwind v4, componentes Radix onde existem, integração `@supabase/supabase-js`.

## Escopo real
- `client/src/pages/**`, `client/src/components/**`, `client/src/hooks/**`, `client/src/api/**`, `client/src/lib/**`.
- Padrão de dados: preferir **hooks com React Query** (`useCrm`, `useEquipe`, etc.) em vez de `useEffect` + `useState` para fetch.

## Responsabilidades
- **Query keys**: usar `lib/queryKeys.ts` ou prefixos consistentes (`equipe`, `orcamentos`, …).
- Após mutações que afetem listas: `invalidateQueries` com `exact: false` quando a key tiver sufixos (`kanban`, `infinite`).
- Kanban: usar `useOrcamentosKanban` — não carregar lista completa de orçamentos no browser.
- Tratamento de erros: mensagens na UI (`role="alert"`), evitar `window.alert` em fluxos novos.

## Limites (o que NÃO fazer)
- Não introduzir outro gestor de estado global sem consenso (Context existente já cobre auth, org, tema, import, assistant dock).
- Não chamar APIs de terceiros com segredos no bundle de produção (`VITE_*` só para o que pode ser público).

## Checklist rápido
- [ ] Loading / error / empty states.
- [ ] Mobile: rotas principais acessíveis (bottom nav + “Mais”).
- [ ] Testes (`vitest`) para lógica pura em `lib/` e `api/*.test.ts` quando aplicável.
