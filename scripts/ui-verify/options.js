/* Options-page invariants: rows render from the fixture, collapsed rows hide
   their dependent controls (and expand live on toggle), the domain conflict
   warning shows, the setup hint stays hidden while an account is enabled. */
window.__verify.run(async ({ check, waitFor }) => {
  const rows = await waitFor(() => {
    const r = document.querySelectorAll('#accountTableBody tr[data-identity-id]');
    return r.length === 4 ? r : null;
  });
  if (!check('4 account rows render from the fixture', !!rows)) return;

  const hidden = (el) => !el || getComputedStyle(el).display === 'none';
  const byId = {};
  rows.forEach((r) => { byId[r.dataset.identityId] = r; });

  // Enabled row (id1): everything visible, stored state reflected
  const r1 = byId.id1;
  check('enabled row shows the method radios', !hidden(r1.querySelector('.method-options')));
  check('enabled row shows the Suggest Alias checkbox', !hidden(r1.querySelector('.suggest-alias-enabled')));
  check('enabled row has the stored method (plus) selected', r1.querySelector('input[type="radio"][value="plus"]').checked);
  check('enabled row has Suggest Alias checked', r1.querySelector('.suggest-alias-enabled').checked);

  // Disabled row (id2): collapsed — dependent controls hidden
  const r2 = byId.id2;
  check('disabled row carries the reply-disabled class', r2.classList.contains('reply-disabled'));
  check('disabled row hides the method radios', hidden(r2.querySelector('.method-options')));
  check('disabled row hides the Suggest Alias checkbox', hidden(r2.querySelector('.suggest-alias-enabled')));

  // Toggling Reply as Alias expands / collapses the row live
  r2.querySelector('.reply-as-alias-enabled').click();
  await waitFor(() => !r2.classList.contains('reply-disabled'));
  check('checking Reply as Alias expands the row', !r2.classList.contains('reply-disabled'));
  check('expanded row shows the method radios again', !hidden(r2.querySelector('.method-options')));
  const write = __stubState.storageWrites.at(-1);
  check('the toggle was persisted to storage', !!write && write.accountSettings.id2.replyAsAliasEnabled === true);
  r2.querySelector('.reply-as-alias-enabled').click();
  await waitFor(() => r2.classList.contains('reply-disabled'));
  check('unchecking collapses the row again', r2.classList.contains('reply-disabled'));

  // Domain conflict (id3/id4 share corp.example with own-domain method)
  const r3 = byId.id3;
  check('domain-conflict warning is visible', !hidden(r3.querySelector('.domain-conflict-warning')));
  check('conflicted row has Reply as Alias disabled', r3.querySelector('.reply-as-alias-enabled').disabled);

  // Page chrome
  check('setup hint is hidden while an account is enabled', document.getElementById('setupHint').hidden);
  check('version from the manifest is shown', document.getElementById('version').textContent === 'vui-verify');
});
