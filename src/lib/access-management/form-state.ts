export type CollectionActionState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export type UserAccountActionState = CollectionActionState & {
  createdUserId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  provisionalAccess?: {
    email: string;
    temporaryPassword: string;
  } | null;
};

export type AccessProfileActionState = CollectionActionState & {
  fieldErrors?: Record<string, string[] | undefined>;
  savedProfileId?: string;
};

export const initialCollectionActionState: CollectionActionState = {
  status: "idle",
};

export const initialUserAccountActionState: UserAccountActionState = {
  status: "idle",
  provisionalAccess: null,
};

export const initialAccessProfileActionState: AccessProfileActionState = {
  status: "idle",
};
