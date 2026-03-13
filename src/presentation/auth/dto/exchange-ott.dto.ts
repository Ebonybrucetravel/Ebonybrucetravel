import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ExchangeOttDto {
    @ApiProperty({
        description: 'The one-time token code received in the OAuth redirect URL',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsNotEmpty()
    @IsString()
    @IsUUID()
    code: string;
}
