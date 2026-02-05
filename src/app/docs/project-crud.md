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
