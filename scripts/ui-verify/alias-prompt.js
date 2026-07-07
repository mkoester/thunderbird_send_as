/* Alias-prompt invariants: URL params render, the live example updates while
   typing, and the Use-alias button sends the right runtime message. */
window.__verify.run(async ({ check, waitFor }) => {
  check('from address rendered from URL param', document.getElementById('fromEmail').textContent === 'user@example.com');

  const input = document.getElementById('aliasInput');
  input.value = 'shopping';
  input.dispatchEvent(new Event('input'));
  check('example preview shows the plus alias', document.getElementById('exampleAlias').textContent.includes('user+shopping@example.com'));

  document.getElementById('useAliasBtn').click();
  const msg = await waitFor(() => __stubState.sentMessages.at(-1));
  check('Use alias sends aliasPromptResponse', !!msg && msg.type === 'aliasPromptResponse');
  check('response carries useAlias and the alias name', !!msg && msg.useAlias === true && msg.aliasName === 'shopping');
});
