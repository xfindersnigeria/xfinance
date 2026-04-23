import { Module } from '@nestjs/common';
import { FileuploadService } from './fileupload.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [FileuploadService],
  exports: [FileuploadService],
})
export class FileuploadModule {}
