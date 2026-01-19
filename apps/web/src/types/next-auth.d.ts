import "next-auth";

declare module "next-auth" {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface Session {
        accessToken?: string;
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
