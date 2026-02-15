export type ChangeUserPasswordCommand = {
  newPassword: string;
  currentPassword: string;
  userId: string;
};
