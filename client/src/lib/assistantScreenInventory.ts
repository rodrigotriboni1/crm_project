/**
 * Inventário das áreas do CRM vs contexto enviado ao assistente in-app.
 * Atualizar quando novas rotas ganharem snapshot dedicado.
 */
export const ASSISTANT_SCREEN_INVENTORY = [
  {
    area: 'Dashboard',
    rota: '/',
    variant: 'dashboard' as const,
    snapshot: 'Métricas, fila de follow-up (janela configurável), últimas interações (anotações cortadas).',
  },
  {
    area: 'Relatórios',
    rota: '/relatorios',
    variant: 'reports' as const,
    snapshot: 'Totais do período, séries, top clientes, amostra de orçamentos (até 50 linhas), notas de definição.',
  },
  {
    area: 'Kanban',
    rota: '/kanban',
    variant: 'kanban' as const,
    snapshot: 'Contagens por estado, filtros activos, amostra de cartões visíveis; aviso se carga Kanban truncada.',
  },
  {
    area: 'Clientes (lista)',
    rota: '/clientes',
    variant: 'clientes' as const,
    snapshot: 'KPIs da lista, filtros, amostra de clientes (sem documento completo).',
  },
  {
    area: 'Clientes · Planilha',
    rota: '/clientes/planilha',
    variant: 'clientes' as const,
    snapshot: 'Igual à lista; screen indica modo planilha.',
  },
  {
    area: 'Cliente (detalhe)',
    rota: '/clientes/:id',
    variant: 'cliente_detail' as const,
    snapshot: 'Dados resumidos, documento mascarado, observações cortadas, amostras de orçamentos e interações.',
  },
  {
    area: 'Orçamentos (lista)',
    rota: '/orcamentos',
    variant: 'orcamentos_list' as const,
    snapshot: 'Filtro de estado, busca, contagens e amostra de linhas (sem tax_id do cartão).',
  },
  {
    area: 'Produtos',
    rota: '/produtos',
    variant: 'produtos' as const,
    snapshot: 'Vista, busca, totais e amostra do catálogo.',
  },
  {
    area: 'Equipa, Organização, outras',
    rota: 'várias',
    variant: 'generic' as const,
    snapshot: 'Apenas rota e nome da tela — orientar o utilizador ao Dashboard/Relatórios para números.',
  },
] as const
