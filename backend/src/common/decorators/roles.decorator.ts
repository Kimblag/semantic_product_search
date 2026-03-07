import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

// decorator to set the roles metadata on the route handler or controller
// we use setMetadata function from nestjs common to set the metadata with the key 'roles'
// and the value of the roles array that we pass as argument to the decorator
// these roles  come from the database and are assigned to the user when they log in,
// then we can use this metadata in the RolesGuard to check if the user
// has the required roles to access the route handler or controller
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
