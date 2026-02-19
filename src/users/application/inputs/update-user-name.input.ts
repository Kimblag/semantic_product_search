export type UpdateUserNameInput = {
  userId: string;
  newName: string;
  changedBy: string; // user id of the admin that changed the name
};
