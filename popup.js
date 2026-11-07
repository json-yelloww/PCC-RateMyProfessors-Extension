'use strict';
const button = document.getElementById('test');
const result = document.getElementById('result');
button.addEventListener('click', () => {
  button.disabled = true;
  result.textContent = 'Checking Rate My Professors…';
  chrome.runtime.sendMessage({ type: 'PCC_RMP_LOOKUP', name: 'Gwendolyn Souza' }, (reply) => {
    button.disabled = false;
    if (chrome.runtime.lastError || !reply || reply.status === 'error') {
      result.textContent = 'Connection unavailable. RMP may be blocking the request or may have changed its API.';
    } else if (reply.status === 'found' && reply.professor) {
      const a = document.createElement('a');
      a.href = reply.professor.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${reply.professor.name}: ${reply.professor.rating == null ? 'no ratings' : reply.professor.rating.toFixed(1) + '/5 (' + reply.professor.count + ' ratings)'}`;
      result.replaceChildren(a);
    } else {
      result.textContent = 'Connected, but the example instructor was not found.';
    }
  });
});
