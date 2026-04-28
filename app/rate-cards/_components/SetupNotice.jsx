// Friendly fallback rendered when the rate-cards Airtable read fails. Without
// this, any missing env var / missing table / PAT scope problem surfaces as a
// generic 500 ("Application error: digest …") that doesn't tell the operator
// what to fix. Detects the three most common failure modes and shows a
// targeted hint; raw error is in a collapsed details block for everything else.

import { Card } from "@/app/calculator/_components/ui";

export default function SetupNotice({ error, isAdmin }) {
  if (!isAdmin) {
    return (
      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Rate cards aren&apos;t available for your account yet. Please reach out to your account manager.
        </p>
      </Card>
    );
  }

  const isMissingTable = /could not find table|table not found|NOT_FOUND/i.test(error);
  const isMissingEnv = /Missing env var/i.test(error);
  const isAuth = /(401|403|invalid|unauthorized|forbidden|invalid api key|invalid_api_key|not authorized)/i.test(error);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
        Rate Cards module needs setup
      </h2>

      {isMissingEnv && (
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>An Airtable env var is missing. Set these on Vercel (Project Settings → Environment Variables):</p>
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
{`AIRTABLE_PAT_CALCULATOR=<your calc PAT>
AIRTABLE_CALC_BASE_ID=<your calc base id>
AIRTABLE_RATE_CARDS_TABLE=Rate Cards
AIRTABLE_RATE_CARD_ITEMS_TABLE=Rate Card Items`}
          </pre>
          <p className="text-xs text-gray-500 dark:text-gray-400">After adding, trigger a fresh deploy on Vercel — env vars only apply to new builds.</p>
        </div>
      )}

      {isMissingTable && (
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            The <code>Rate Cards</code> / <code>Rate Card Items</code> tables don&apos;t exist
            in the calc Airtable base yet. Create them with the schema in
            <code className="ml-1">README.md → Rate Cards module</code>.
          </p>
        </div>
      )}

      {isAuth && !isMissingEnv && !isMissingTable && (
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            Airtable rejected the request. Likely the <code>AIRTABLE_PAT_CALCULATOR</code> PAT doesn&apos;t have
            <strong> data.records:read</strong> + <strong> data.records:write</strong> scope on the
            calc base, or the calc base isn&apos;t in the PAT&apos;s Access list.
          </p>
        </div>
      )}

      {!isMissingEnv && !isMissingTable && !isAuth && (
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Couldn&apos;t load rate cards from Airtable. Check the calc base PAT scope and table names.
        </p>
      )}

      <details className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer">Raw error</summary>
        <pre className="mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-pre-wrap">
          {error}
        </pre>
      </details>
    </Card>
  );
}
