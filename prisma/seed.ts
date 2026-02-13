import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Define permissions
const permissions = [
  // Users
  { name: 'CREATE_USER', description: 'Create user' },
  { name: 'EDIT_USER', description: 'Edit user' },
  { name: 'DEACTIVATE_USER', description: 'Deactivate user' },
  { name: 'VIEW_USERS', description: 'View users' },

  // Roles and Permissions
  { name: 'CREATE_ROLE', description: 'Create role' },
  { name: 'EDIT_ROLE', description: 'Edit role' },
  { name: 'DEACTIVATE_ROLE', description: 'Deactivate role' },
  { name: 'VIEW_ROLES', description: 'View roles' },

  // System Parameters
  { name: 'CONFIGURE_PARAMETERS', description: 'Configure system parameters' },
  { name: 'VIEW_BACKGROUND_TASKS', description: 'View background tasks' },

  // Providers
  { name: 'CREATE_PROVIDER', description: 'Create provider' },
  { name: 'EDIT_PROVIDER', description: 'Edit provider' },
  { name: 'DEACTIVATE_PROVIDER', description: 'Deactivate provider' },
  { name: 'VIEW_PROVIDERS', description: 'View providers' },

  // Catalog
  { name: 'UPLOAD_CATALOG', description: 'Upload catalog' },
  { name: 'VIEW_CATALOG', description: 'View catalog' },

  // Clients
  { name: 'CREATE_CLIENT', description: 'Create client' },
  { name: 'EDIT_CLIENT', description: 'Edit client' },
  { name: 'DEACTIVATE_CLIENT', description: 'Deactivate client' },
  { name: 'VIEW_CLIENTS', description: 'View clients' },

  // Requirements
  { name: 'UPLOAD_REQUIREMENT', description: 'Upload requirement' },
  { name: 'EXECUTE_MATCHING', description: 'Execute matching' },
  { name: 'VIEW_OWN_HISTORY', description: 'View own matching history' },
  { name: 'VIEW_ALL_HISTORY', description: 'View all matching history' },
  { name: 'EXPORT_RESULTS', description: 'Export matching results' },
  { name: 'SEND_RESULTS_BY_EMAIL', description: 'Send results via email' },
];

// Permissions by role
const rolePermissions = {
  Admin: [
    'CREATE_USER',
    'EDIT_USER',
    'DEACTIVATE_USER',
    'VIEW_USERS',
    'CREATE_ROLE',
    'EDIT_ROLE',
    'DEACTIVATE_ROLE',
    'VIEW_ROLES',
    'CONFIGURE_PARAMETERS',
    'VIEW_BACKGROUND_TASKS',
    'CREATE_PROVIDER',
    'EDIT_PROVIDER',
    'DEACTIVATE_PROVIDER',
    'VIEW_PROVIDERS',
    'UPLOAD_CATALOG',
    'VIEW_CATALOG',
    'CREATE_CLIENT',
    'EDIT_CLIENT',
    'DEACTIVATE_CLIENT',
    'VIEW_CLIENTS',
    'UPLOAD_REQUIREMENT',
    'EXECUTE_MATCHING',
    'VIEW_ALL_HISTORY',
    'EXPORT_RESULTS',
    'SEND_RESULTS_BY_EMAIL',
  ],
  Executive: [
    'VIEW_PROVIDERS',
    'CREATE_CLIENT',
    'EDIT_CLIENT',
    'DEACTIVATE_CLIENT',
    'VIEW_CLIENTS',
    'UPLOAD_REQUIREMENT',
    'EXECUTE_MATCHING',
    'VIEW_OWN_HISTORY',
    'VIEW_ALL_HISTORY',
    'EXPORT_RESULTS',
    'SEND_RESULTS_BY_EMAIL',
  ],
};

async function main(): Promise<void> {
  console.log('Starting seed...');

  // Clean existing data
  await prisma.rolPermission.deleteMany();
  await prisma.userRol.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleaned existing data');

  // Create permissions
  console.log('Creating permissions...');
  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.create({
        data: perm,
      }),
    ),
  );
  console.log(`Created ${createdPermissions.length} permissions`);

  // Create roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Administrator with full system access',
    },
  });

  const executiveRole = await prisma.role.create({
    data: {
      name: 'Executive',
      description: 'Executive user with limited permissions',
    },
  });
  console.log('Created roles: Admin, Executive');

  // Assign permissions to roles
  console.log('Assigning permissions to roles...');

  // Admin permissions
  const adminPermissions = createdPermissions.filter((p) =>
    rolePermissions.Admin.includes(p.name),
  );

  await Promise.all(
    adminPermissions.map((perm) =>
      prisma.rolPermission.create({
        data: {
          rolId: adminRole.id,
          permissionId: perm.id,
        },
      }),
    ),
  );
  console.log(`Assigned ${adminPermissions.length} permissions to Admin`);

  // Executive permissions
  const execPermissions = createdPermissions.filter((p) =>
    rolePermissions.Executive.includes(p.name),
  );

  await Promise.all(
    execPermissions.map((perm) =>
      prisma.rolPermission.create({
        data: {
          rolId: executiveRole.id,
          permissionId: perm.id,
        },
      }),
    ),
  );
  console.log(`Assigned ${execPermissions.length} permissions to Executive`);

  // Create root user
  console.log('Creating root user...');
  const passwordHash = await bcrypt.hash('root12345678', 10);

  const rootUser = await prisma.user.create({
    data: {
      email: 'root@system.com',
      name: 'Root Administrator',
      passwordHash,
      active: true,
    },
  });

  // Assign Admin role to root user
  await prisma.userRol.create({
    data: {
      userId: rootUser.id,
      rolId: adminRole.id,
    },
  });
  console.log('Created root user with Admin role');
  console.log('Email: root@system.com');
  console.log('Password: root12345678');

  console.log('');
  console.log('Seed completed successfully!');
}

main()
  .then(() => {
    console.log('Seed completed successfully!');
  })
  .catch((e: Error) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
