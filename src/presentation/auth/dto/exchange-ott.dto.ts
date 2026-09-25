import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeOttDto {
    @ApiProperty({
        description: 'The one-time token (OTT) code received in the OAuth redirect URL. This is a short-lived signed JWT.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3NUb2tlbiI6Ii4uLiIsInJlZnJlc2hUb2tlbiI6Ii4uLiIsInVzZXIiOnsiaWQiOiIuLi4ifSwiX290dCI6dHJ1ZSwiaWF0IjoxNzI3MjczMjAwLCJleHAiOjE3MjcyNzMyNjB9.abc123signature',
    })
    @IsNotEmpty()
    @IsString()
    code: string;
}