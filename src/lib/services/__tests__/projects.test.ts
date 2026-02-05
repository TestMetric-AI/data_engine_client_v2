import { getProjects, createProject, updateProject, deleteProject } from '../projects';
import prisma from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        project: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

describe('Projects Service', () => {
    const mockDate = new Date('2024-01-01');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProjects', () => {
        it('should return paginated projects', async () => {
            const mockProjects = [
                { id: '1', name: 'Project 1', createdAt: mockDate },
                { id: '2', name: 'Project 2', createdAt: mockDate },
            ];
            (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);
            (prisma.project.count as jest.Mock).mockResolvedValue(2);

            const result = await getProjects({ page: 1, pageSize: 10 });

            expect(prisma.project.findMany).toHaveBeenCalledWith({
                where: {},
                skip: 0,
                take: 10,
                orderBy: { createdAt: 'desc' },
            });
            expect(result).toEqual({
                projects: mockProjects,
                total: 2,
                totalPages: 1,
            });
        });

        it('should filter by search query', async () => {
            const mockProjects = [{ id: '1', name: 'Search Match', createdAt: mockDate }];
            (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);
            (prisma.project.count as jest.Mock).mockResolvedValue(1);

            await getProjects({ page: 1, pageSize: 10, search: 'test' });

            expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    OR: [
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { code: { contains: 'test', mode: 'insensitive' } },
                        { description: { contains: 'test', mode: 'insensitive' } },
                    ],
                },
            }));
        });
    });

    describe('createProject', () => {
        it('should create a project', async () => {
            const input = { name: 'New Project' };
            const created = { id: '1', ...input, createdAt: mockDate };
            (prisma.project.create as jest.Mock).mockResolvedValue(created);

            const result = await createProject(input);

            expect(prisma.project.create).toHaveBeenCalledWith({ data: input });
            expect(result).toEqual(created);
        });
    });

    describe('updateProject', () => {
        it('should update a project', async () => {
            const input = { name: 'Updated Project' };
            const updated = { id: '1', ...input, createdAt: mockDate };
            (prisma.project.update as jest.Mock).mockResolvedValue(updated);

            const result = await updateProject('1', input);

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: input,
            });
            expect(result).toEqual(updated);
        });
    });

    describe('deleteProject', () => {
        it('should delete a project', async () => {
            const deleted = { id: '1', name: 'Deleted Project', createdAt: mockDate };
            (prisma.project.delete as jest.Mock).mockResolvedValue(deleted);

            const result = await deleteProject('1');

            expect(prisma.project.delete).toHaveBeenCalledWith({
                where: { id: '1' },
            });
            expect(result).toEqual(deleted);
        });
    });
});
