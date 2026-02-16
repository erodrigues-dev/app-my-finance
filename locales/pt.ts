export const pt = {
  // App
  appName: "Meu Financeiro",

  // Tabs
  home: "Início",
  categories: "Categorias",
  charts: "Gráficos",
  settings: "Configurações",

  // Home
  addIncome: "Adicionar Entrada",
  addExpense: "Adicionar Saída",
  totalIncome: "Entradas",
  totalExpense: "Saídas",
  balance: "Saldo",
  categoriesOverLimit: "Categorias acima do limite",
  transactions: "Transações",
  noTransactions: "Nenhuma transação este mês",

  // Add forms
  addIncomeTitle: "Adicionar Entrada",
  addExpenseTitle: "Adicionar Saída",
  editTransactionTitle: "Editar Transação",
  name: "Nome",
  namePlaceholder: "Ex: Salário",
  amount: "Valor",
  amountPlaceholder: "0,00",
  date: "Data",
  category: "Categoria",
  selectCategory: "Selecione a categoria",
  note: "Observação",
  notePlaceholder: "Opcional",
  save: "Salvar",
  cancel: "Cancelar",

  // Categories
  addCategory: "Adicionar Categoria",
  editCategory: "Editar Categoria",
  categoryName: "Nome da categoria",
  limit: "Limite",
  color: "Cor",
  customColor: "Cor personalizada",
  delete: "Excluir",
  deleteColorTitle: "Excluir cor",
  deleteColorMessage: "Deseja excluir esta cor personalizada?",
  deleteColorInUseTitle: "Cor em uso",
  deleteColorInUseMessage: "As seguintes categorias utilizam esta cor:",
  deleteColorInUseHint: "Elas manterão a cor, mas ela será removida da lista. Deseja continuar?",
  noCategories: "Nenhuma categoria cadastrada",
  createFirstCategory: "Crie uma categoria para começar",

  // Charts
  spendingByCategory: "Gastos por categoria",
  incomeVsExpense: "Entradas vs Saídas",
  categoryPieChart: "Distribuição por categoria",
  pieChartGasto: "Gasto",
  pieChartLivre: "Livre",
  pieChartExcedente: "Excedente",

  // Settings
  theme: "Tema",
  followSystem: "Seguir sistema",
  light: "Claro",
  dark: "Escuro",
  backup: "Fazer backup",
  backupDescription: "Exportar dados em JSON",
  restore: "Restaurar backup",
  restoreDescription: "Importar backup anterior",
  about: "Sobre",
  confirmRestore: "Restaurar backup substituirá todos os dados atuais. Deseja continuar?",
  restoreSuccess: "Backup restaurado com sucesso",
  backupSuccess: "Backup criado com sucesso",

  // Month selector
  monthPickerTitle: "Selecionar mês",
  monthPickerRecent: "Últimos 6 meses",
  january: "Janeiro",
  february: "Fevereiro",
  march: "Março",
  april: "Abril",
  may: "Maio",
  june: "Junho",
  july: "Julho",
  august: "Agosto",
  september: "Setembro",
  october: "Outubro",
  november: "Novembro",
  december: "Dezembro",
} as const;

export type TranslationKey = keyof typeof pt;
