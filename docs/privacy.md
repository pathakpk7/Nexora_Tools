# Privacy Guarantees — Nexora Tools

## Core Tenets
1. **Local-First Processing:** No user data is transmitted to external servers. All operations occur in the browser environment.
2. **Zero Third-Party Telemetry:** No analytics scripts (Google Analytics, Mixpanel, etc.) or crash reporters that expose private user metadata.
3. **Sensitive Field Exclusion:** FormFill Pro explicitly ignores password, CVV/credit card, and hidden security token inputs.
4. **Explicit Approval Only:** Autofill is never applied silently or automatically. The user actively reviews and approves the payload before DOM insertion.
5. **No Universal Host Injections:** Content scripts and background services run on-demand or idle without collecting background browsing history.
