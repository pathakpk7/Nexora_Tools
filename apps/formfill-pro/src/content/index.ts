// FormFill Pro Content Script
// Inspects form inputs on demand and fills approved data with synthetic change/input events
// Compatible with all websites: ERP portals, college portals, Google Forms, job boards, and custom apps

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DETECT_FIELDS') {
    const fields = detectFormFields();
    sendResponse({ fields });
    return false;
  }

  if (message.type === 'APPLY_FILL') {
    const results = applyFieldValues(message.fillPlan);
    sendResponse({ results });
    return false;
  }
});

function extractFieldLabel(el: Element): string {
  // 1. Explicit <label for="id">
  if (el.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl && lbl.textContent?.trim()) return lbl.textContent.trim();
    } catch {}
  }

  // 2. Wrapping <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent?.trim()) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, button').forEach((c) => c.remove());
    if (clone.textContent?.trim()) return clone.textContent.trim();
  }

  // 3. aria-label or placeholder or title
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();

  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) return placeholder.trim();

  const titleAttr = el.getAttribute('title');
  if (titleAttr && titleAttr.trim()) return titleAttr.trim();

  // 4. Preceding sibling element (e.g. <span>Student ID</span><input />)
  let prev = el.previousElementSibling;
  while (prev) {
    const txt = prev.textContent?.trim();
    if (txt && txt.length > 0 && txt.length < 60) {
      return txt.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
    }
    prev = prev.previousElementSibling;
  }

  // 5. Table cell previous sibling (common in ERPs): <td>Student ID No.:</td><td><input /></td>
  const td = el.closest('td');
  if (td && td.previousElementSibling) {
    const pTd = td.previousElementSibling;
    const txt = pTd.textContent?.trim();
    if (txt && txt.length > 0 && txt.length < 60) {
      return txt.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
    }
  }

  // 6. Closest parent form-group or row container
  const container = el.closest('.form-group, .form-row, .input-group, .field, tr, div');
  if (container) {
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, button, script, style').forEach((c) => c.remove());
    const firstLine = clone.textContent?.trim().split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 50) {
      return firstLine.replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
    }
  }

  // 7. Humanized name or id attribute (e.g. txtStudentId -> Student Id)
  const rawIdentifier = el.getAttribute('name') || el.id || '';
  if (rawIdentifier) {
    const humanized = rawIdentifier
      .replace(/^(txt|input|sel|txt_|inp_)/i, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim();
    if (humanized.length > 1) return humanized;
  }

  return '';
}

function detectFormFields() {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]), select, textarea'
    )
  );

  return inputs.slice(0, 80).map((el, index) => {
    const labelText = extractFieldLabel(el);

    // Generate unique selector
    let selector = '';
    if (el.id) {
      selector = `#${CSS.escape(el.id)}`;
    } else if (el.name) {
      selector = `[name="${CSS.escape(el.name)}"]`;
    } else {
      selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }

    return {
      elementSelector: selector,
      name: el.name || '',
      id: el.id || '',
      type: el.tagName.toLowerCase() === 'select' ? 'select' : el.getAttribute('type') || 'text',
      label: labelText,
      placeholder: el.getAttribute('placeholder') || '',
      autocomplete: el.getAttribute('autocomplete') || '',
      currentValue: el.value || '',
      isDisabled: el.disabled || el.readOnly,
    };
  });
}

function applyFieldValues(fillPlan: { selector: string; value: string }[]) {
  let filledCount = 0;

  for (const item of fillPlan) {
    if (!item.value) continue;
    try {
      const el = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        item.selector
      );
      if (!el || el.disabled || el.readOnly) continue;

      if (el instanceof HTMLSelectElement) {
        // Handle dropdown select by text or value match
        const lower = item.value.toLowerCase().trim();
        const matchedOption = Array.from(el.options).find(
          (opt) =>
            opt.value.toLowerCase().trim() === lower ||
            opt.text.toLowerCase().trim() === lower ||
            opt.text.toLowerCase().includes(lower)
        );
        if (matchedOption) {
          el.value = matchedOption.value;
        } else {
          el.value = item.value;
        }
      } else {
        // Handle standard text inputs, textareas, and React/Vue-controlled state
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (nativeSetter && el instanceof HTMLInputElement) {
          nativeSetter.call(el, item.value);
        } else {
          el.value = item.value;
        }
      }

      // Dispatch realistic event cascade so modern single-page apps and ERPs register the change
      el.dispatchEvent(new Event('focus', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));

      // Visual flash feedback
      const originalOutline = el.style.outline;
      el.style.outline = '2px solid #f59e0b';
      setTimeout(() => {
        el.style.outline = originalOutline;
      }, 1400);

      filledCount++;
    } catch (err) {
      console.warn('[FormFill Pro] Failed to fill element:', item.selector, err);
    }
  }

  return { filledCount };
}
