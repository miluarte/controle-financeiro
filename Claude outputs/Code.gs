/**
 * Troco — backend em Google Apps Script (Web App)
 * Script vinculado à planilha Troco-Controle-Financeiro.
 * Cobre só o núcleo financeiro (v1): Accounts, Categories, Transactions, InstallmentGroups, BudgetGoals.
 */

var SHEETS = {
  ACCOUNTS: 'Accounts',
  CATEGORIES: 'Categories',
  TRANSACTIONS: 'Transactions',
  INSTALLMENT_GROUPS: 'InstallmentGroups',
  BUDGET_GOALS: 'BudgetGoals',
};

var HEADERS = {
  Accounts: ['id', 'name', 'type', 'initialBalance', 'currentBalance', 'creditLimit', 'closingDay', 'dueDay', 'color', 'icon', 'archived', 'createdAt'],
  Categories: ['id', 'name', 'type', 'icon', 'color', 'isDefault', 'createdAt'],
  Transactions: ['id', 'type', 'amount', 'description', 'date', 'accountId', 'toAccountId', 'categoryId', 'installmentGroupId', 'installmentNumber', 'installmentTotal', 'notes', 'createdAt', 'updatedAt'],
  InstallmentGroups: ['id', 'description', 'totalAmount', 'installmentCount', 'installmentAmount', 'accountId', 'categoryId', 'startDate', 'status', 'paidCount', 'createdAt'],
  BudgetGoals: ['id', 'categoryId', 'monthlyLimit', 'month', 'isRecurring', 'createdAt'],
};

var DEFAULT_CATEGORIES = [
  { name: 'Alimentação', type: 'expense', icon: 'utensils', color: 'orange', isDefault: true },
  { name: 'Transporte', type: 'expense', icon: 'car', color: 'blue', isDefault: true },
  { name: 'Moradia', type: 'expense', icon: 'home', color: 'green', isDefault: true },
  { name: 'Saúde', type: 'expense', icon: 'heart-pulse', color: 'red', isDefault: true },
  { name: 'Educação', type: 'expense', icon: 'book', color: 'purple', isDefault: true },
  { name: 'Lazer', type: 'expense', icon: 'gamepad-2', color: 'pink', isDefault: true },
  { name: 'Vestuário', type: 'expense', icon: 'shirt', color: 'yellow', isDefault: true },
  { name: 'Outros', type: 'expense', icon: 'ellipsis', color: 'gray', isDefault: true },
  { name: 'Salário', type: 'income', icon: 'briefcase', color: 'green', isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: 'blue', isDefault: true },
  { name: 'Investimentos', type: 'income', icon: 'trending-up', color: 'purple', isDefault: true },
  { name: 'Outros', type: 'income', icon: 'plus-circle', color: 'gray', isDefault: true },
];

// ---------- setup ----------

function setup() {
  ensureAllSheets_();
  seedDefaultCategories_();
}

function ensureAllSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = HEADERS[name];
    var range = sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2000), headers.length);
    range.setNumberFormat('@'); // plain text: evita o Sheets "adivinhar" tipo de data/id e corromper valor
    var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (firstRow.join('') === '') {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function seedDefaultCategories_() {
  var existing = readAll_(SHEETS.CATEGORIES);
  if (existing.length > 0) return;
  DEFAULT_CATEGORIES.forEach(function (c) {
    createCategory_(c);
  });
}

// ---------- HTTP entry points ----------

function doGet(e) {
  try {
    var action = e.parameter.action;
    var data;
    switch (action) {
      case 'getAccounts': data = getAccounts_(); break;
      case 'getCategories': data = getCategories_(); break;
      case 'getTransactions': data = getTransactions_(e.parameter); break;
      case 'getInstallmentGroups': data = getInstallmentGroups_(e.parameter); break;
      case 'getBudgetGoals': data = getBudgetGoals_(e.parameter); break;
      default: return respond_({ success: false, error: 'Ação desconhecida: ' + action });
    }
    return respond_({ success: true, data: data });
  } catch (err) {
    return respond_({ success: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    var action = e.parameter.action;
    var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var data;
    switch (action) {
      case 'createAccount': data = createAccount_(body); break;
      case 'updateAccount': data = updateAccount_(body); break;
      case 'archiveAccount': data = archiveAccount_(body); break;
      case 'createTransaction': data = createTransaction_(body); break;
      case 'updateTransaction': data = updateTransaction_(body); break;
      case 'deleteTransaction': data = deleteTransaction_(body); break;
      case 'createCategory': data = createCategory_(body); break;
      case 'createInstallmentGroup': data = createInstallmentGroup_(body); break;
      case 'payOffInstallments': data = payOffInstallments_(body); break;
      case 'createBudgetGoal': data = createBudgetGoal_(body); break;
      case 'updateBudgetGoal': data = updateBudgetGoal_(body); break;
      case 'deleteBudgetGoal': data = deleteBudgetGoal_(body); break;
      default: return respond_({ success: false, error: 'Ação desconhecida: ' + action });
    }
    return respond_({ success: true, data: data });
  } catch (err) {
    return respond_({ success: false, error: String(err && err.message || err) });
  }
}

function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- helpers genéricos de planilha ----------

function sheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Aba "' + name + '" não existe. Rode a função setup() uma vez.');
  return sheet;
}

function readAll_(sheetName) {
  var headers = HEADERS[sheetName];
  var sheet = sheet_(sheetName);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  return values
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) { return rowToObject_(row, headers); });
}

function rowToObject_(row, headers) {
  var obj = {};
  headers.forEach(function (h, i) {
    obj[h] = row[i] === '' ? null : row[i];
  });
  return obj;
}

function objectToRow_(obj, headers) {
  return headers.map(function (h) {
    var v = obj[h];
    return v === undefined || v === null ? '' : v;
  });
}

function appendObject_(sheetName, obj) {
  var headers = HEADERS[sheetName];
  var sheet = sheet_(sheetName);
  sheet.appendRow(objectToRow_(obj, headers));
}

function findRowIndexById_(sheetName, id) {
  var sheet = sheet_(sheetName);
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2; // linha real (1-indexed, +1 pelo header)
  }
  return -1;
}

function updateObjectById_(sheetName, id, patch) {
  var headers = HEADERS[sheetName];
  var sheet = sheet_(sheetName);
  var rowIndex = findRowIndexById_(sheetName, id);
  if (rowIndex === -1) throw new Error('Registro não encontrado em ' + sheetName + ': ' + id);
  var current = rowToObject_(sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0], headers);
  var updated = Object.assign({}, current, patch);
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([objectToRow_(updated, headers)]);
  return updated;
}

function deleteRowById_(sheetName, id) {
  var sheet = sheet_(sheetName);
  var rowIndex = findRowIndexById_(sheetName, id);
  if (rowIndex === -1) throw new Error('Registro não encontrado em ' + sheetName + ': ' + id);
  sheet.deleteRow(rowIndex);
}

function nowIso_() {
  return new Date().toISOString();
}

// ---------- Accounts ----------

function getAccounts_() {
  return readAll_(SHEETS.ACCOUNTS);
}

function createAccount_(data) {
  var account = {
    id: Utilities.getUuid(),
    name: data.name,
    type: data.type,
    initialBalance: Number(data.initialBalance) || 0,
    currentBalance: Number(data.initialBalance) || 0,
    creditLimit: data.creditLimit != null ? Number(data.creditLimit) : null,
    closingDay: data.closingDay != null ? Number(data.closingDay) : null,
    dueDay: data.dueDay != null ? Number(data.dueDay) : null,
    color: data.color || null,
    icon: data.icon || null,
    archived: false,
    createdAt: nowIso_(),
  };
  appendObject_(SHEETS.ACCOUNTS, account);
  return account;
}

function updateAccount_(data) {
  var patch = Object.assign({}, data);
  delete patch.id;
  return updateObjectById_(SHEETS.ACCOUNTS, data.id, patch);
}

function archiveAccount_(data) {
  return updateObjectById_(SHEETS.ACCOUNTS, data.id, { archived: true });
}

function adjustAccountBalance_(accountId, delta) {
  if (!accountId) return;
  var account = updateObjectById_(
    SHEETS.ACCOUNTS,
    accountId,
    { currentBalance: (findAccount_(accountId).currentBalance || 0) + delta },
  );
  return account;
}

function findAccount_(id) {
  var rowIndex = findRowIndexById_(SHEETS.ACCOUNTS, id);
  if (rowIndex === -1) throw new Error('Conta não encontrada: ' + id);
  var headers = HEADERS.Accounts;
  return rowToObject_(sheet_(SHEETS.ACCOUNTS).getRange(rowIndex, 1, 1, headers.length).getValues()[0], headers);
}

// ---------- Categories ----------

function getCategories_() {
  return readAll_(SHEETS.CATEGORIES);
}

function createCategory_(data) {
  var category = {
    id: Utilities.getUuid(),
    name: data.name,
    type: data.type,
    icon: data.icon || null,
    color: data.color || null,
    isDefault: !!data.isDefault,
    createdAt: nowIso_(),
  };
  appendObject_(SHEETS.CATEGORIES, category);
  return category;
}

// ---------- Transactions ----------
// Regra: só transação lançada manualmente (createTransaction_) mexe no saldo da conta.
// Parcelas futuras geradas por createInstallmentGroup_ NÃO mexem no saldo automaticamente
// (decisão em aberto no projeto — revisar quando definirmos como fatura de cartão deve funcionar).

function getTransactions_(params) {
  var all = readAll_(SHEETS.TRANSACTIONS);
  if (params.month) {
    return all.filter(function (t) { return String(t.date || '').indexOf(params.month) === 0; });
  }
  if (params.accountId) {
    return all.filter(function (t) {
      var inRange = !params.startDate || !params.endDate || (t.date >= params.startDate && t.date <= params.endDate);
      var matchesAccount = t.accountId === params.accountId || t.toAccountId === params.accountId;
      return matchesAccount && inRange;
    });
  }
  return all;
}

function applyTransactionBalanceEffect_(t, sign) {
  var amount = Number(t.amount) || 0;
  if (t.type === 'income') {
    adjustAccountBalance_(t.accountId, sign * amount);
  } else if (t.type === 'expense') {
    adjustAccountBalance_(t.accountId, -sign * amount);
  } else if (t.type === 'transfer') {
    adjustAccountBalance_(t.accountId, -sign * amount);
    adjustAccountBalance_(t.toAccountId, sign * amount);
  }
}

function createTransaction_(data) {
  var transaction = {
    id: Utilities.getUuid(),
    type: data.type,
    amount: Number(data.amount) || 0,
    description: data.description || '',
    date: data.date,
    accountId: data.accountId || null,
    toAccountId: data.toAccountId || null,
    categoryId: data.categoryId || null,
    installmentGroupId: data.installmentGroupId || null,
    installmentNumber: data.installmentNumber != null ? Number(data.installmentNumber) : null,
    installmentTotal: data.installmentTotal != null ? Number(data.installmentTotal) : null,
    notes: data.notes || null,
    createdAt: nowIso_(),
    updatedAt: nowIso_(),
  };
  appendObject_(SHEETS.TRANSACTIONS, transaction);
  applyTransactionBalanceEffect_(transaction, 1);
  return transaction;
}

function updateTransaction_(data) {
  var rowIndex = findRowIndexById_(SHEETS.TRANSACTIONS, data.id);
  if (rowIndex === -1) throw new Error('Transação não encontrada: ' + data.id);
  var headers = HEADERS.Transactions;
  var old = rowToObject_(sheet_(SHEETS.TRANSACTIONS).getRange(rowIndex, 1, 1, headers.length).getValues()[0], headers);
  applyTransactionBalanceEffect_(old, -1); // reverte efeito antigo
  var patch = Object.assign({}, data, { updatedAt: nowIso_() });
  delete patch.id;
  var updated = updateObjectById_(SHEETS.TRANSACTIONS, data.id, patch);
  applyTransactionBalanceEffect_(updated, 1); // aplica efeito novo
  return updated;
}

function deleteTransaction_(data) {
  var rowIndex = findRowIndexById_(SHEETS.TRANSACTIONS, data.id);
  if (rowIndex === -1) throw new Error('Transação não encontrada: ' + data.id);
  var headers = HEADERS.Transactions;
  var old = rowToObject_(sheet_(SHEETS.TRANSACTIONS).getRange(rowIndex, 1, 1, headers.length).getValues()[0], headers);
  applyTransactionBalanceEffect_(old, -1);
  deleteRowById_(SHEETS.TRANSACTIONS, data.id);
  return { id: data.id };
}

// ---------- InstallmentGroups ----------

function getInstallmentGroups_(params) {
  var all = readAll_(SHEETS.INSTALLMENT_GROUPS);
  if (params.accountId) {
    return all.filter(function (g) { return g.accountId === params.accountId; });
  }
  return all;
}

function addMonths_(dateStr, months) {
  var parts = dateStr.split('-').map(Number);
  var d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setMonth(d.getMonth() + months);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function createInstallmentGroup_(data) {
  var group = {
    id: Utilities.getUuid(),
    description: data.description,
    totalAmount: Number(data.totalAmount) || 0,
    installmentCount: Number(data.installmentCount) || 1,
    installmentAmount: Number(data.installmentAmount) || 0,
    accountId: data.accountId,
    categoryId: data.categoryId || null,
    startDate: data.startDate,
    status: 'active',
    paidCount: 0,
    createdAt: nowIso_(),
  };
  appendObject_(SHEETS.INSTALLMENT_GROUPS, group);

  var transactions = [];
  for (var n = 0; n < group.installmentCount; n++) {
    var t = {
      id: Utilities.getUuid(),
      type: 'expense',
      amount: group.installmentAmount,
      description: group.description + ' (' + (n + 1) + '/' + group.installmentCount + ')',
      date: addMonths_(group.startDate, n),
      accountId: group.accountId,
      toAccountId: null,
      categoryId: group.categoryId,
      installmentGroupId: group.id,
      installmentNumber: n + 1,
      installmentTotal: group.installmentCount,
      notes: null,
      createdAt: nowIso_(),
      updatedAt: nowIso_(),
    };
    appendObject_(SHEETS.TRANSACTIONS, t);
    transactions.push(t);
    // Efeito no saldo NÃO é aplicado aqui de propósito — ver nota acima da seção Transactions.
  }

  return { group: group, transactions: transactions };
}

function payOffInstallments_(data) {
  return updateObjectById_(SHEETS.INSTALLMENT_GROUPS, data.groupId, {
    status: 'paid_off',
  });
}

// ---------- BudgetGoals ----------

function getBudgetGoals_(params) {
  var all = readAll_(SHEETS.BUDGET_GOALS);
  if (!params.month) return all;
  return all.filter(function (g) { return g.isRecurring || g.month === params.month; });
}

function createBudgetGoal_(data) {
  var goal = {
    id: Utilities.getUuid(),
    categoryId: data.categoryId,
    monthlyLimit: Number(data.monthlyLimit) || 0,
    month: data.isRecurring ? null : (data.month || null),
    isRecurring: !!data.isRecurring,
    createdAt: nowIso_(),
  };
  appendObject_(SHEETS.BUDGET_GOALS, goal);
  return goal;
}

function updateBudgetGoal_(data) {
  var patch = Object.assign({}, data);
  delete patch.id;
  return updateObjectById_(SHEETS.BUDGET_GOALS, data.id, patch);
}

function deleteBudgetGoal_(data) {
  deleteRowById_(SHEETS.BUDGET_GOALS, data.id);
  return { id: data.id };
}
