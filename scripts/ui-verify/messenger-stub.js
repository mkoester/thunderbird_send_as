/* Deterministic messenger/browser stub for the headless UI verification
   (scripts/verify-ui). Injected BEFORE each page's own scripts, so the pages
   run against fixture data instead of the real WebExtension API.

   Fixture accounts:
     id1 user@example.com  — Reply as Alias ON,  plus,       Suggest Alias ON
     id2 me@mydomain.com   — Reply as Alias OFF  (collapsed row)
     id3 sales@corp.example — Reply as Alias ON, own-domain  ┐ same domain →
     id4 team@corp.example  — Reply as Alias ON, own-domain  ┘ domain conflict
*/
(() => {
  'use strict';

  const identityById = {
    id1: { id: 'id1', email: 'user@example.com', name: 'User One' },
    id2: { id: 'id2', email: 'me@mydomain.com', name: 'Me Two' },
    id3: { id: 'id3', email: 'sales@corp.example', name: 'Corp A' },
    id4: { id: 'id4', email: 'team@corp.example', name: 'Corp B' }
  };

  const accountSettings = {
    id1: { replyAsAliasEnabled: true, aliasMethod: 'plus', suggestAliasEnabled: true, suggestAliasDontAskList: [] },
    id2: { replyAsAliasEnabled: false, aliasMethod: 'plus', suggestAliasEnabled: false, suggestAliasDontAskList: [] },
    id3: { replyAsAliasEnabled: true, aliasMethod: 'own-domain', suggestAliasEnabled: false, suggestAliasDontAskList: [] },
    id4: { replyAsAliasEnabled: true, aliasMethod: 'own-domain', suggestAliasEnabled: false, suggestAliasDontAskList: [] }
  };

  // Drivers assert against this: storage writes and runtime messages land here
  const state = { storageWrites: [], sentMessages: [] };
  globalThis.__stubState = state;

  globalThis.messenger = {
    storage: {
      local: {
        get: async () => ({ accountSettings }),
        set: async (obj) => { state.storageWrites.push(obj); }
      }
    },
    runtime: { getManifest: () => ({ version: 'ui-verify' }) },
    accounts: { list: async () => [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }] },
    identities: {
      getDefault: async (accountId) => identityById['id' + accountId.slice(1)]
    }
  };

  // The prompt popups use the `browser` namespace and close themselves after
  // sending — record the message and neuter close() so the page (and the
  // verify result) survives until --dump-dom
  globalThis.browser = {
    runtime: {
      sendMessage: async (message) => { state.sentMessages.push(message); }
    }
  };
  window.close = () => {};
})();
