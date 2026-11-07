/* Automatically append RMP ratings to PCC class listings.
 * Handles ordinary tables, accessible grids and label/value class cards.
 * The page changes dynamically, so we rescan after results change.
 */
(() => {
  'use strict';
  const PREFIX = 'pcc-rmp-';
  const LABEL_RE = /^(?:instructor(?:s|\(s\))?|faculty|professor(?:s|\(s\))?|instructor name)\s*:?$/i;
  const INLINE_RE = /^\s*(?:instructor(?:s|\(s\))?|faculty|professor(?:s|\(s\))?|instructor name)\s*[:\-–]\s*(.+)$/i;
  const SKIP_RE = /^(?:tba|tbd|staff|staff assigned|to be announced|not assigned|arranged|unknown|none|n\/a|instructor|faculty|professor|search|all|online|view|more|details|not available)$/i;
  const anchorsByParent = new WeakMap();
  const requested = new Map();
  let scanTimer = null;

  const rmpSearch = (name) => `https://www.ratemyprofessors.com/search/professors/2649?q=${encodeURIComponent(name)}`;

  function cleanText(element) {
    if (!element) return '';
    const clone = element.cloneNode(true);
    clone.querySelectorAll?.('.pcc-rmp-badge,script,style,svg,button,input,select').forEach((node) => node.remove());
    clone.querySelectorAll?.('br').forEach((node) => node.replaceWith(document.createTextNode('\n')));
    // Preserve breaks when multiple co-instructors are listed on separate lines.
    return (clone.innerText || clone.textContent || '').replace(/[ \t]+/g, ' ').trim();
  }

  function tidyName(value) {
    let s = String(value || '').trim()
      .replace(/^(?:instructor(?:s|\(s\))?|faculty|professor(?:s|\(s\))?|instructor name)\s*[:\-–]\s*/i, '')
      .replace(/\s*\((?:primary|instructor|staff)\)\s*$/i, '')
      .replace(/^(?:dr\.?|prof(?:essor)?\.?)\s+/i, '')
      .replace(/\s+(?:view profile|email instructor|email|details|contact)$/i, '')
      .replace(/\s+/g, ' ').trim();
    // PCC might show "Last, First" while RMP displays "First Last".
    if (/^[\p{L}.'\- ]+,\s*[\p{L}.'\- ]+$/u.test(s)) {
      const pieces = s.split(',');
      s = `${pieces[1].trim()} ${pieces[0].trim()}`;
    }
    if (s.length < 5 || s.length > 90 || SKIP_RE.test(s)) return null;
    if (/\d|@|:|\b(?:office|room|crn|section|schedule|semester|location|hours|class|courses|instructors)\b/i.test(s)) return null;
    if (!/^[\p{L}.'’\- ]+$/u.test(s)) return null;
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 6 || parts.some((x) => x.length > 30)) return null;
    return s;
  }

  function namesFromText(raw) {
    if (!raw || raw.length > 250) return [];
    // Split known multi-instructor separators; don't split commas (Last, First).
    const parts = raw.split(/\s*(?:;|\n|\s+&\s+|\s+and\s+|\s+\/\s+)\s*/i);
    const names = parts.map(tidyName).filter(Boolean);
    return [...new Set(names)];
  }

  function getResponse(name) {
    if (!requested.has(name)) {
      const promise = new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'PCC_RMP_LOOKUP', name }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ status: 'error', error: chrome.runtime.lastError.message });
            } else {
              resolve(response || { status: 'error', error: 'No response from extension' });
            }
          });
        } catch (err) {
          resolve({ status: 'error', error: String(err) });
        }
      });
      requested.set(name, promise);
    }
    return requested.get(name);
  }

  // The search form's Instructor dropdown is not a class result. Ignore names
  // inside that filter so opening/selecting it never creates RMP badges.
  function isInstructorSearchFilter(target) {
    const namedControl = 'input[placeholder*="instructor" i],input[aria-label*="instructor" i],select[aria-label*="instructor" i],[role="combobox"][aria-label*="instructor" i]';
    // Exclude dropdowns and forms, but not an entire results area near the form.
    if (target.closest('form,[role="combobox"],[role="listbox"],[role="option"],[aria-haspopup="listbox"]')) return true;
    let area = target;
    // Look only at the field and its immediate wrapper. Scanning higher up can
    // wrongly exclude class cards because they share a page with the filter.
    for (let depth = 0; area && depth < 2; depth++, area = area.parentElement) {
      if (area.matches('main,body,html,article,[role="main"]')) break;
      if (area.querySelector(namedControl)) return true;
      if (!area.querySelector('select,[role="combobox"],[aria-haspopup="listbox"]')) continue;
      const labels = area.querySelectorAll('label,span,div');
      if ([...labels].some((label) => !label.children.length && LABEL_RE.test(label.textContent.trim()))) {
        return true;
      }
    }
    return false;
  }

  // "Staff" is PCC's placeholder when no instructor has been listed yet.
  // It is not a person's name and should never trigger an RMP lookup.
  function isUnassignedInstructor(raw) {
    return /^staff$/i.test(String(raw || '').replace(/\s+/g, ' ').trim());
  }

  function addStaffBadge(target) {
    if (!target?.isConnected || target.closest(`.${PREFIX}badge`) ||
        target.matches('input,select,textarea,button,option') ||
        isInstructorSearchFilter(target)) return;

    // Replace the *displayed Staff placeholder* rather than appending a second
    // line beneath it. This preserves PCC's existing Instructor label/layout.
    // This method only runs after the class-result instructor value is confirmed
    // to be exactly "Staff"; it never changes the search-filter dropdown.
    if (target.querySelector(`.${PREFIX}badge[data-state="unassigned"]`)) return;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    let staffTextNode = null;
    let match = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest(`.${PREFIX}badge,script,style,option,button`)) continue;
      // Supports both <span>Staff</span> and a single "Instructor: Staff" text node.
      const candidate = node.nodeValue.match(/^(\s*(?:(?:instructor(?:s|\(s\))?|faculty|professor(?:s|\(s\))?|instructor name)\s*[:\-–]\s*)?)staff(\s*)$/i);
      if (candidate) {
        staffTextNode = node;
        match = candidate;
        break;
      }
    }
    if (!staffTextNode) return;

    const badge = document.createElement('span');
    badge.className = `${PREFIX}badge`;
    badge.dataset.state = 'unassigned';
    badge.textContent = 'No instructor assigned yet';
    badge.title = 'PCC has not announced an instructor for this class yet.';
    badge.setAttribute('aria-label', badge.title);

    const parent = staffTextNode.parentElement;
    // If PCC wraps "Staff" in a link, replace the link entirely rather than
    // turning our informational badge into an unintended clickable link.
    if (parent?.tagName === 'A' && parent.textContent.trim().toLowerCase() === 'staff') {
      parent.replaceWith(badge);
    } else {
      const fragment = document.createDocumentFragment();
      if (match[1]) fragment.appendChild(document.createTextNode(match[1]));
      fragment.appendChild(badge);
      if (match[2]) fragment.appendChild(document.createTextNode(match[2]));
      staffTextNode.replaceWith(fragment);
    }
  }

  // Use the same detection paths for professor ratings and the Staff notice.
  function addInstructorBadge(target, raw) {
    if (isUnassignedInstructor(raw)) {
      addStaffBadge(target);
      return true;
    }
    const names = namesFromText(raw);
    names.forEach((name) => addRating(target, name));
    return names.length > 0;
  }

  function addRating(target, name) {
    if (!target?.isConnected || target.closest(`.${PREFIX}badge`) ||
        target.matches('input,select,textarea,button,option') ||
        isInstructorSearchFilter(target)) return;
    // Each name/target pair gets one badge even when the page re-renders.
    let existing = anchorsByParent.get(target);
    if (!existing) { existing = new Map(); anchorsByParent.set(target, existing); }
    const existingBadge = existing.get(name);
    if (existingBadge?.isConnected && target.contains(existingBadge)) return;

    const badge = document.createElement('a');
    badge.className = `${PREFIX}badge`;
    badge.dataset.state = 'pending';
    badge.href = rmpSearch(name);
    badge.target = '_blank';
    badge.rel = 'noopener noreferrer';
    badge.textContent = 'RMP …';
    badge.title = `Looking up ${name} at Pasadena City College`;
    // Do not modify/rewrite the instructor's actual text.
    target.appendChild(badge);
    existing.set(name, badge);

    getResponse(name).then((result) => {
      if (!badge.isConnected) return;
      if (result.status === 'found' && result.professor) {
        const p = result.professor;
        if (p.rating != null) {
          badge.textContent = `★ ${Number(p.rating).toFixed(1)}/5 (${p.count})`;
          badge.dataset.state = p.rating >= 4 ? 'good' : p.rating >= 3 ? 'mid' : 'low';
        } else {
          badge.textContent = 'No ratings yet';
          badge.dataset.state = 'pending';
        }
        badge.href = p.url;
        const extra = [
          `${p.name} — ${p.count} student ratings`,
          p.difficulty != null ? `Difficulty: ${Number(p.difficulty).toFixed(1)}/5` : '',
          p.wouldTakeAgain != null ? `Would take again: ${Math.round(p.wouldTakeAgain)}%` : '',
          'Click to see reviews on Rate My Professors'
        ].filter(Boolean);
        badge.title = extra.join(' | ');
      } else if (result.status === 'missing') {
        badge.textContent = 'No ratings found';
        badge.dataset.state = 'pending';
        badge.title = `No verified PCC match for ${name}. Click to search manually.`;
      } else {
        badge.textContent = 'RMP unavailable';
        badge.dataset.state = 'error';
        badge.title = `Could not load RMP (${result.error || 'connection error'}). Click to open RMP.`;
      }
    });
  }

  function scanTables() {
    document.querySelectorAll('table').forEach((table) => {
      // Use the last header row, if the table contains one.
      const header = table.querySelector('thead tr:last-child') || table.querySelector('tr');
      if (!header) return;
      const headers = [...header.querySelectorAll('th,td')];
      const indices = headers.map((h, i) => LABEL_RE.test(cleanText(h)) ? i : -1).filter((i) => i >= 0);
      if (!indices.length) return;
      table.querySelectorAll('tbody tr').forEach((row) => {
        // Only direct cells: ignore nested course tables.
        const cells = [...row.children].filter((c) => c.matches('td,th'));
        indices.forEach((i) => {
          const cell = cells[i];
          if (!cell) return;
          addInstructorBadge(cell, cleanText(cell));
        });
      });
    });
  }

  function scanAriaGrids() {
    document.querySelectorAll('[role="grid"],[role="table"]').forEach((grid) => {
      const header = grid.querySelector('[role="row"]:has([role="columnheader"])');
      if (!header) return;
      const headers = [...header.querySelectorAll('[role="columnheader"]')];
      const indices = headers.map((h, i) => LABEL_RE.test(cleanText(h)) ? i : -1).filter((i) => i >= 0);
      if (!indices.length) return;
      grid.querySelectorAll('[role="row"]').forEach((row) => {
        if (row === header) return;
        const cells = [...row.querySelectorAll(':scope > [role="cell"],:scope > [role="gridcell"]')];
        indices.forEach((i) => {
          if (cells[i]) addInstructorBadge(cells[i], cleanText(cells[i]));
        });
      });
    });
  }

  function scanLabeledFields() {
    // Text nodes also catch app-generated structures with no stable CSS classes.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(`.${PREFIX}badge,script,style,textarea,option,button,nav,header,footer`)) {
          return NodeFilter.FILTER_REJECT;
        }
        const text = node.textContent.trim();
        return text.length && text.length < 160 && (LABEL_RE.test(text) || INLINE_RE.test(text))
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    let visited = 0;
    while ((node = walker.nextNode()) && visited++ < 350) {
      const text = node.textContent.trim();
      const inlineMatch = text.match(INLINE_RE);
      if (inlineMatch) {
        addInstructorBadge(node.parentElement, inlineMatch[1]);
        continue;
      }
      const label = node.parentElement;
      if (!label || !LABEL_RE.test(text)) continue;
      // The site may split "Instructor: Staff" into a text node and a <strong>.
      // Read their shared container without changing the displayed label.
      const combined = cleanText(label);
      if (INLINE_RE.test(combined) && addInstructorBadge(label, combined.replace(INLINE_RE, '$1'))) continue;
      const field = label.closest('dt,th,label') || label;
      const sibling = field.nextElementSibling;
      // Common patterns: <dt>Instructor</dt><dd>Jane Smith</dd>,
      // <span>Instructor</span><span>Jane Smith</span>.
      if (sibling) {
        if (addInstructorBadge(sibling, cleanText(sibling))) continue;
      }
      const parent = field.parentElement;
      if (!parent) continue;
      // Common card: <div><b>Instructor</b><div>Jane Smith</div></div>
      for (const child of parent.children) {
        if (child === field || child.contains(field)) continue;
        if (addInstructorBadge(child, cleanText(child))) break;
      }
    }
  }

  function scanNamedFields() {
    // Backup for elements exposing field names via attributes rather than text labels.
    const selector = '[data-label],[data-title],[aria-label],[class*="instructor" i],[class*="faculty" i],[id*="instructor" i]';
    document.querySelectorAll(selector).forEach((element) => {
      if (element.closest('form,nav,header,footer') || element.matches('input,select,textarea,button')) return;
      const labeled = [element.getAttribute('data-label'), element.getAttribute('data-title'),
        element.getAttribute('aria-label'), element.id, element.className].filter((v) => typeof v === 'string');
      if (!labeled.some((v) => /(?:instructor|faculty)/i.test(v))) return;
      const txt = cleanText(element);
      addInstructorBadge(element, INLINE_RE.test(txt) ? txt.replace(INLINE_RE, '$1') : txt);
    });
  }

  function scan() {
    scanTimer = null;
    if (!document.body) return;
    scanTables();
    scanAriaGrids();
    scanLabeledFields();
    scanNamedFields();
  }

  function scheduleScan() {
    if (scanTimer !== null) return;
    scanTimer = setTimeout(scan, 350);
  }

  // PCC is a SPA; moving between searches need not reload the webpage.
  const observer = new MutationObserver((changes) => {
    if (changes.every((change) => change.type === 'childList' &&
      [...change.addedNodes].every((node) => node.nodeType === 1 && node.classList.contains(`${PREFIX}badge`)) &&
      change.removedNodes.length === 0)) return;
    scheduleScan();
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scan();
  window.addEventListener('popstate', scheduleScan);
  window.addEventListener('hashchange', scheduleScan);
})();
