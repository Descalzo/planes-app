import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JoinActivityDto } from './dto/join-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  findAll() {
    return this.activitiesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id/join')
  joinActivity(@Param('id') id: string, @Body() joinActivityDto: JoinActivityDto) {
    return this.activitiesService.joinActivity(id, joinActivityDto);
  }
}
