// ─── น้องนาโน — NextAuth Configuration ───────────────────────

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./prisma";
import { Plan, DbMode, Role } from "@prisma/client";

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      tenantSlug: string;
      tenantPlan: Plan;
      tenantDbMode: DbMode;
      departmentId: string | null;
      role: Role;
      displayName: string;
      pictureUrl?: string;
    };
  }

  interface User {
    tenantId: string;
    tenantSlug: string;
    tenantPlan: Plan;
    tenantDbMode: DbMode;
    departmentId: string | null;
    role: Role;
    displayName: string;
    pictureUrl?: string;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    tenantId: string;
    tenantSlug: string;
    tenantPlan: Plan;
    tenantDbMode: DbMode;
    departmentId: string | null;
    role: Role;
    displayName: string;
    pictureUrl?: string;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: "line-liff",
      name: "LINE LIFF",
      credentials: {
        lineUid: { label: "LINE UID", type: "text" },
        displayName: { label: "Display Name", type: "text" },
        pictureUrl: { label: "Picture URL", type: "text" },
        tenantSlug: { label: "Tenant Slug", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.lineUid || !credentials?.tenantSlug) {
          return null;
        }

        const lineUid = credentials.lineUid as string;
        const displayName = credentials.displayName as string;
        const pictureUrl = credentials.pictureUrl as string;
        const tenantSlug = credentials.tenantSlug as string;

        // ดึง tenant
        const tenant = await prisma.tenant.findUnique({
          where: { slug: tenantSlug },
        });

        if (!tenant || !tenant.isActive) return null;

        // หา user หรือสร้างใหม่
        let user = await prisma.user.findUnique({
          where: {
            tenantId_lineUid: {
              tenantId: tenant.id,
              lineUid,
            },
          },
        });

        if (!user) {
          // สร้าง user ใหม่
          user = await prisma.user.create({
            data: {
              tenantId: tenant.id,
              lineUid,
              displayName,
              pictureUrl,
              role: "USER",
            },
          });
        } else {
          // อัปเดตข้อมูล
          user = await prisma.user.update({
            where: { id: user.id },
            data: { displayName, pictureUrl },
          });
        }

        return {
          id: user.id,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantPlan: tenant.plan,
          tenantDbMode: tenant.dbMode,
          departmentId: user.departmentId,
          role: user.role,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl || undefined,
        };
      },
    }),

    // Dev Bypass Login — ใช้ได้เฉพาะ development
    ...(process.env.DEV_BYPASS_LOGIN === "true"
      ? [
          Credentials({
            id: "dev-bypass",
            name: "Dev Bypass",
            credentials: {
              userId: { label: "User ID", type: "text" },
              tenantSlug: { label: "Tenant Slug", type: "text" },
              role: { label: "Role", type: "text" },
            },
            async authorize(credentials) {
              if (process.env.NODE_ENV !== "development") return null;

              const tenantSlug = (credentials?.tenantSlug as string) || "demo";
              const role = (credentials?.role as Role) || "SUPER_ADMIN";

              const tenant = await prisma.tenant.findUnique({
                where: { slug: tenantSlug },
              });

              if (!tenant) return null;

              // ดึง user แรกที่มี role ตรง หรือ user แรกของ tenant
              let user = await prisma.user.findFirst({
                where: { tenantId: tenant.id, role },
              });

              if (!user) {
                user = await prisma.user.findFirst({
                  where: { tenantId: tenant.id },
                });
              }

              if (!user) return null;

              return {
                id: user.id,
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                tenantPlan: tenant.plan,
                tenantDbMode: tenant.dbMode,
                departmentId: user.departmentId,
                role: user.role,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl || undefined,
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.tenantPlan = user.tenantPlan;
        token.tenantDbMode = user.tenantDbMode;
        token.departmentId = user.departmentId;
        token.role = user.role;
        token.displayName = user.displayName;
        token.pictureUrl = user.pictureUrl;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        tenantId: token.tenantId as string,
        tenantSlug: token.tenantSlug as string,
        tenantPlan: token.tenantPlan as Plan,
        tenantDbMode: token.tenantDbMode as DbMode,
        departmentId: token.departmentId as string | null,
        role: token.role as Role,
        displayName: token.displayName as string,
        pictureUrl: token.pictureUrl as string | undefined,
        email: "",
        emailVerified: null,
      } as any;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
