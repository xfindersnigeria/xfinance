import {
  Controller,
  Post,
  Delete,
  Body,
  Res,
  Get,
  UseGuards,
  Req,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from 'src/lib/req-user';
import { AuthService } from './auth.service';
import { encryptSession } from './utils/crypto.util';
import { createCookie, deleteCookie } from './utils/cookie.util';
import { AuthGuard } from './guards/auth.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { systemRole } from 'prisma/generated/enums';
import { LoginDto } from './dto/login.dto';
import { AuthContextDto } from './dto/context.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { user, tokenPayload } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    // Encrypt minimal payload (userId, groupId, entityId, systemRole) to keep token size small
    const token = await encryptSession(tokenPayload);
    // Only xf cookie needed - impersonation is now header-based
    res.setHeader('Set-Cookie', createCookie('xf', token, 60 * 60 * 24 * 7));
    // Send full user data to client
    return res.send(user);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  me(@User() user) {
    return user;
  }

  @Get('whoami')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get full user context and menu',
    description:
      'Returns user info, menu, permissions, subscription info. Called on page load. Results cached 5min.',
  })
  @ApiResponse({
    status: 200,
    description: 'User context with menu and permissions',
  })
  @ApiBearerAuth('jwt')
  @ApiCookieAuth('cookieAuth')
  async whoami(@User() user: any, @Req() req?: Request) {
    return this.authService.getWhoami(
      user.id,
      user.groupId,
      user.entityId,
      req,
    );
  }

  @Post('impersonate/group')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin)
  @ApiOperation({
    summary: 'Prepare to impersonate a group (superadmin only)',
    description:
      'Superadmin can impersonate any group. Use X-Impersonate-Group header in subsequent requests.',
  })
  async startGroup(@Body() { groupId, groupName }, @User() user: any) {
    // Validate: Only superadmin can impersonate groups
    if (user.systemRole !== systemRole.superadmin) {
      throw new UnauthorizedException('Only superadmin can impersonate groups');
    }

    // Return instruction for frontend
    return {
      success: true,
      message:
        'Use header X-Impersonate-Group with groupId in subsequent requests',
      groupId,
      groupName,
    };
  }

  @Delete('impersonate/group')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin)
  @ApiOperation({
    summary: 'Stop impersonating a group',
    description: 'Remove X-Impersonate-Group header from subsequent requests.',
  })
  stopGroup() {
    return {
      success: true,
      message: 'Remove X-Impersonate-Group header from subsequent requests',
    };
  }

  @Post('impersonate/entity')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin, systemRole.admin)
  @ApiOperation({
    summary: 'Prepare to impersonate an entity (superadmin and admin)',
    description:
      'Superadmin/admin can impersonate entities. Use X-Impersonate-Entity header in subsequent requests.',
  })
  async startEntity(@Body() { entityId, entityName }, @User() user: any) {
    // Validate: Only superadmin/admin can impersonate entities
    if (
      user.systemRole !== systemRole.superadmin &&
      user.systemRole !== systemRole.admin
    ) {
      throw new UnauthorizedException(
        'Only superadmin and admin can impersonate entities',
      );
    }

    // Return instruction for frontend
    return {
      success: true,
      message:
        'Use header X-Impersonate-Entity with entityId in subsequent requests',
      entityId,
      entityName,
    };
  }

  @Delete('impersonate/entity')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(systemRole.superadmin, systemRole.admin)
  @ApiOperation({
    summary: 'Stop impersonating an entity',
    description: 'Remove X-Impersonate-Entity header from subsequent requests.',
  })
  stopEntity() {
    return {
      success: true,
      message: 'Remove X-Impersonate-Entity header from subsequent requests',
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out' })
  logout(@Res() res: Response) {

    // Only delete xf cookie - impersonation headers are automatically cleared by client
    res.setHeader('Set-Cookie', deleteCookie('xf'));
    return res.send({ success: true });
  }
}
