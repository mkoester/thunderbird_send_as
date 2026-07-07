/* Identity-prompt invariants: URL params render into both name options, and
   the response message echoes everything the stateless background handler
   needs (aliasEmail/baseEmail/identityName/composeTabId). */
window.__verify.run(async ({ check, waitFor }) => {
  check('alias email rendered from URL param', document.getElementById('aliasEmail').textContent === 'user+shopping@example.com');
  check('option 1 prefilled with the base name', document.getElementById('nameOnlyInput').value === 'User One');
  check('option 2 prefilled with name plus alias', document.getElementById('nameWithAliasInput').value === 'User One (shopping)');

  document.getElementById('useNameWithAliasBtn').click();
  const msg = await waitFor(() => __stubState.sentMessages.at(-1));
  check('button sends identityPromptResponse', !!msg && msg.type === 'identityPromptResponse' && msg.create === true);
  check('response echoes name, alias, base and compose tab', !!msg &&
    msg.identityName === 'User One (shopping)' &&
    msg.aliasEmail === 'user+shopping@example.com' &&
    msg.baseEmail === 'user@example.com' &&
    msg.composeTabId === 7);
});
