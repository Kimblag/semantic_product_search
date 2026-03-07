export type DeactivateUserInput = {
  deactivatedBy: string; // userId of the admin performing the deactivation
  userId: string; // userId of the account to be deactivated
};
