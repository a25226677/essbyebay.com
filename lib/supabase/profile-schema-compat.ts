const PROFILE_BASE_COLUMNS = [
  "id",
  "full_name",
  "phone",
  "avatar_url",
  "role",
  "is_active",
  "is_virtual",
  "disable_login",
  "wallet_balance",
  "created_at",
  "updated_at",
];

const PROFILE_OPTIONAL_COLUMNS = [
  "credit_score",
  "package",
  "is_verified",
  "balance",
  "seller_approved",
  "guarantee_money",
  "pending_balance",
  "seller_views",
  "comment_permission",
  "home_display",
  "verification_info",
  "invitation_code",
  "salesman_id",
  "identity_card_url",
  "total_recharge",
  "total_withdrawn",
  "certificate_type",
  "certificate_front_url",
  "certificate_back_url",
  "transaction_password",
];

const PROFILE_DEFAULTS: Record<string, unknown> = {
  credit_score: 100,
  package: null,
  is_verified: false,
  balance: 0,
  seller_approved: false,
  guarantee_money: 0,
  pending_balance: 0,
  seller_views: 0,
  comment_permission: true,
  home_display: false,
  verification_info: null,
  invitation_code: null,
  salesman_id: null,
  identity_card_url: null,
  total_recharge: 0,
  total_withdrawn: 0,
  certificate_type: "id_card",
  certificate_front_url: null,
  certificate_back_url: null,
  transaction_password: null,
};

type QueryError = {
  message?: string;
} | null;

type ProfileQueryResult = {
  data: unknown;
  error: QueryError;
  count?: number | null;
};

type ProfileUpdateClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: QueryError }>;
    };
  };
};

function getErrorMessage(error: QueryError) {
  return error?.message || "";
}

function getMissingProfileColumn(message: string) {
  const match = message.match(/column\s+profiles\.([a-zA-Z0-9_]+)\s+does not exist/i);
  return match?.[1] ?? null;
}

function applyProfileDefaults<T extends Record<string, unknown>>(row: T, availableColumns: Set<string>) {
  const next = { ...row } as T & Record<string, unknown>;

  for (const [column, defaultValue] of Object.entries(PROFILE_DEFAULTS)) {
    if (!availableColumns.has(column) && !(column in next)) {
      next[column] = defaultValue;
    }
  }

  return next;
}

export async function selectProfilesWithFallback(
  runQuery: (columns: string, availableColumns: Set<string>) => PromiseLike<ProfileQueryResult>,
) {
  let optionalColumns = [...PROFILE_OPTIONAL_COLUMNS];

  while (true) {
    const activeColumns = [...PROFILE_BASE_COLUMNS, ...optionalColumns];
    const availableColumns = new Set(activeColumns);
    const result = await runQuery(activeColumns.join(", "), availableColumns);

    if (!result.error) {
      const rows = Array.isArray(result.data)
        ? result.data
        : result.data
          ? [result.data]
          : [];

      return {
        data: rows.map((row: Record<string, unknown>) => applyProfileDefaults(row, availableColumns)),
        count: result.count ?? null,
        availableColumns,
        missingColumns: PROFILE_OPTIONAL_COLUMNS.filter((column) => !availableColumns.has(column)),
        error: null,
      };
    }

    const missingColumn = getMissingProfileColumn(getErrorMessage(result.error));
    if (!missingColumn || !optionalColumns.includes(missingColumn)) {
      return {
        data: null,
        count: null,
        availableColumns,
        missingColumns: [] as string[],
        error: result.error,
      };
    }

    optionalColumns = optionalColumns.filter((column) => column !== missingColumn);
  }
}

export async function updateProfileWithFallback(db: ProfileUpdateClient, id: string, updates: Record<string, unknown>) {
  const pendingUpdates = { ...updates };
  const skippedColumns: string[] = [];

  while (Object.keys(pendingUpdates).length > 0) {
    const { error } = await db.from("profiles").update(pendingUpdates).eq("id", id);

    if (!error) {
      return { error: null, skippedColumns };
    }

    const missingColumn = getMissingProfileColumn(getErrorMessage(error));
    if (!missingColumn || !(missingColumn in pendingUpdates)) {
      return { error, skippedColumns };
    }

    delete pendingUpdates[missingColumn];
    skippedColumns.push(missingColumn);
  }

  return { error: null, skippedColumns };
}