# EmbalaFlow — Cursor Rules

Copie a pasta `.cursor/` para a raiz do seu projeto.

```
embalaflow-crm/          ← raiz do seu projeto
└── .cursor/
    └── rules/
        ├── global.mdc          ← sempre ativo (contexto do projeto)
        ├── design-kanban.mdc   ← ativa em src/components/kanban/** e tailwind.config.ts
        ├── code-gen.mdc        ← ativa em src/hooks/**, src/services/**, src/types/**
        ├── compliance.mdc      ← ativa em src/**/*.tsx e src/**/*.css
        └── spec-writer.mdc     ← ativa em docs/** e arquivos .md
```

## Como funciona

O Cursor injeta automaticamente a rule certa com base no arquivo aberto:

| Você abre...                        | Agente ativado       |
|-------------------------------------|----------------------|
| `KanbanCard.tsx`                    | Design Kanban        |
| `tailwind.config.ts`                | Design Kanban        |
| `useKanbanDrag.ts`                  | Code Gen             |
| `opportunityService.ts`             | Code Gen             |
| `src/types/opportunity.ts`          | Code Gen             |
| Qualquer `.tsx`                     | Compliance           |
| `docs/adr-001.md`                   | Spec Writer          |
| Qualquer arquivo                    | Global (sempre)      |

## Como usar no chat do Cursor

Após copiar a pasta, abra o arquivo desejado e use `Cmd+L` (chat) ou `Cmd+K` (inline).
O agente certo já estará ativo com todo o contexto do EmbalaFlow.

### Exemplos de prompts por agente

**Design Kanban** (abrir `KanbanCard.tsx`):
```
Gere o componente KanbanCard completo seguindo o design system
```

**Code Gen** (abrir `useKanbanDrag.ts`):
```
Implemente o hook com @hello-pangea/dnd e optimistic update no Supabase
```

**Compliance** (abrir qualquer `.tsx`):
```
Revise este componente e me dê o score de compliance
```

**Spec Writer** (abrir `docs/`):
```
Gere o ADR para a decisão de usar o estilo Pipefy no kanban
```

## Forçar um agente manualmente

Se quiser usar um agente específico num arquivo que não está no glob dele,
mencione no chat: `@design-kanban` ou cole o conteúdo do `.mdc` como contexto.
