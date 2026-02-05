import {
    createResourceRole,
    toggleResourceRoleStatus,
    getResourceRoles,
    updateResourceRole,
    getResourceRoleById,
} from "../resource-roles";
import prisma from "@/lib/db";

// Mock Prisma
jest.mock("@/lib/db", () => ({
    __esModule: true,
    default: {
        resourceRole: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

describe("Resource Roles Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getResourceRoles", () => {
        it("should return paginated resource roles", async () => {
            const mockRoles = [{ id: "1", name: "Developer", isActive: true }];
            (prisma.resourceRole.findMany as jest.Mock).mockResolvedValue(mockRoles);
            (prisma.resourceRole.count as jest.Mock).mockResolvedValue(1);

            const result = await getResourceRoles({});
            expect(result.roles).toEqual(mockRoles);
            expect(result.total).toBe(1);
            expect(prisma.resourceRole.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 10,
                skip: 0,
            }));
        });
    });

    describe("createResourceRole", () => {
        it("should create a resource role", async () => {
            const input = { name: "New Role", description: "Desc" };
            (prisma.resourceRole.create as jest.Mock).mockResolvedValue({ id: "1", ...input, isActive: true });

            await createResourceRole(input);
            expect(prisma.resourceRole.create).toHaveBeenCalledWith({ data: input });
        });
    });

    describe("updateResourceRole", () => {
        it("should update a resource role", async () => {
            const input = { name: "Updated Role" };
            (prisma.resourceRole.update as jest.Mock).mockResolvedValue({ id: "1", ...input });

            await updateResourceRole("1", input);
            expect(prisma.resourceRole.update).toHaveBeenCalledWith({
                where: { id: "1" },
                data: input,
            });
        });
    });

    describe("toggleResourceRoleStatus", () => {
        it("should activate a resource role", async () => {
            await toggleResourceRoleStatus("1", true);
            expect(prisma.resourceRole.update).toHaveBeenCalledWith({
                where: { id: "1" },
                data: { isActive: true },
            });
        });

        it("should deactivate a resource role", async () => {
            await toggleResourceRoleStatus("1", false);
            expect(prisma.resourceRole.update).toHaveBeenCalledWith({
                where: { id: "1" },
                data: { isActive: false },
            });
        });
    });
});
