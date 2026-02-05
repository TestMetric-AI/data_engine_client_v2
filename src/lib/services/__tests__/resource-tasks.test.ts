import { createResourceTask, updateResourceTask } from '../resource-tasks';
import prisma from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => {
    const mockPrisma: any = {
        resourceTask: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        resourceTaskStatusHistory: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        resourceTaskStatus: {
            findUnique: jest.fn(),
        },
        resource: {
            findUnique: jest.fn(),
        },
    };
    mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));

    return {
        __esModule: true,
        default: mockPrisma,
    };
});

describe('Resource Tasks Service', () => {
    const mockDate = new Date('2024-01-01');
    const mockTaskId = 'task-123';
    const mockStatusTodo = { id: 'status-todo', name: 'To Do' };
    const mockStatusDone = { id: 'status-done', name: 'Done' };
    const mockResourceId = 'resource-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createResourceTask', () => {
        it('should create task and initial history', async () => {
            const input = {
                title: 'Test Task',
                priority: 'medium',
                statusId: mockStatusTodo.id,
                resourceId: mockResourceId,
            };

            const createdTask = {
                id: mockTaskId,
                ...input,
                approvalStatus: 'PENDING',
                createdAt: mockDate,
                updatedAt: mockDate
            };

            // Mock DB responses
            (prisma.resourceTask.create as jest.Mock).mockResolvedValue(createdTask);

            const result = await createResourceTask(input as any, mockResourceId);

            expect(prisma.resourceTask.create).toHaveBeenCalledWith({
                data: input,
            });

            expect(prisma.resourceTaskStatusHistory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    taskId: mockTaskId,
                    toStatusId: mockStatusTodo.id,
                    changedById: mockResourceId,
                    notes: "Task created",
                })
            });

            expect(result).toEqual(createdTask);
        });
    });

    describe('updateResourceTask', () => {
        it('should create history on status change', async () => {
            const updateInput = {
                statusId: mockStatusDone.id
            };

            const currentTask = {
                id: mockTaskId,
                title: 'Old Title',
                statusId: mockStatusTodo.id,
            };

            const updatedTask = {
                ...currentTask,
                statusId: mockStatusDone.id,
            };

            // Mock DB responses
            (prisma.resourceTask.findUnique as jest.Mock).mockResolvedValue(currentTask);
            (prisma.resourceTask.update as jest.Mock).mockResolvedValue(updatedTask);

            const result = await updateResourceTask(mockTaskId, updateInput as any, mockResourceId);

            // 1. Verify fetch current
            expect(prisma.resourceTask.findUnique).toHaveBeenCalledWith({
                where: { id: mockTaskId },
                select: { statusId: true }
            });

            // 2. Verify update
            expect(prisma.resourceTask.update).toHaveBeenCalledWith({
                where: { id: mockTaskId },
                data: updateInput,
            });

            // 3. Verify history creation
            expect(prisma.resourceTaskStatusHistory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    taskId: mockTaskId,
                    fromStatusId: mockStatusTodo.id,
                    toStatusId: mockStatusDone.id,
                    changedById: mockResourceId,
                    notes: "Status updated",
                })
            });

            expect(result).toEqual(updatedTask);
        });

        it('should NOT create history if status is unchanged', async () => {
            const updateInput = {
                title: 'New Title'
            };

            const currentTask = {
                id: mockTaskId,
                title: 'Old Title',
                statusId: mockStatusTodo.id,
            };

            const updatedTask = {
                ...currentTask,
                title: 'New Title',
            };

            // Mock DB responses
            (prisma.resourceTask.findUnique as jest.Mock).mockResolvedValue(currentTask);
            (prisma.resourceTask.update as jest.Mock).mockResolvedValue(updatedTask);

            await updateResourceTask(mockTaskId, updateInput as any, mockResourceId);

            expect(prisma.resourceTaskStatusHistory.create).not.toHaveBeenCalled();
        });
    });
});
