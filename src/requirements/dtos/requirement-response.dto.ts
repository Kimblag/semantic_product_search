// requirement-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsString, IsUUID, IsDate, IsEmail, IsEnum } from 'class-validator';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';

export class RequirementResponseDto {
  @Expose()
  @ApiProperty({ description: 'Requirement ID' })
  @IsUUID()
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Requirement status',
    enum: RequirementStatus,
  })
  @IsEnum(RequirementStatus)
  status: string;

  @Expose()
  @ApiProperty({ description: 'Client ID' })
  @IsUUID()
  clientId: string;

  @Expose()
  @ApiProperty({ description: 'Client name' })
  @IsString()
  @Transform(
    ({
      obj,
    }: {
      obj: {
        user?: { name?: string; email?: string };
        client?: { name?: string };
      };
    }) => obj.client?.name,
  )
  clientName: string;

  @Expose()
  @ApiProperty({ description: 'User ID who submitted the requirement' })
  @IsUUID()
  userId: string;

  @Expose()
  @ApiProperty({ description: 'User name who submitted the requirement' })
  @IsString()
  @Transform(
    ({
      obj,
    }: {
      obj: {
        user?: { name?: string; email?: string };
        client?: { name?: string };
      };
    }) => obj.user?.name,
  )
  userName: string;

  @Expose()
  @ApiProperty({ description: 'User email who submitted the requirement' })
  @IsEmail()
  @Transform(
    ({
      obj,
    }: {
      obj: {
        user?: { name?: string; email?: string };
        client?: { name?: string };
      };
    }) => obj.user?.email,
  )
  userEmail: string;

  @Expose()
  @ApiProperty({
    description: 'Requirement creation date',
    type: String,
    format: 'date-time',
  })
  @IsDate()
  createdAt: Date;
}
