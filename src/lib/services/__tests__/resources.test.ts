import {
    createResource,
    getResources,
    updateResource,
    toggleResourceStatus,
    getEligibleUsers,
    getResourceById,
} from "../resources";
import prisma from "@/lib/db";

// Mock Prisma
jest.mock("@/lib/db", () => ({
    __esModule: true,
    default: {
        resource: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        resourceRole: {
            findMany: jest.fn(),
        },
    },
}));

describe("Resources Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getResources", () => {
        it("should return paginated resources", async () => {
            const mockResources = [{ id: "1", fullName: "John Doe" }];
            (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);
            (prisma.resource.count as jest.Mock).mockResolvedValue(1);

            const result = await getResources({});
            expect(result.resources).toEqual(mockResources);
            expect(result.total).toBe(1);
            expect(prisma.resource.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 10,
                skip: 0,
            }));
        });
    });

    describe("createResource", () => {
        it("should create a resource when user is active", async () => {
            const mockUser = { id: "user1", isActive: true };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.resource.create as jest.Mock).mockResolvedValue({ id: "res1", userId: "user1" });

            const input: any = {
                user: { connect: { id: "user1" } },
                fullName: "John Resource",
            };

            await createResource(input);
            expect(prisma.resource.create).toHaveBeenCalled();
        });

        it("should throw error if user is inactive", async () => {
            const mockUser = { id: "user1", isActive: false };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const input: any = {
                user: { connect: { id: "user1" } },
                fullName: "Inactive User",
            };

            await expect(createResource(input)).rejects.toThrow("User must be active");
        });
    });

    describe("getEligibleUsers", () => {
        it("should return active users without resources", async () => {
            await getEligibleUsers();
            expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    isActive: true,
                    resource: { is: null },
                },
            }));
        });
    });

    describe("toggleResourceStatus", () => {
        it("should update active status", async () => {
            await toggleResourceStatus("res1", false);
            expect(prisma.resource.update).toHaveBeenCalledWith({
                where: { id: "res1" },
                data: { active: false },
            });
        });
    });
});
