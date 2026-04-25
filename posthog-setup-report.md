<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Path Logic Angular application. PostHog is initialized in `AppComponent` using a dedicated `PostHogService` that wraps the SDK with SSR safety. Users are identified by their Firebase UID on Google sign-in and reset on sign-out. Twelve events are tracked across seven files covering the full user lifecycle: authentication, onboarding, daily transaction entry, QIF reconciliation, split transactions, and Google Drive sync health.

Environment variables (`NG_APP_POSTHOG_PROJECT_TOKEN`, `NG_APP_POSTHOG_HOST`) are loaded via `import.meta.env` in all environment files and stored in `.env`.

## Files created / modified

| File                                                                                     | Change                                                    |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `app/src/app/services/posthog/posthog.service.ts`                                        | Created — SSR-safe PostHog service wrapper                |
| `app/src/env.d.ts`                                                                       | Created — TypeScript declarations for `import.meta.env`   |
| `app/src/app/models/environment.model.ts`                                                | Added `posthogKey` and `posthogHost` fields               |
| `app/src/environments/environment.ts`                                                    | Added PostHog env vars                                    |
| `app/src/environments/environment.prod.ts`                                               | Added PostHog env vars                                    |
| `app/src/environments/environment.staging.ts`                                            | Added PostHog env vars                                    |
| `app/src/app/app.component.ts`                                                           | Initialize PostHog on app start                           |
| `app/src/app/services/auth/auth.service.ts`                                              | User identify, `user_signed_in`, `user_signed_out`        |
| `app/src/app/pages/sign-in/sign-in.component.ts`                                         | `sign_in_attempted`, `sign_in_failed`                     |
| `app/src/app/components/onboarding/welcome-wizard/welcome-wizard.component.ts`           | `onboarding_account_created`                              |
| `app/src/app/components/onboarding/new-account-dialog/new-account-dialog.component.ts`   | `account_created`                                         |
| `app/src/app/components/ledger/account-ledger/account-ledger.component.ts`               | `transaction_added`                                       |
| `app/src/app/components/ledger/reconciliation-dialog/reconciliation-dialog.component.ts` | `reconciliation_completed`                                |
| `app/src/app/components/ledger/split-entry-dialog/split-entry-dialog.component.ts`       | `split_transaction_saved`                                 |
| `app/src/app/services/sync/sync.service.ts`                                              | `data_loaded_from_drive`, `sync_completed`, `sync_failed` |

## Events instrumented

| Event                        | Description                                           | File                                 |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `sign_in_attempted`          | User clicked Google sign-in button                    | `sign-in.component.ts`               |
| `sign_in_failed`             | Google sign-in attempt failed (with `error_type`)     | `sign-in.component.ts`               |
| `user_signed_in`             | Successful Google SSO login; user identified          | `auth.service.ts`                    |
| `user_signed_out`            | User signed out; PostHog session reset                | `auth.service.ts`                    |
| `onboarding_account_created` | First account created via welcome wizard              | `welcome-wizard.component.ts`        |
| `account_created`            | Additional account added via new-account dialog       | `new-account-dialog.component.ts`    |
| `transaction_added`          | Manual transaction added via quick-add form           | `account-ledger.component.ts`        |
| `reconciliation_completed`   | QIF import reconciliation decisions applied           | `reconciliation-dialog.component.ts` |
| `split_transaction_saved`    | Split transaction saved (balanced or adjusted)        | `split-entry-dialog.component.ts`    |
| `data_loaded_from_drive`     | Database loaded from Drive/local fallback/fresh start | `sync.service.ts`                    |
| `sync_completed`             | Database successfully saved to Google Drive           | `sync.service.ts`                    |
| `sync_failed`                | Drive sync error (load or save operation)             | `sync.service.ts`                    |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/391268/dashboard/1492841
- **Sign-in funnel: Attempted → Completed**: https://us.posthog.com/project/391268/insights/CaoK5Z3x
- **Daily active users (sign-ins)**: https://us.posthog.com/project/391268/insights/D26UokXq
- **Onboarding funnel: Sign-in → First account created**: https://us.posthog.com/project/391268/insights/XWHQ9k27
- **Transaction activity trend**: https://us.posthog.com/project/391268/insights/Qv02ofIs
- **Sync health: Completed vs Failed**: https://us.posthog.com/project/391268/insights/4DX3KYnc

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-angular/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
