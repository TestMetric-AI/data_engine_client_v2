# Task Management & Approval Workflow

This document describes the Task Management system and the specific Approval Workflow.

## Overview
The task management system allows Resources to register tasks and Leaders to approve or reject them. This ensures a quality control cycle where work is validated before being considered final.

## Permissions

| Permission | Description | Assigned Roles (Typical) |
| :--- | :--- | :--- |
| `MANAGE_TASKS` | Create, Edit, Delete tasks. | ADMIN, RESOURCE |
| `APPROVE_TASKS` | Approve or Reject tasks. | ADMIN, LEAD |

> Note: Roles are configurable in the Admin Permissions panel.

## Data Model

### ResourceTask
- **approvalStatus**: Enum (`PENDING`, `APPROVED`, `REJECTED`). Default is `PENDING`.
- **approvedBy**: Link to the `Resource` who approved the task.
- **approvedAt**: Timestamp of approval.

## Workflow

1.  **Submission**:
    - A user (Resource) creates a task via the `/management/tasks` interface.
    - The task is created with `approvalStatus = PENDING`.

2.  **Review**:
    - A user with `APPROVE_TASKS` permission (Leader) views the list of tasks.
    - Pending tasks show an "Approval" badge in a neutral color.
    - The Leader sees "Approve" (Checkmark) and "Reject" (X) buttons.

3.  **Approval**:
    - If Approved: Status changes to `APPROVED`. `approvedBy` is set to the Leader's Resource profile.
    - If Rejected: Status changes to `REJECTED`.

## How to Configure

1.  **Assign Permissions**:
    - Go to `/management/roles`.
    - Ensure your "Lead" role has the `APPROVE_TASKS` permission checked.
    - Ensure your "Resource" role has `MANAGE_TASKS`.

2.  **Usage**:
    - Resources just add tasks.
    - Leads filter by status or review the list to approve.
