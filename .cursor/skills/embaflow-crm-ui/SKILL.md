---
name: embaflow-crm-ui
description: Regras de UI do CRM EmbalaFlow (client React). Use ao criar ou alterar páginas, layout, PageHeader, SectionCard ou textos de ecrã no projeto crm_project / EmbalaFlow.
---

# EmbalaFlow CRM — UI

## Títulos de ecrã

**Não** colocar títulos/subtítulos «de marketing» que repetem a navegação lateral.

- Evitar `PageHeader` com título = nome da rota (Dashboard, Clientes, Kanban, Orçamentos, Produtos, Relatórios, Equipa) e descrição genérica.
- Preferir: conteúdo directo (KPIs, `ToolbarRow`, filtros, tabelas) ou `SectionCard` com título de **secção** (agrupamento real).
- Explicações úteis: descrição dentro de `SectionCard`, não slogan sob o nome da app.

## Quando `PageHeader` faz sentido

- Título é **identidade do registo** (ex. nome do cliente no detalhe), não etiqueta de menu.
- Caso raro em que a página não tem equivalente claro na nav e o título acrescenta contexto inevitável.

## Componentes

- Acções primárias: `ToolbarRow` / botões na barra de ferramentas, não escondidas atrás de um cabeçalho decorativo.
- Manter consistência com `PageContainer`, tokens em `client/src/index.css`, e padrões em `client/src/components/library/`.

Regra persistente do projeto: `.cursor/rules/embaflow-crm-ui.mdc`.
