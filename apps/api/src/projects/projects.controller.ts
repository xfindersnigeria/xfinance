import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateMilestoneDto,
  CreateTeamMemberDto,
  GetEntityMilestonesDto,
  GetEntityProjectsDto,
  GetProjectTeamMembersDto,
  Projects,
  UpdateMilestoneDto,
  UpdateProjectDto,
  UpdateTeamMemberDto,
} from './dto/projects.dto';
import { getEffectiveEntityId, getEffectiveGroupId } from '@/auth/utils/context.util';
import { Request } from 'express';
import { AuthGuard } from '@/auth/guards/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('projects')
@UseGuards(AuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectService: ProjectsService) {}

  // ─── Project CRUD ──────────────────────────────────────────────────────────

  @Post()
  async create(@Body() project: Projects, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.projectService.createProject(project, entityId, groupId);
  }

  @Get()
  async getEntityProjects(@Req() req: Request, @Query() dto: GetEntityProjectsDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getEntityProjects(entityId, dto);
  }

  // ─── Static sub-routes (must be declared before :id to avoid shadowing) ───

  @Post('milestones')
  async createMilestone(@Body() dto: CreateMilestoneDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.projectService.createMilestone(dto, entityId, groupId);
  }

  @Get('milestones/entity')
  async getEntityMilestones(@Req() req: Request, @Query() dto: GetEntityMilestonesDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getEntityMilestones(entityId, dto);
  }

  @Patch('milestones/:milestoneId')
  async updateMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.updateMilestone(milestoneId, dto, entityId);
  }

  @Post('team-members')
  async createTeamMember(@Body() dto: CreateTeamMemberDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    const groupId = getEffectiveGroupId(req) as string;
    return this.projectService.createTeamMember(dto, entityId, groupId);
  }

  @Get('team-members')
  async getProjectTeamMembers(@Req() req: Request, @Query() dto: GetProjectTeamMembersDto) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectTeamMembers(entityId, dto);
  }

  @Patch('team-members/:memberId')
  async updateTeamMember(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @Req() req: Request,
  ) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.updateTeamMember(memberId, dto, entityId);
  }

  // ─── Project by ID ─────────────────────────────────────────────────────────

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectById(id, entityId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.updateProject(id, dto, entityId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.deleteProject(id, entityId);
  }

  // ─── Project sub-resources ─────────────────────────────────────────────────

  @Get(':id/income')
  async getIncome(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectIncome(id, entityId);
  }

  @Get(':id/expenses')
  async getExpenses(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectExpenses(id, entityId);
  }

  @Get(':id/team')
  async getTeam(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectTeam(id, entityId);
  }

  @Get(':id/milestones')
  async getMilestones(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectMilestones(id, entityId);
  }

  @Get(':id/supplies')
  async getSupplies(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectSupplies(id, entityId);
  }

  @Get(':id/overview')
  async getOverview(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectOverview(id, entityId);
  }

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: Request) {
    const entityId = getEffectiveEntityId(req);
    if (!entityId) throw new BadRequestException('Entity ID is required');
    return this.projectService.getProjectAnalysis(id, entityId);
  }
}
