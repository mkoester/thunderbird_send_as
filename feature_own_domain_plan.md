# Task Plan: Support Alternative Alias Methods (Own Domain / Catchall)

## Goal
Add support for alias management beyond the plus-addressing pattern (user+alias@domain.com), including:
- **Own domain aliases**: alias@yourdomain.com where you own the domain
- **Catchall patterns**: anything@yourdomain.com where all emails to the domain go to your mailbox

## Phases
- [x] Phase 1: Requirements gathering and research
  - ✅ Understand user's specific use cases
  - ✅ Document how own-domain and catchall differ from plus-addressing
  - ✅ Review current implementation to identify what needs to change
  - ✅ Define scope and edge cases
- [x] Phase 2: Design the solution
  - ✅ Design configuration UI for multiple alias methods
  - ✅ Plan alias detection/matching algorithm changes
  - ✅ Design data structures for storing method preferences
  - ✅ Create technical specification
- [ ] Phase 3: Implementation
  - Update alias detection logic to support new patterns
  - Modify configuration UI to support method selection
  - Update all three features to work with new methods
  - Implement settings storage for method preferences
- [ ] Phase 4: Testing and documentation
  - Test all three features with each alias method
  - Update README with new methods
  - Build and verify XPI
  - Document migration path for existing users

## Key Questions

### To Answer with User:
1. **What are your specific use cases?**
   - Do you have your own domain? If so, which one(s)?
   - Is it a catchall setup (all emails go to one mailbox)?
   - Or do you create specific aliases (sales@domain, support@domain)?

2. **How should aliases be created/managed?**
   - For own-domain: Do you create aliases manually in your email provider first?
   - For catchall: Should extension suggest/create any alias on the fly?

3. **Base address identification:**
   - With plus-addressing: base is `user@posteo.de`, aliases are `user+X@posteo.de`
   - With own-domain: what's the "base"? Is there one? Or are all aliases equal?
   - Example: If you have `info@mydomain.com`, `sales@mydomain.com`, is there a base?

4. **Feature 1 (Auto-reply) behavior:**
   - Plus-addressing: Reply from whatever alias received the email
   - Own-domain: Same behavior? Reply from exact alias that received it?

5. **Feature 2 (Alias suggestion) behavior:**
   - Plus-addressing: Suggests creating `user+alias@posteo.de` from base `user@posteo.de`
   - Own-domain: What should it suggest?
     - Catchall: Any text before @yourdomain.com?
     - Specific aliases: Pick from a predefined list?

6. **Feature 3 (Auto-create identity) behavior:**
   - Should work the same regardless of method?
   - Create Thunderbird identity for new aliases discovered?

7. **Configuration:**
   - Should users be able to use multiple methods simultaneously?
   - Example: Plus-addressing for personal@posteo.de AND own-domain for stuff@mydomain.com?
   - Per-account method selection?

### Technical Questions:
8. How do we detect which method applies to which email address?
9. What's the algorithm for matching/extracting aliases in catchall mode?
10. Do we need to validate that aliases actually exist (for non-catchall)?

## Current Implementation Analysis

### Plus-Addressing Pattern (Current)
- **Base extraction**: Remove everything between `+` and `@`
  - `user+shopping@posteo.de` → base: `user@posteo.de`
- **Matching**: Compare stripped version against configured identities
- **Alias detection**: Look for `+` in email address
- **Feature 1**: Extract alias from original recipient, set as From
- **Feature 2**: Prompt for alias name, construct `user+{input}@posteo.de`
- **Feature 3**: Create identity for the full alias address

### Code Locations to Modify
- `background.js`:
  - `extractBaseEmail()` - line ~65 - Currently strips `+alias` part
  - `findMatchingAlias()` - line ~95 - Matches against base addresses
  - `showAliasPrompt()` - line ~170 - Suggests alias format
  - Settings storage - Need to add method preference per account

## Decisions Made

### Requirements (Phase 1 - Completed)
- ✅ Branch created: `feature/own-domain-or-catchall`
- ✅ Using planning-with-files pattern for organization
- ✅ Multiple methods supported: **Yes, one per account**
- ✅ Settings UI redesign: Per-account sections with:
  - Feature 1 enable/disable checkbox (default: **disabled** - opt-in)
  - Alias method radio buttons (3 options)
  - Feature 2 enable/disable checkbox (default: disabled)
- ✅ Feature 3 stays global (no changes to its settings)

### Settings Page Structure
See `feature_own_domain_notes.md` for detailed UI mockup.

**Per-account settings:**
1. Feature 1 checkbox (auto-reply) - default: disabled
2. Alias method radio buttons (disabled if Feature 1 is off):
   - Plus-addressing (default)
   - Own domain
   - Own domain with catchall
3. Feature 2 checkbox (alias suggestion) - disabled if Feature 1 is off

**Global settings:**
- Feature 3 (identity creation) - unchanged

## Errors Encountered
(None yet)

## Status
**Phase 3 COMPLETE** ✅ - Implementation finished, tested, and working

**Completed in Phase 3:**
1. ✅ Updated storage structure (accountSettings)
2. ✅ Added getAccountSettings() helper
3. ✅ Redesigned options.html with table structure
4. ✅ Implemented options.js with domain conflict detection
5. ✅ Feature 1 disabled by default (opt-in)
6. ✅ Feature 2 depends on Feature 1 (disabled when Feature 1 is off)
7. ✅ Settings preserved when features are disabled (only UI interaction disabled)
8. ✅ Added helper functions: extractDomain(), extractBase(), matchesBase()
9. ✅ Updated findMatchingAlias() to be async and method-aware
10. ✅ Updated Feature 1 (auto-reply) to use new algorithm
11. ✅ Updated Feature 2 (alias suggestion) to be method-aware
12. ✅ Updated popup/alias-prompt.html with dynamic elements
13. ✅ Updated popup/alias-prompt.js to handle all three methods
14. ✅ Fixed critical bug: identities variable scoping issue
15. ✅ Enhanced display name formatting for recipients without names
16. ✅ Cleaned up excessive debug logging for production
17. ✅ Implemented settings migration from old format (promptForAlias/dontAskAgain → accountSettings)
18. ✅ Tested all three alias methods successfully
19. ✅ Built XPI: send-as-alias-1.0.3-b03aea4-SNAPSHOT.xpi

**Phase 3 completed successfully!** ✅

### Phase 4: Testing and Documentation ✅

1. ✅ Tested all three alias methods (plus-addressing, own domain, catchall)
2. ✅ Verified display name handling
3. ✅ Updated README with comprehensive documentation:
   - Added alias methods overview
   - Updated feature descriptions with examples for all methods
   - Enhanced configuration section with per-account settings
   - Added detailed "How It Works" section for each method
   - Updated troubleshooting guide
   - Updated file structure
4. ✅ Implementation complete and production-ready

**Next:** Ready for merge to main branch

## Summary

### Phase 1: Requirements ✅
1. ✅ Per-account settings with three alias methods
2. ✅ Feature 1 enable/disable per account
3. ✅ Domain-based matching for own-domain methods
4. ✅ Help text for each method in UI
5. ✅ Domain conflict prevention (disable conflicting identities)
6. ✅ Feature 2 prompts adapted per method
7. ✅ Data structure and storage design
8. ✅ Migration plan for existing users

### Phase 2: Design ✅
1. ✅ Algorithm changes specified in DESIGN_OWN_DOMAIN.md
2. ✅ UI mockups and HTML templates created
3. ✅ Data migration logic designed
4. ✅ Complete technical specification written
5. ✅ All code changes identified

**See [DESIGN_OWN_DOMAIN.md](DESIGN_OWN_DOMAIN.md) for complete technical specification**

### Next: Phase 3 Implementation Tasks
1. Implement data migration logic
2. Update storage and algorithm functions
3. Modify Feature 1, 2, and 3 to be method-aware
4. Redesign options UI with per-account blocks
5. Update popup prompts for different methods
6. Implement domain conflict detection
7. Test all scenarios
