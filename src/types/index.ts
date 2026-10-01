export interface Expense {
  id: string;
  particular: string;
  amount: number;
  createdAt: string;
  note?: string;
  photoUri?: string;
}

export interface ExpenseFile {
  id: string;
  name: string;
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

export interface DeletedExpenseFile extends ExpenseFile {
  deletedAt: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
