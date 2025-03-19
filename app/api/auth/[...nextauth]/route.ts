import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Account, Profile, Session, User } from "next-auth";

/**
 * Type Extensions for NextAuth
 * 
 * These declarations extend the default NextAuth types to include
 * the Google OAuth tokens we need for the Calendar API.
 */

// Extend the default session type
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user?: {
      email?: string;
      name?: string;
      image?: string;
    };
  }
}

// Extend the default JWT type
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}

// Get environment variables with fallbacks
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.error('Missing Google OAuth credentials in environment variables!');
}

/**
 * NextAuth Configuration
 * 
 * This configures the authentication system with:
 * 1. Google OAuth provider with Calendar API scope permissions
 * 2. Custom callbacks for JWT and session handling
 * 3. Domain-based authorization rules
 * 4. Custom pages for sign-in and errors
 */
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: googleClientId || "",
      clientSecret: googleClientSecret || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Sign In Callback
     * 
     * Controls which users are allowed to sign in.
     * Validates email domains against the allowed domains list
     * from environment variables.
     */
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }): Promise<boolean> {
      if (!user.email) return false;
      
      // By default, only allow @teamodea.com emails
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS 
        ? process.env.ALLOWED_EMAIL_DOMAINS.split(",") 
        : ["teamodea.com"];
      
      // Allow all domains if the wildcard is set
      if (allowedDomains.includes("*")) {
        return true;
      }
      
      const emailDomain = user.email.split("@")[1];
      if (!allowedDomains.includes(emailDomain)) {
        return false;
      }
      
      return true;
    },
    
    /**
     * JWT Callback
     * 
     * Runs when a JWT is created or updated.
     * Stores the access and refresh tokens from Google in the JWT.
     */
    async jwt({ token, account }: { token: JWT; account: Account | null }): Promise<JWT> {
      // Save the access token and refresh token to the JWT token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at;
      }
      return token;
    },
    
    /**
     * Session Callback
     * 
     * Runs whenever a session is checked.
     * Makes the tokens available to the client-side session.
     */
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      // Add the access token to the session
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
        sameSite: "strict", // More restrictive than lax for better security
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        domain: process.env.NODE_ENV === 'production' ? ".teamodea.com" : undefined, // Domain for production
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
        sameSite: "strict",
        path: "/",
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
        sameSite: "strict",
        path: "/",
      }
    },
  },
  debug: false,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST }; 