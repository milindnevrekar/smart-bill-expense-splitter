(function () {
  'use strict';

  const CURRENCY = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const state = { people: [], items: [], nextId: 1 };
  const elements = {
    personForm: document.getElementById('person-form'),
    personName: document.getElementById('person-name'),
    peopleList: document.getElementById('people-list'),
    peopleCount: document.getElementById('people-count'),
    expenseForm: document.getElementById('expense-form'),
    expenseName: document.getElementById('expense-name'),
    expenseAmount: document.getElementById('expense-amount'),
    assignmentOptions: document.getElementById('assignment-options'),
    expenseList: document.getElementById('expense-list'),
    itemsCount: document.getElementById('items-count'),
    taxRate: document.getElementById('tax-rate'),
    tipRate: document.getElementById('tip-rate'),
    subtotalValue: document.getElementById('subtotal-value'),
    taxValue: document.getElementById('tax-value'),
    tipValue: document.getElementById('tip-value'),
    grandTotal: document.getElementById('grand-total'),
    shareList: document.getElementById('share-list'),
    shareCount: document.getElementById('share-count'),
    warning: document.getElementById('unassigned-warning'),
    copyButton: document.getElementById('copy-summary'),
    csvButton: document.getElementById('download-csv'),
    sampleButton: document.getElementById('sample-button'),
    announcement: document.getElementById('announcement')
  };

  let latestCalculation = BillCalculator.calculateBill([], [], 0, 0);

  function money(cents) {
    return CURRENCY.format((Number(cents) || 0) / 100);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function announce(message) {
    elements.announcement.textContent = message;
  }

  function getSelectedAssignmentIds() {
    return [...elements.assignmentOptions.querySelectorAll('input[name="assignedPeople"]:checked')]
      .map((input) => input.value);
  }

  function renderPeople(selectedIds = getSelectedAssignmentIds()) {
    elements.peopleCount.textContent = `${state.people.length} ${state.people.length === 1 ? 'person' : 'people'}`;

    if (state.people.length === 0) {
      elements.peopleList.className = 'people-list empty-list';
      elements.peopleList.innerHTML = '<p class="empty-hint">Your group will appear here.</p>';
    } else {
      elements.peopleList.className = 'people-list';
      elements.peopleList.innerHTML = state.people.map((person) => `
        <span class="person-chip">
          <span class="person-chip-name">${escapeHtml(person.name)}</span>
          <button class="remove-person" type="button" data-remove-person="${escapeHtml(person.id)}" aria-label="Remove ${escapeHtml(person.name)}">×</button>
        </span>
      `).join('');
    }

    renderAssignmentOptions(selectedIds);
    renderExpenses();
    renderSummary();
  }

  function renderAssignmentOptions(selectedIds = []) {
    if (state.people.length === 0) {
      elements.assignmentOptions.innerHTML = '<p class="empty-hint">Add people to choose who shared an item.</p>';
      return;
    }

    elements.assignmentOptions.innerHTML = state.people.map((person) => `
      <label class="assignment-option">
        <input type="checkbox" name="assignedPeople" value="${escapeHtml(person.id)}" ${selectedIds.includes(person.id) ? 'checked' : ''}>
        <span>${escapeHtml(person.name)}</span>
      </label>
    `).join('');
  }

  function renderExpenses() {
    elements.itemsCount.textContent = `${state.items.length} ${state.items.length === 1 ? 'item' : 'items'}`;

    if (state.items.length === 0) {
      elements.expenseList.className = 'expense-list empty-list';
      elements.expenseList.innerHTML = '<p class="empty-hint">No expenses yet. Add your first item above.</p>';
      return;
    }

    elements.expenseList.className = 'expense-list';
    elements.expenseList.innerHTML = state.items.map((item) => {
      const assignedPeople = state.people.filter((person) => item.personIds.includes(person.id));
      const hasAssignees = assignedPeople.length > 0;
      const peopleLabel = hasAssignees
        ? `Split between ${assignedPeople.map((person) => escapeHtml(person.name)).join(', ')}`
        : 'Needs at least one person assigned';

      return `
        <article class="expense-item">
          <div class="expense-item-main">
            <p class="expense-item-name">${escapeHtml(item.name)}</p>
            <p class="expense-item-meta ${hasAssignees ? '' : 'unassigned'}">${peopleLabel}</p>
          </div>
          <div class="expense-item-actions">
            <span class="expense-item-amount">${money(item.amountCents)}</span>
            <button class="remove-expense" type="button" data-remove-expense="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">×</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderSummary() {
    latestCalculation = BillCalculator.calculateBill(
      state.people,
      state.items,
      elements.taxRate.value,
      elements.tipRate.value
    );

    elements.subtotalValue.textContent = money(latestCalculation.subtotalCents);
    elements.taxValue.textContent = money(latestCalculation.taxCents);
    elements.tipValue.textContent = money(latestCalculation.tipCents);
    elements.grandTotal.textContent = money(latestCalculation.totalCents);
    elements.shareCount.textContent = `${state.people.length} ${state.people.length === 1 ? 'person' : 'people'}`;

    if (latestCalculation.unassignedItems.length > 0) {
      const count = latestCalculation.unassignedItems.length;
      elements.warning.hidden = false;
      elements.warning.textContent = `${count} ${count === 1 ? 'item is' : 'items are'} not included in the total because no current group member is assigned. Remove ${count === 1 ? 'it' : 'them'} and add ${count === 1 ? 'it' : 'them'} again with a valid assignment.`;
    } else {
      elements.warning.hidden = true;
      elements.warning.textContent = '';
    }

    if (state.people.length === 0) {
      elements.shareList.innerHTML = `
        <div class="summary-empty">
          <span class="summary-empty-icon" aria-hidden="true">↗</span>
          <p>Your split will show up here once you add people and expenses.</p>
        </div>
      `;
    } else {
      elements.shareList.innerHTML = latestCalculation.people.map((person) => `
        <div class="share-row">
          <span class="share-person">${escapeHtml(person.name)}</span>
          <strong class="share-total">${money(person.totalCents)}</strong>
          <span class="share-detail">Items ${money(person.subtotalCents)} · Tax ${money(person.taxCents)} · Tip ${money(person.tipCents)}</span>
        </div>
      `).join('');
    }

    const hasBillData = state.people.length > 0 && state.items.length > 0;
    elements.copyButton.disabled = !hasBillData;
    elements.csvButton.disabled = !hasBillData;
  }

  elements.personForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = elements.personName.value.trim();
    if (!name) return;

    const duplicate = state.people.some((person) => person.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      announce(`${name} is already in the group.`);
      elements.personName.setCustomValidity('This person is already in the group.');
      elements.personName.reportValidity();
      elements.personName.setCustomValidity('');
      return;
    }

    const selectedIds = getSelectedAssignmentIds();
    state.people.push({ id: `person-${state.nextId++}`, name });
    elements.personName.value = '';
    renderPeople(selectedIds);
    elements.personName.focus();
    announce(`${name} added to the group.`);
  });

  elements.peopleList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-person]');
    if (!button) return;

    const person = state.people.find((entry) => entry.id === button.dataset.removePerson);
    state.people = state.people.filter((entry) => entry.id !== button.dataset.removePerson);
    state.items.forEach((item) => {
      item.personIds = item.personIds.filter((id) => id !== button.dataset.removePerson);
    });
    renderPeople();
    announce(person ? `${person.name} removed. Review any items that no longer have an assigned person.` : 'Person removed.');
  });

  elements.expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = elements.expenseName.value.trim();
    const amountCents = BillCalculator.parseRupeesToPaise(elements.expenseAmount.value);
    const personIds = getSelectedAssignmentIds();

    if (!name) return;
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      elements.expenseAmount.setCustomValidity('Enter an amount greater than zero.');
      elements.expenseAmount.reportValidity();
      elements.expenseAmount.setCustomValidity('');
      return;
    }
    if (personIds.length === 0) {
      announce('Select at least one person to split this expense.');
      elements.assignmentOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    state.items.push({
      id: `item-${state.nextId++}`,
      name,
      amountCents,
      personIds
    });
    elements.expenseName.value = '';
    elements.expenseAmount.value = '';
    renderExpenses();
    renderSummary();
    elements.expenseName.focus();
    announce(`${name} added to the bill.`);
  });

  elements.expenseList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-expense]');
    if (!button) return;
    const item = state.items.find((entry) => entry.id === button.dataset.removeExpense);
    state.items = state.items.filter((entry) => entry.id !== button.dataset.removeExpense);
    renderExpenses();
    renderSummary();
    announce(item ? `${item.name} removed from the bill.` : 'Expense removed.');
  });

  [elements.taxRate, elements.tipRate].forEach((input) => {
    input.addEventListener('input', () => {
      const value = Number(input.value);
      if (input.value !== '' && (!Number.isFinite(value) || value < 0 || value > 100)) {
        input.setCustomValidity('Enter a percentage from 0 to 100.');
      } else {
        input.setCustomValidity('');
      }
      renderSummary();
    });
  });

  elements.copyButton.addEventListener('click', async () => {
    const text = buildTextSummary();
    try {
      await copyText(text);
      announce('Bill breakdown copied to clipboard.');
      elements.copyButton.innerHTML = '<span aria-hidden="true">✓</span> Copied';
      window.setTimeout(() => {
        elements.copyButton.innerHTML = '<span aria-hidden="true">▣</span> Copy breakdown';
      }, 1600);
    } catch (error) {
      announce('Could not copy automatically. Please use the CSV download instead.');
    }
  });

  elements.csvButton.addEventListener('click', () => {
    const rows = [
      ['Person', 'Items share (INR)', 'Tax / GST (INR)', 'Tip (INR)', 'Final share (INR)'],
      ...latestCalculation.people.map((person) => [
        person.name,
        (person.subtotalCents / 100).toFixed(2),
        (person.taxCents / 100).toFixed(2),
        (person.tipCents / 100).toFixed(2),
        (person.totalCents / 100).toFixed(2)
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'splitmate-bill-breakdown.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    announce('CSV bill breakdown downloaded.');
  });

  elements.sampleButton.addEventListener('click', () => {
    if ((state.people.length > 0 || state.items.length > 0) && !window.confirm('Load the sample bill? This will replace your current group and expenses.')) {
      return;
    }
    const aarav = { id: `person-${state.nextId++}`, name: 'Aarav' };
    const diya = { id: `person-${state.nextId++}`, name: 'Diya' };
    const kabir = { id: `person-${state.nextId++}`, name: 'Kabir' };
    state.people = [aarav, diya, kabir];
    state.items = [
      { id: `item-${state.nextId++}`, name: 'Paneer tikka', amountCents: 42000, personIds: [aarav.id, diya.id] },
      { id: `item-${state.nextId++}`, name: 'Butter naan', amountCents: 18000, personIds: [aarav.id, diya.id, kabir.id] },
      { id: `item-${state.nextId++}`, name: 'Cold drinks', amountCents: 15000, personIds: [aarav.id, kabir.id] }
    ];
    elements.taxRate.value = '5';
    elements.tipRate.value = '10';
    renderPeople([]);
    announce('Sample bill loaded with three people and three items.');
  });

  function buildTextSummary() {
    const lines = [
      'SPLITMATE — BILL BREAKDOWN',
      '--------------------------',
      ...latestCalculation.people.map((person) => (
        `${person.name}: ${money(person.totalCents)} (Items ${money(person.subtotalCents)}, Tax ${money(person.taxCents)}, Tip ${money(person.tipCents)})`
      )),
      '--------------------------',
      `Items subtotal: ${money(latestCalculation.subtotalCents)}`,
      `Tax / GST: ${money(latestCalculation.taxCents)}`,
      `Tip: ${money(latestCalculation.tipCents)}`,
      `TOTAL: ${money(latestCalculation.totalCents)}`
    ];
    if (latestCalculation.unassignedItems.length > 0) {
      lines.push('', `Not included (unassigned): ${latestCalculation.unassignedItems.map((item) => `${item.name} ${money(item.amountCents)}`).join('; ')}`);
    }
    return lines.join('\n');
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const temporary = document.createElement('textarea');
    temporary.value = value;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.appendChild(temporary);
    temporary.select();
    const successful = document.execCommand('copy');
    temporary.remove();
    if (!successful) throw new Error('Clipboard copy was unavailable.');
  }

  function csvCell(value) {
    let text = String(value ?? '');
    // Prevent spreadsheet formula execution when a user-controlled name starts with
    // a formula marker (possibly after whitespace).
    if (/^\\s*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  renderPeople([]);
})();
