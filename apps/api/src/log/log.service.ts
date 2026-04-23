// import { PrismaService } from '@/prisma/prisma.service';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class LogService {
//   constructor(private prisma: PrismaService) {}
//   async log({
//     userId,
//     action,
//     req, // pass Express Request object
//   }: {
//     userId: string;
//     action: string;
//     req: any; // Request from express (or Fastify if you use it)
//   }) {
//     // ────────────────────────────────────────────────
//     // Extract real client IP (handles proxies/load balancers)
//     // Priority: x-forwarded-for → real-ip → socket remote → fallback
//     // ────────────────────────────────────────────────
//     let ipAddress: string | null = null;

//     const xff = req.headers['x-forwarded-for'];
//     if (xff) {
//       // Most common: first non-internal IP in chain
//       const ips = Array.isArray(xff) ? xff[0] : xff;
//       ipAddress = ips.split(',')[0].trim() || null;
//     }

//     if (!ipAddress) {
//       ipAddress =
//         req.headers['x-real-ip'] ||
//         req.ip ||
//         req.connection?.remoteAddress ||
//         req.socket?.remoteAddress ||
//         null;
//     }

//     // Clean up localhost / IPv6 loopback
//     if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
//       ipAddress = 'localhost';
//     }

//     const userAgent = (req.headers['user-agent'] as string) || null;

//     // Get groupId and entityId from request context if available
//     const groupId = (req as any).user?.groupId || (req as any).tenantId;
//     const entityId = (req as any).user?.entityId;

//     // Optional: you could add geo lookup here later (ipapi.co, MaxMind, ...)
//     // const location = await this.geoService.getLocationFromIp(ipAddress);

//     return this.prisma.auditLog.create({
//       data: {
//         userId,
//         groupId: groupId || 'system',  // Fallback to 'system' if no group context
//         entityId: entityId || 'system',  // Fallback to 'system' if no entity context
//         module: 'system',  // Default module, can be overridden by caller
//         action,
//         resourceType: 'audit',  // Default resource type
//         resourceId: 'generic',  // Default resource id
//         ipAddress: ipAddress || 'unknown',
//         userAgent: userAgent || 'unknown',
//         changes: [],  // Empty by default, would be populated by specific loggers
//       },
//     });
//   }

//   // Fire-and-forget version (non-blocking)
//   async logAsync(params: Parameters<LogService['log']>[0]) {
//     this.log(params).catch((err) => {
//       console.error('Audit log failed:', err);
//       // you could send to Sentry / your error service here
//     });
//   }
// }


import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LogService {
  constructor(private prisma: PrismaService) {}

}