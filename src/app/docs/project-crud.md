# Project CRUD Documentation

## Overview
This module implements a CRUD (Create, Read, Update, Delete) system for the `Project` entity, located at `/management/projects`.

## Components

### Database Service (`src/lib/services/projects.ts`)
Handles direct database interactions using Prisma.
- `getProjects`: Fetches paginated and filtered projects.
- `createProject`: Creates a new project.
- `updateProject`: Updates an existing project.
- `deleteProject`: Deletes a project.

### Server Actions (`src/app/management/projects/actions.ts`)
Server-side functions called by the UI.
- `getProjectsAction`: Wraps `getProjects`.
- `createProjectAction`: Wraps `createProject` and revalidates path.
- `updateProjectAction`: Wraps `updateProject` and revalidates path.
- `deleteProjectAction`: Removed. Replaced by `toggleProjectStatusAction` to activate/deactivate projects.

### UI Components
- **Page (`src/app/management/projects/page.tsx`)**: Main layout, manages Modal state.
- **Table (`src/app/management/projects/ProjectsTable.tsx`)**: Displays the list of projects with search, pagination, and status management.
    - Allows Activating/Deactivating projects via Power icon.
    - Status column indicates Active/Inactive state.
- **Form (`src/app/management/projects/ProjectForm.tsx`)**: Form for creating and editing projects. Includes validation.

---

## Resource CRUD Documentation

### Overview
This module implements a CRUD system for the `Resource` entity, located at `/management/resources`. A Resource is an active User with allocated time and a role.

### Database Service (`src/lib/services/resources.ts`)
- `getResources`: Fetches paginated resources with filtering.
- `createResource`: Assigns a Resource record to an existing Active User.
- `updateResource`: Updates resource details (role, allocation).
- `toggleResourceStatus`: Activates/Deactivates a resource.
- `getEligibleUsers`: Fetches active users who are not yet resources.

### Server Actions
- `getResourcesAction`
- `createResourceAction`
- `updateResourceAction`
- `toggleResourceStatusAction`
- `getFormDataAction`: Fetches metadata for the form (users, roles).

### UI Components
- **Table**: Lists resources. Supports filtering by name/role/email.
    - Columns: Full Name, Email, Role, Allocation, Status.
    - Actions: Edit, Toggle Status (Power Icon).
- **Form**:
    - **User**: Select from active users (Create only).
    - **Full Name**: Auto-filled from user but editable.
    - **Role**: Select from available resource roles.
    - **Allocation**: Percentage slider (0-100).
- **Modal**: Used for Form (Create/Edit) and Confirmation (Status Toggle).

---

## ResourceRole CRUD Documentation

### Overview
This module implements a CRUD system for `ResourceRole`, located at `/management/resource-roles`. These roles define the functional capacity of a resource (e.g., Developer, Analyst).

### Database Service (`src/lib/services/resource-roles.ts`)
- `getResourceRoles`: Fetches paginated roles.
- `createResourceRole`: Creates a new role. Name must be unique.
- `updateResourceRole`: Updates role details.
- `toggleResourceRoleStatus`: Toggles the `isActive` status of a role.

### Server Actions
- Wraps service functions for UI consumption. Includes error handling for unique constraint violations (duplicate names).

### UI Components
- **Table**: Lists roles and the count of resources assigned to each.
    - Columns: Name, Description, Resource Count, Status, Actions.
    - Actions: Edit, Toggle Status (Power Icon) with Confirmation Modal.
- **Form**:
    - **Name**: Unique name for the role.
    - **Description**: Optional description.
